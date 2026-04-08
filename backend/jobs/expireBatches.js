// Cron job — marks expired QR codes and batches automatically at midnight daily
const cron = require('node-cron')
const pool = require('../db/pool')

/**
 * Marks all funded QR codes past their expiry date as 'expired'.
 * Also marks batches as 'expired' when all remaining funded QRs are expired.
 * @returns {Promise<{qrsExpired: number, batchesExpired: number}>}
 */
async function runExpiry() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Step 1 — expire overdue funded QR codes
    const qrRes = await client.query(`
      UPDATE qr_codes
      SET status = 'expired'
      WHERE status = 'funded'
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      RETURNING id, batch_id
    `)
    const qrsExpired = qrRes.rows.length

    // Step 2 — expire batches where no funded QRs remain
    const batchRes = await client.query(`
      UPDATE batches
      SET status = 'expired'
      WHERE status IN ('funded', 'paused')
        AND id NOT IN (
          SELECT DISTINCT batch_id FROM qr_codes WHERE status = 'funded'
        )
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      RETURNING id, batch_code
    `)
    const batchesExpired = batchRes.rows.length

    await client.query('COMMIT')

    if (qrsExpired > 0 || batchesExpired > 0) {
      console.log(`[expiry-job] ${new Date().toISOString()} — expired ${qrsExpired} QRs, ${batchesExpired} batches`)
    }

    return { qrsExpired, batchesExpired }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[expiry-job] Error:', err.message)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Registers the cron job — runs at midnight every day
 */
function startExpiryCron() {
  // Run immediately on startup to catch any missed expirations
  runExpiry().catch(err => console.error('[expiry-job] Startup run failed:', err.message))

  // Schedule: every day at midnight
  cron.schedule('0 0 * * *', () => {
    runExpiry().catch(err => console.error('[expiry-job] Scheduled run failed:', err.message))
  })

  console.log('[expiry-job] Scheduled — runs daily at midnight')
}

module.exports = { startExpiryCron, runExpiry }
