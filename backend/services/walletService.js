// Business logic for org wallet — balance, top-up, transaction history
const pool = require('../db/pool')

/**
 * Returns the org wallet balance
 * @param {string} orgId
 * @returns {Promise<Object>}
 */
async function getAdminWallet(orgId) {
  const res = await pool.query('SELECT * FROM org_wallets WHERE org_id = $1', [orgId])
  return res.rows[0] || { org_id: orgId, balance: 0, total_funded: 0, total_debited: 0 }
}

/**
 * Adds funds to the org wallet
 * @param {string} orgId
 * @param {number} amount
 * @param {string} note
 * @returns {Promise<Object>} updated wallet
 */
async function topupWallet(orgId, amount, note = 'Manual top-up') {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updated = await client.query(`
      UPDATE org_wallets
      SET balance = balance + $1, total_funded = total_funded + $1, updated_at = NOW()
      WHERE org_id = $2 RETURNING *
    `, [amount, orgId])
    if (!updated.rows.length) throw new Error('Org wallet not found')

    await client.query(`
      INSERT INTO wallet_transactions (type, amount, note, org_id)
      VALUES ('credit', $1, $2, $3)
    `, [amount, note, orgId])

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
 * Returns org wallet transaction history with filters
 * @param {string} orgId
 * @param {Object} filters - { type, dateFrom, dateTo, page, limit }
 * @returns {Promise<{transactions: Array, total: number}>}
 */
async function getWalletTransactions(orgId, { type, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
  const conditions = ['wt.org_id = $1']
  const params     = [orgId]
  let idx = 2

  if (type)     { conditions.push(`wt.type = $${idx++}`);        params.push(type) }
  if (dateFrom) { conditions.push(`wt.created_at >= $${idx++}`); params.push(dateFrom) }
  if (dateTo)   { conditions.push(`wt.created_at <= $${idx++}`); params.push(dateTo) }

  const where  = `WHERE ${conditions.join(' AND ')}`
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
    pool.query(`SELECT COUNT(*) FROM wallet_transactions wt ${where}`, params),
    pool.query(`
      SELECT
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'credit'), 0) AS total_credits,
        COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'debit'),  0) AS total_debits
      FROM wallet_transactions wt ${where}
    `, params),
  ])

  return {
    transactions: dataRes.rows,
    total:        parseInt(countRes.rows[0].count),
    summary:      sumRes.rows[0],
  }
}

/**
 * Debits the org wallet atomically — called from redeemService inside a transaction
 * @param {import('pg').PoolClient} client
 * @param {string} orgId
 * @param {number} amount
 * @param {string} qrId
 * @param {string} batchId
 */
async function debitAdminWallet(client, orgId, amount, qrId, batchId) {
  const walletRes = await client.query(
    'SELECT balance FROM org_wallets WHERE org_id = $1 FOR UPDATE', [orgId]
  )
  if (!walletRes.rows.length) throw new Error('Org wallet not found')
  const balance = parseFloat(walletRes.rows[0].balance)
  if (balance < amount) throw new Error('Insufficient wallet balance')

  await client.query(`
    UPDATE org_wallets
    SET balance = balance - $1, total_debited = total_debited + $1, updated_at = NOW()
    WHERE org_id = $2
  `, [amount, orgId])

  await client.query(`
    INSERT INTO wallet_transactions (type, amount, qr_id, batch_id, note, org_id)
    VALUES ('debit', $1, $2, $3, 'QR scan debit', $4)
  `, [amount, qrId, batchId, orgId])
}

module.exports = { getAdminWallet, topupWallet, getWalletTransactions, debitAdminWallet }
