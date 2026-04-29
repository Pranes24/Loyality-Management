// Business logic for user management, profiles, and wallet withdrawals
const pool = require('../db/pool')

/**
 * Returns paginated list of users who have scanned in the org
 * @param {string} orgId
 * @param {Object} opts - { search, sortBy, page, limit, dateFrom, dateTo }
 * @returns {Promise<{users: Array, total: number}>}
 */
async function getUsers(orgId, { search, sortBy = 'registered_at', page = 1, limit = 20, dateFrom, dateTo } = {}) {
  const allowed = ['registered_at', 'last_scan_at', 'total_earned', 'total_scans', 'wallet_balance']
  const orderBy = allowed.includes(sortBy) ? sortBy : 'registered_at'

  const conditions = [`EXISTS (
    SELECT 1 FROM scan_history sh
    JOIN batches b ON sh.batch_id = b.id
    WHERE sh.user_id = u.id AND b.org_id = $1
  )`]
  const params = [orgId]
  let idx = 2

  if (search) {
    conditions.push(`(u.mobile ILIKE $${idx} OR u.name ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }
  if (dateFrom) { conditions.push(`u.registered_at >= $${idx++}`); params.push(dateFrom) }
  if (dateTo)   { conditions.push(`u.registered_at <= $${idx++}`); params.push(dateTo) }

  const where  = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT u.id, u.mobile, u.name, u.wallet_balance, u.total_scans, u.total_redeemed,
             u.total_wallet_credits, u.total_pending, u.total_earned, u.registered_at, u.last_scan_at
      FROM users u ${where}
      ORDER BY u.${orderBy} DESC NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM users u ${where}`, params),
  ])

  return { users: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Returns full profile for a single user by ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getUserById(userId) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  return res.rows[0] || null
}

/**
 * Returns scan history for a user (optionally scoped to org's batches)
 * @param {string} userId
 * @param {string} orgId
 * @param {Object} opts - { page, limit }
 * @returns {Promise<{history: Array, total: number}>}
 */
async function getScanHistory(userId, orgId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit
  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT sh.*, q.amount AS qr_amount, q.qr_number
      FROM scan_history sh
      LEFT JOIN qr_codes q ON sh.qr_id = q.id
      JOIN batches b ON sh.batch_id = b.id
      WHERE sh.user_id = $1 AND b.org_id = $2
      ORDER BY sh.scanned_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, orgId, limit, offset]),
    pool.query(`
      SELECT COUNT(*) FROM scan_history sh
      JOIN batches b ON sh.batch_id = b.id
      WHERE sh.user_id = $1 AND b.org_id = $2
    `, [userId, orgId]),
  ])
  return { history: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Returns wallet balance and transaction history for a user (by mobile)
 * @param {string} mobile
 * @returns {Promise<Object>}
 */
async function getUserWallet(mobile) {
  const userRes = await pool.query(
    'SELECT id, mobile, name, wallet_balance, total_wallet_in, total_wallet_out FROM users WHERE mobile = $1',
    [mobile]
  )
  if (!userRes.rows.length) throw new Error('User not found')
  const user = userRes.rows[0]

  const txnRes = await pool.query(
    'SELECT * FROM user_wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [user.id]
  )
  return { ...user, transactions: txnRes.rows }
}

/**
 * Withdraws amount from user wallet to UPI
 * @param {string} mobile
 * @param {string} upiId
 * @param {number} amount
 * @returns {Promise<{txnId: string, newBalance: number}>}
 */
async function withdrawFromWallet(mobile, upiId, amount) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const userRes = await client.query('SELECT * FROM users WHERE mobile = $1 FOR UPDATE', [mobile])
    if (!userRes.rows.length) throw new Error('User not found')

    const user    = userRes.rows[0]
    const balance = parseFloat(user.wallet_balance)

    if (amount < 1)       throw new Error('Minimum withdrawal is ₹1')
    if (amount > balance) throw new Error(`Insufficient wallet balance. Available: ₹${balance}`)

    const txnId = `WTXN${Date.now()}`

    const updatedRes = await client.query(`
      UPDATE users
      SET wallet_balance = wallet_balance - $1, total_wallet_out = total_wallet_out + $1
      WHERE id = $2 RETURNING wallet_balance
    `, [amount, user.id])

    await client.query(`
      INSERT INTO user_wallet_transactions (user_id, type, amount, upi_id, txn_id, note)
      VALUES ($1, 'withdrawal', $2, $3, $4, 'Wallet withdrawal')
    `, [user.id, amount, upiId, txnId])

    await client.query('COMMIT')
    return { txnId, newBalance: parseFloat(updatedRes.rows[0].wallet_balance) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Returns top users ranked by total_earned or total_scans (org-scoped)
 * @param {string} orgId
 * @param {'total_earned'|'total_scans'} rankBy
 * @returns {Promise<Array>}
 */
async function getTopUsers(orgId, rankBy = 'total_earned') {
  const col = rankBy === 'total_scans' ? 'total_scans' : 'total_earned'
  const res = await pool.query(`
    SELECT u.id, u.mobile, u.name, u.total_scans, u.total_redeemed, u.total_earned, u.wallet_balance
    FROM users u
    WHERE EXISTS (
      SELECT 1 FROM scan_history sh
      JOIN batches b ON sh.batch_id = b.id
      WHERE sh.user_id = u.id AND b.org_id = $1
    )
    ORDER BY u.${col} DESC NULLS LAST LIMIT 20
  `, [orgId])
  return res.rows
}

module.exports = { getUsers, getUserById, getScanHistory, getUserWallet, withdrawFromWallet, getTopUsers }
