// Business logic for authentication and org registration
const bcrypt = require('bcryptjs')
const pool   = require('../db/pool')
const { signToken } = require('../lib/jwt')

/**
 * Authenticates an admin_user with email + password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: Object }>}
 */
async function login(email, password) {
  const res = await pool.query(`
    SELECT au.*, o.name AS org_name, o.org_code
    FROM admin_users au
    LEFT JOIN organizations o ON au.org_id = o.id
    WHERE au.email = $1
  `, [email.toLowerCase().trim()])

  if (!res.rows.length) throw Object.assign(new Error('Invalid email or password'), { status: 401 })

  const user = res.rows[0]
  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) throw Object.assign(new Error('Invalid email or password'), { status: 401 })

  const token = signToken({
    id:    user.id,
    email: user.email,
    role:  user.role,
    orgId: user.org_id || null,
  })

  return {
    token,
    user: {
      id:      user.id,
      email:   user.email,
      name:    user.name,
      role:    user.role,
      orgId:   user.org_id,
      orgName: user.org_name,
      orgCode: user.org_code,
    },
  }
}

/**
 * Self-registers a new organization with an org_admin account
 * @param {{ orgName: string, orgCode: string, adminName: string, email: string, password: string }} data
 * @returns {Promise<{ token: string, user: Object }>}
 */
async function registerOrg({ orgName, orgCode, adminName, email, password }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check org_code uniqueness
    const codeCheck = await client.query(
      'SELECT id FROM organizations WHERE org_code = $1', [orgCode.toUpperCase()]
    )
    if (codeCheck.rows.length) throw Object.assign(new Error('Org code already taken'), { status: 409 })

    // Check email uniqueness
    const emailCheck = await client.query(
      'SELECT id FROM admin_users WHERE email = $1', [email.toLowerCase()]
    )
    if (emailCheck.rows.length) throw Object.assign(new Error('Email already registered'), { status: 409 })

    // Create org
    const orgRes = await client.query(`
      INSERT INTO organizations (name, org_code) VALUES ($1, $2) RETURNING *
    `, [orgName.trim(), orgCode.toUpperCase()])
    const org = orgRes.rows[0]

    // Create org wallet
    await client.query(
      'INSERT INTO org_wallets (org_id) VALUES ($1)', [org.id]
    )

    // Create org_admin user
    const hash    = await bcrypt.hash(password, 10)
    const userRes = await client.query(`
      INSERT INTO admin_users (org_id, email, password_hash, role, name)
      VALUES ($1, $2, $3, 'org_admin', $4) RETURNING *
    `, [org.id, email.toLowerCase(), hash, adminName.trim()])
    const user = userRes.rows[0]

    await client.query('COMMIT')

    const token = signToken({ id: user.id, email: user.email, role: 'org_admin', orgId: org.id })
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: 'org_admin', orgId: org.id, orgName: org.name, orgCode: org.org_code },
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { login, registerOrg }
