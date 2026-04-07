// Business logic for user management, profiles, and wallet withdrawals
const pool = require('../db/pool')

/**
 * Returns paginated user list with search and sort
 * @param {Object} opts - { search, sortBy, page, limit, dateFrom, dateTo }
 * @returns {Promise<{users: Array, total: number}>}
 */
async function getUsers({ search, sortBy = 'registered_at', page = 1, limit = 20, dateFrom, dateTo } = {}) {
  const allowed = ['registered_at', 'last_scan_at', 'total_earned', 'total_scans', 'wallet_balance']
  const orderBy = allowed.includes(sortBy) ? sortBy : 'registered_at'

  const conditions = []
  const params = []
  let idx = 1

  if (search) {
    conditions.push(`(mobile ILIKE $${idx} OR name ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }
  if (dateFrom) { conditions.push(`registered_at >= $${idx++}`); params.push(dateFrom) }
  if (dateTo)   { conditions.push(`registered_at <= $${idx++}`); params.push(dateTo) }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT id, mobile, name, wallet_balance, total_scans, total_redeemed,
             total_wallet_credits, total_pending, total_earned, registered_at, last_scan_at
      FROM users ${where}
      ORDER BY ${orderBy} DESC NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM users ${where}`, params),
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
 * Returns full scan history for a user
 * @param {string} userId
 * @param {Object} opts - { page, limit }
 * @returns {Promise<{history: Array, total: number}>}
 */
async function getScanHistory(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit
  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT sh.*, q.amount AS qr_amount
      FROM scan_history sh
      LEFT JOIN qr_codes q ON sh.qr_id = q.id
      WHERE sh.user_id = $1
      ORDER BY sh.scanned_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]),
    pool.query('SELECT COUNT(*) FROM scan_history WHERE user_id = $1', [userId]),
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

  const txnRes = await pool.query(`
    SELECT * FROM user_wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
  `, [user.id])

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

    const userRes = await client.query(
      'SELECT * FROM users WHERE mobile = $1 FOR UPDATE', [mobile]
    )
    if (!userRes.rows.length) throw new Error('User not found')

    const user    = userRes.rows[0]
    const balance = parseFloat(user.wallet_balance)

    if (amount < 1)       throw new Error('Minimum withdrawal is ₹1')
    if (amount > balance) throw new Error(`Insufficient wallet balance. Available: ₹${balance}`)

    const txnId = `WTXN${Date.now()}`

    const updatedRes = await client.query(`
      UPDATE users
      SET wallet_balance   = wallet_balance - $1,
          total_wallet_out = total_wallet_out + $1
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
 * Returns top users ranked by total_earned or total_scans
 * @param {'total_earned'|'total_scans'} rankBy
 * @returns {Promise<Array>}
 */
async function getTopUsers(rankBy = 'total_earned') {
  const col = rankBy === 'total_scans' ? 'total_scans' : 'total_earned'
  const res = await pool.query(`
    SELECT id, mobile, name, total_scans, total_redeemed, total_earned, wallet_balance
    FROM users ORDER BY ${col} DESC NULLS LAST LIMIT 20
  `)
  return res.rows
}

module.exports = { getUsers, getUserById, getScanHistory, getUserWallet, withdrawFromWallet, getTopUsers }
