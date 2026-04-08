// Business logic for super admin — org management and platform stats
const bcrypt = require('bcryptjs')
const pool   = require('../db/pool')

/**
 * Returns all organizations with wallet balance and batch counts
 * @param {{ page?: number, limit?: number, search?: string }} opts
 * @returns {Promise<{ orgs: Array, total: number }>}
 */
async function getOrgs({ page = 1, limit = 20, search } = {}) {
  const conditions = []
  const params     = []
  let idx = 1

  if (search) {
    conditions.push(`(o.name ILIKE $${idx} OR o.org_code ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT o.*,
        ow.balance,
        ow.total_funded,
        ow.total_debited,
        COUNT(DISTINCT b.id) FILTER (WHERE b.status != 'draft') AS active_batches,
        COUNT(DISTINCT au.id) AS admin_count
      FROM organizations o
      LEFT JOIN org_wallets ow ON ow.org_id = o.id
      LEFT JOIN batches b ON b.org_id = o.id
      LEFT JOIN admin_users au ON au.org_id = o.id
      ${where}
      GROUP BY o.id, ow.balance, ow.total_funded, ow.total_debited
      ORDER BY o.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM organizations o ${where}`, params),
  ])

  return { orgs: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Returns a single org with full details
 * @param {string} orgId
 * @returns {Promise<Object|null>}
 */
async function getOrgById(orgId) {
  const [orgRes, adminsRes] = await Promise.all([
    pool.query(`
      SELECT o.*, ow.balance, ow.total_funded, ow.total_debited
      FROM organizations o
      LEFT JOIN org_wallets ow ON ow.org_id = o.id
      WHERE o.id = $1
    `, [orgId]),
    pool.query(`
      SELECT id, email, name, role, created_at FROM admin_users WHERE org_id = $1
    `, [orgId]),
  ])

  if (!orgRes.rows.length) return null
  return { ...orgRes.rows[0], admins: adminsRes.rows }
}

/**
 * Creates a new org + org_admin account (super admin action)
 * @param {{ orgName, orgCode, adminName, adminEmail, adminPassword }} data
 * @returns {Promise<Object>}
 */
async function createOrg({ orgName, orgCode, adminName, adminEmail, adminPassword }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const codeCheck = await client.query(
      'SELECT id FROM organizations WHERE org_code = $1', [orgCode.toUpperCase()]
    )
    if (codeCheck.rows.length) throw Object.assign(new Error('Org code already taken'), { status: 409 })

    const emailCheck = await client.query(
      'SELECT id FROM admin_users WHERE email = $1', [adminEmail.toLowerCase()]
    )
    if (emailCheck.rows.length) throw Object.assign(new Error('Email already registered'), { status: 409 })

    const orgRes = await client.query(`
      INSERT INTO organizations (name, org_code) VALUES ($1, $2) RETURNING *
    `, [orgName.trim(), orgCode.toUpperCase()])
    const org = orgRes.rows[0]

    await client.query('INSERT INTO org_wallets (org_id) VALUES ($1)', [org.id])

    const hash    = await bcrypt.hash(adminPassword, 10)
    const userRes = await client.query(`
      INSERT INTO admin_users (org_id, email, password_hash, role, name)
      VALUES ($1, $2, $3, 'org_admin', $4) RETURNING id, email, name, role
    `, [org.id, adminEmail.toLowerCase(), hash, adminName.trim()])

    await client.query('COMMIT')
    return { org, admin: userRes.rows[0] }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Updates org status (active / suspended)
 * @param {string} orgId
 * @param {'active'|'suspended'} status
 * @returns {Promise<Object>}
 */
async function updateOrgStatus(orgId, status) {
  const res = await pool.query(
    'UPDATE organizations SET status = $1 WHERE id = $2 RETURNING *', [status, orgId]
  )
  if (!res.rows.length) throw Object.assign(new Error('Organization not found'), { status: 404 })
  return res.rows[0]
}

/**
 * Tops up an org's wallet balance
 * @param {string} orgId
 * @param {number} amount
 * @param {string} note
 * @returns {Promise<Object>} updated wallet
 */
async function topupOrgWallet(orgId, amount, note = 'Super admin top-up') {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const res = await client.query(`
      UPDATE org_wallets
      SET balance = balance + $1, total_funded = total_funded + $1, updated_at = NOW()
      WHERE org_id = $2 RETURNING *
    `, [amount, orgId])
    if (!res.rows.length) throw Object.assign(new Error('Org wallet not found'), { status: 404 })

    await client.query(`
      INSERT INTO wallet_transactions (type, amount, note, org_id)
      VALUES ('credit', $1, $2, $3)
    `, [amount, note, orgId])

    await client.query('COMMIT')
    return res.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Platform-wide summary stats for super admin dashboard
 * @returns {Promise<Object>}
 */
async function getPlatformStats() {
  const [orgsRes, batchRes, userRes, redeemRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        COALESCE(SUM(ow.balance), 0) AS total_wallet_balance
      FROM organizations o
      LEFT JOIN org_wallets ow ON ow.org_id = o.id
    `),
    pool.query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'funded') AS funded FROM batches
    `),
    pool.query('SELECT COUNT(*) AS total FROM users'),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE action = 'redeemed') AS redeemed,
        COALESCE(SUM(amount), 0) AS total_paid_out
      FROM scan_history
    `),
  ])

  return {
    orgs:    orgsRes.rows[0],
    batches: batchRes.rows[0],
    users:   userRes.rows[0],
    redeem:  redeemRes.rows[0],
  }
}

module.exports = { getOrgs, getOrgById, createOrg, updateOrgStatus, topupOrgWallet, getPlatformStats }
