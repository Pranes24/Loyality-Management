// Business logic for dashboard stats and reports (org-scoped)
const pool = require('../db/pool')

/**
 * Returns overall summary stats for the org dashboard
 * @param {string} orgId
 * @returns {Promise<Object>}
 */
async function getSummary(orgId) {
  const [batchRes, qrRes, userRes, walletRes, redeemRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'funded') AS funded
       FROM batches WHERE org_id = $1`, [orgId]
    ),
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE q.status = 'redeemed')        AS redeemed,
        COUNT(*) FILTER (WHERE q.status = 'wallet_credited') AS wallet_credited,
        COUNT(*) FILTER (WHERE q.status = 'pending_reason')  AS pending,
        COUNT(*) FILTER (WHERE q.status NOT IN ('generated','funded','expired')) AS scanned
      FROM qr_codes q
      JOIN batches b ON q.batch_id = b.id
      WHERE b.org_id = $1
    `, [orgId]),
    pool.query(`
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM scan_history sh
        JOIN batches b ON sh.batch_id = b.id
        WHERE sh.user_id = u.id AND b.org_id = $1
      )
    `, [orgId]),
    pool.query('SELECT balance, total_funded, total_debited FROM org_wallets WHERE org_id = $1', [orgId]),
    pool.query(`
      SELECT COALESCE(SUM(sh.amount), 0) AS total
      FROM scan_history sh
      JOIN batches b ON sh.batch_id = b.id
      WHERE sh.action = 'redeemed' AND b.org_id = $1
    `, [orgId]),
  ])

  const qr             = qrRes.rows[0]
  const scanned        = parseInt(qr.scanned) || 0
  const redeemed       = parseInt(qr.redeemed) + parseInt(qr.wallet_credited)
  const redemptionRate = scanned > 0 ? Math.round((redeemed / scanned) * 100) : 0

  return {
    batches:      { total: parseInt(batchRes.rows[0].total), funded: parseInt(batchRes.rows[0].funded) },
    qrCodes:      { total: parseInt(qr.total), scanned, redeemed: parseInt(qr.redeemed), walletCredited: parseInt(qr.wallet_credited), pending: parseInt(qr.pending) },
    users:        { total: parseInt(userRes.rows[0].total) },
    wallet:       walletRes.rows[0] || { balance: 0, total_funded: 0, total_debited: 0 },
    totalPaidOut: parseFloat(redeemRes.rows[0].total),
    redemptionRate,
  }
}

/**
 * Returns the last 10 redemption activities for the org dashboard feed
 * @param {string} orgId
 * @returns {Promise<Array>}
 */
async function getRecentActivity(orgId) {
  const res = await pool.query(`
    SELECT sh.*, u.name AS user_name, u.mobile AS user_mobile
    FROM scan_history sh
    LEFT JOIN users u ON sh.user_id = u.id
    JOIN batches b ON sh.batch_id = b.id
    WHERE b.org_id = $1
    ORDER BY sh.scanned_at DESC
    LIMIT 10
  `, [orgId])
  return res.rows
}

/**
 * Returns spending breakdown grouped by product name (org-scoped)
 * @param {string} orgId
 * @returns {Promise<Array>}
 */
async function getByProduct(orgId) {
  const res = await pool.query(`
    SELECT
      b.product_name,
      COUNT(DISTINCT b.id)                                                      AS total_batches,
      COUNT(q.id)                                                                AS total_qrs,
      COALESCE(SUM(b.total_amount), 0)                                          AS total_funded,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'redeemed'), 0)          AS total_redeemed,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'wallet_credited'), 0)   AS total_wallet_credited,
      COALESCE(SUM(q.amount) FILTER (WHERE q.status = 'pending_reason'), 0)    AS total_pending,
      COUNT(DISTINCT q.user_mobile)                                              AS unique_users
    FROM batches b
    LEFT JOIN qr_codes q ON q.batch_id = b.id
    WHERE b.status != 'draft' AND b.org_id = $1
    GROUP BY b.product_name
    ORDER BY total_funded DESC
  `, [orgId])
  return res.rows
}

module.exports = { getSummary, getRecentActivity, getByProduct }
