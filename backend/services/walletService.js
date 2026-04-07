// Business logic for admin wallet — balance, top-up, transaction history
const pool = require('../db/pool')

/**
 * Returns the admin wallet balance and summary
 * @returns {Promise<Object>}
 */
async function getAdminWallet() {
  const res = await pool.query('SELECT * FROM admin_wallet WHERE id = 1')
  return res.rows[0]
}

/**
 * Adds funds to the admin wallet
 * @param {number} amount
 * @param {string} note
 * @returns {Promise<Object>} updated wallet
 */
async function topupWallet(amount, note = 'Manual top-up') {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updated = await client.query(`
      UPDATE admin_wallet
      SET balance = balance + $1, total_funded = total_funded + $1, updated_at = NOW()
      WHERE id = 1 RETURNING *
    `, [amount])

    await client.query(`
      INSERT INTO wallet_transactions (type, amount, note)
      VALUES ('credit', $1, $2)
    `, [amount, note])

    await client.query('COMMIT')
    return updated.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Returns admin wallet transaction history with filters
 * @param {Object} filters - { type, dateFrom, dateTo, page, limit }
 * @returns {Promise<{transactions: Array, total: number}>}
 */
async function getWalletTransactions({ type, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
  const conditions = []
  const params = []
  let idx = 1

  if (type)     { conditions.push(`type = $${idx++}`);        params.push(type) }
  if (dateFrom) { conditions.push(`created_at >= $${idx++}`); params.push(dateFrom) }
  if (dateTo)   { conditions.push(`created_at <= $${idx++}`); params.push(dateTo) }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * limit

  const [dataRes, countRes, sumRes] = await Promise.all([
    pool.query(`
      SELECT wt.*, b.batch_code, b.product_name
      FROM wallet_transactions wt
      LEFT JOIN batches b ON wt.batch_id = b.id
      ${where}
      ORDER BY wt.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM wallet_transactions ${where}`, params),
    pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0)  AS total_credits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'debit'),  0)  AS total_debits
      FROM wallet_transactions ${where}
    `, params),
  ])

  return {
    transactions: dataRes.rows,
    total:        parseInt(countRes.rows[0].count),
    summary:      sumRes.rows[0],
  }
}

/**
 * Debits the admin wallet — called atomically from redeemService
 * Expects an active pg client (part of a larger transaction)
 * @param {import('pg').PoolClient} client
 * @param {number} amount
 * @param {string} qrId
 * @param {string} batchId
 */
async function debitAdminWallet(client, amount, qrId, batchId) {
  const walletRes = await client.query('SELECT balance FROM admin_wallet WHERE id = 1 FOR UPDATE')
  const balance = parseFloat(walletRes.rows[0].balance)

  if (balance < amount) throw new Error('Insufficient wallet balance')

  await client.query(`
    UPDATE admin_wallet
    SET balance = balance - $1, total_debited = total_debited + $1, updated_at = NOW()
    WHERE id = 1
  `, [amount])

  await client.query(`
    INSERT INTO wallet_transactions (type, amount, qr_id, batch_id, note)
    VALUES ('debit', $1, $2, $3, 'QR scan debit')
  `, [amount, qrId, batchId])
}

module.exports = { getAdminWallet, topupWallet, getWalletTransactions, debitAdminWallet }
