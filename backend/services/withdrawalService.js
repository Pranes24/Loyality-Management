// Business logic for user wallet withdrawals
const pool = require('../db/pool')

/**
 * Returns user wallet balance + recent transactions by mobile
 * @param {string} mobile
 * @returns {Promise<{user: Object, transactions: Array}>}
 */
async function getUserWallet(mobile) {
  const userRes = await pool.query('SELECT * FROM users WHERE mobile = $1', [mobile])
  if (!userRes.rows.length) throw Object.assign(new Error('User not found'), { status: 404 })
  const user = userRes.rows[0]

  const txns = await pool.query(`
    SELECT * FROM user_wallet_transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [user.id])

  const pending = await pool.query(`
    SELECT * FROM wallet_withdrawals
    WHERE user_id = $1 AND status = 'pending'
    LIMIT 1
  `, [user.id])

  return {
    user: {
      id:             user.id,
      name:           user.name,
      mobile:         user.mobile,
      wallet_balance: parseFloat(user.wallet_balance || 0),
      total_scans:    parseInt(user.total_scans   || 0),
      total_earned:   parseFloat(user.total_earned || 0),
      total_redeemed: parseInt(user.total_redeemed || 0),
    },
    transactions:      txns.rows,
    pendingWithdrawal: pending.rows[0] || null,
  }
}

/**
 * Submits a withdrawal request — holds the amount (deducts balance)
 * @param {string} userId
 * @param {number} amount
 * @param {string} upiId
 * @returns {Promise<Object>} withdrawal record
 */
async function requestWithdrawal(userId, amount, upiId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check for existing pending withdrawal
    const existing = await client.query(
      'SELECT id FROM wallet_withdrawals WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    )
    if (existing.rows.length) throw new Error('You already have a pending withdrawal request')

    // Check balance
    const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [userId])
    if (!userRes.rows.length) throw Object.assign(new Error('User not found'), { status: 404 })
    const balance = parseFloat(userRes.rows[0].wallet_balance)
    if (balance < amount) throw new Error(`Insufficient balance. Available: ₹${balance.toFixed(2)}`)
    if (amount < 20)      throw new Error('Minimum withdrawal amount is ₹20')

    // Hold amount — deduct from balance immediately
    await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
      [amount, userId]
    )

    const res = await client.query(`
      INSERT INTO wallet_withdrawals (user_id, amount, upi_id)
      VALUES ($1, $2, $3) RETURNING *
    `, [userId, amount, upiId])

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
 * Returns all withdrawal requests (super admin) with pagination
 * @param {Object} filters - { status, page, limit }
 * @returns {Promise<{withdrawals: Array, total: number}>}
 */
async function getAllWithdrawals({ status, page = 1, limit = 20 } = {}) {
  const conditions = []
  const params     = []
  let idx = 1

  if (status) { conditions.push(`w.status = $${idx++}`); params.push(status) }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT w.*, u.name AS user_name, u.mobile AS user_mobile
      FROM wallet_withdrawals w
      JOIN users u ON w.user_id = u.id
      ${where}
      ORDER BY w.requested_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM wallet_withdrawals w ${where}`, params),
  ])

  return { withdrawals: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Approves or rejects a withdrawal — restores balance on rejection
 * @param {string} withdrawalId
 * @param {'approved'|'rejected'} status
 * @param {string} note
 * @returns {Promise<Object>} updated withdrawal
 */
async function processWithdrawal(withdrawalId, status, note = '') {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const res = await client.query(
      'SELECT * FROM wallet_withdrawals WHERE id = $1 AND status = $2 FOR UPDATE',
      [withdrawalId, 'pending']
    )
    if (!res.rows.length) throw Object.assign(new Error('Withdrawal not found or already processed'), { status: 404 })

    const withdrawal = res.rows[0]

    // On rejection — restore balance to user
    if (status === 'rejected') {
      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [withdrawal.amount, withdrawal.user_id]
      )
    }

    // On approval — log the outgoing transaction
    if (status === 'approved') {
      await client.query(`
        INSERT INTO user_wallet_transactions (user_id, type, amount, note)
        VALUES ($1, 'debit', $2, 'Withdrawal approved')
      `, [withdrawal.user_id, withdrawal.amount])
    }

    const updated = await client.query(`
      UPDATE wallet_withdrawals
      SET status = $1, note = $2, processed_at = NOW()
      WHERE id = $3 RETURNING *
    `, [status, note, withdrawalId])

    await client.query('COMMIT')
    return updated.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { getUserWallet, requestWithdrawal, getAllWithdrawals, processWithdrawal }
