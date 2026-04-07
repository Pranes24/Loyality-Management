// Business logic for admin dashboard stats and reports
const pool = require('../db/pool')

/**
 * Returns overall summary stats for the dashboard
 * @returns {Promise<Object>}
 */
async function getSummary() {
  const [batchRes, qrRes, userRes, walletRes, redeemRes] = await Promise.all([
    pool.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = $1) AS funded FROM batches', ['funded']),
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'redeemed')        AS redeemed,
        COUNT(*) FILTER (WHERE status = 'wallet_credited') AS wallet_credited,
        COUNT(*) FILTER (WHERE status = 'pending_reason')  AS pending,
        COUNT(*) FILTER (WHERE status NOT IN ('generated','funded','expired')) AS scanned
      FROM qr_codes
    `),
    pool.query('SELECT COUNT(*) AS total FROM users'),
    pool.query('SELECT balance, total_funded, total_debited FROM admin_wallet WHERE id = 1'),
    pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM scan_history WHERE action = $1', ['redeemed']),
  ])

  const qr      = qrRes.rows[0]
  const scanned = parseInt(qr.scanned) || 0
  const redeemed = parseInt(qr.redeemed) + parseInt(qr.wallet_credited)
  const redemptionRate = scanned > 0 ? Math.round((redeemed / scanned) * 100) : 0

  return {
    batches:         { total: parseInt(batchRes.rows[0].total), funded: parseInt(batchRes.rows[0].funded) },
    qrCodes:         { total: parseInt(qr.total), scanned, redeemed: parseInt(qr.redeemed), walletCredited: parseInt(qr.wallet_credited), pending: parseInt(qr.pending) },
    users:           { total: parseInt(userRes.rows[0].total) },
    wallet:          walletRes.rows[0],
    totalPaidOut:    parseFloat(redeemRes.rows[0].total),
    redemptionRate,
  }
}

/**
 * Returns the last 10 redemption activities for the dashboard feed
 * @returns {Promise<Array>}
 */
async function getRecentActivity() {
  const res = await pool.query(`
    SELECT sh.*, u.name AS user_name, u.mobile AS user_mobile
    FROM scan_history sh
    LEFT JOIN users u ON sh.user_id = u.id
    ORDER BY sh.scanned_at DESC
    LIMIT 10
  `)
  return res.rows
}

/**
 * Returns spending breakdown grouped by product name
 * @returns {Promise<Array>}
 */
async function getByProduct() {
  const res = await pool.query(`
    SELECT
      b.product_name,
      COUNT(DISTINCT b.id)                                         AS total_batches,
      COUNT(q.id)                                                   AS total_qrs,
      COALESCE(SUM(b.total_amount), 0)                             AS total_funded,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'redeemed'), 0)         AS total_redeemed,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'wallet_credited'), 0)  AS total_wallet_credited,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'pending_reason'), 0)   AS total_pending,
      COUNT(DISTINCT q.user_mobile)                                AS unique_users
    FROM batches b
    LEFT JOIN qr_codes q ON q.batch_id = b.id
    WHERE b.status != 'draft'
    GROUP BY b.product_name
    ORDER BY total_funded DESC
  `)
  return res.rows
}

module.exports = { getSummary, getRecentActivity, getByProduct }
