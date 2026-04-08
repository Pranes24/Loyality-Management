// Business logic for batch creation, funding, and QR management
const pool = require('../db/pool')
const { autoDistribute, manualDistribute, summariseDistribution } = require('../utils/distribute')
const { generateQRZip } = require('../utils/qrGenerator')

/**
 * Generates the next sequential batch code per org e.g. BATCH-001
 * @param {import('pg').PoolClient} client
 * @param {string} orgId
 * @returns {Promise<string>}
 */
async function getNextBatchCode(client, orgId) {
  const res = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(batch_code FROM 7) AS INTEGER)), 0) + 1 AS next
    FROM batches WHERE org_id = $1
  `, [orgId])
  return `BATCH-${String(res.rows[0].next).padStart(3, '0')}`
}

/**
 * Creates a new batch with blank QR codes (DRAFT status, no amounts)
 * @param {string} name
 * @param {string} productName
 * @param {string} orgId
 * @param {number} qrCount
 * @returns {Promise<Object>}
 */
async function createBatch(name, productName, orgId, qrCount = 500) {
  const count  = Math.max(50, Math.min(5000, parseInt(qrCount) || 500))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const batchCode = await getNextBatchCode(client, orgId)

    const batchRes = await client.query(`
      INSERT INTO batches (batch_code, name, product_name, org_id, qr_count)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [batchCode, name, productName, orgId, count])
    const batch = batchRes.rows[0]

    const ids = await client.query(`
      INSERT INTO qr_codes (batch_id)
      SELECT $1 FROM generate_series(1, $2) RETURNING id
    `, [batch.id, count])

    await client.query('COMMIT')
    return { ...batch, qr_count: ids.rows.length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Returns batches scoped to an org with optional filters
 * @param {string} orgId
 * @param {Object} filters - { status, search, page, limit }
 * @returns {Promise<{batches: Array, total: number}>}
 */
async function getBatches(orgId, { status, search, page = 1, limit = 20 } = {}) {
  const conditions = ['b.org_id = $1']
  const params     = [orgId]
  let idx = 2

  if (status) { conditions.push(`b.status = $${idx++}`); params.push(status) }
  if (search) {
    conditions.push(`(b.batch_code ILIKE $${idx} OR b.name ILIKE $${idx} OR b.product_name ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }

  const where  = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT b.*,
        COUNT(q.id) FILTER (WHERE q.status = 'redeemed')        AS redeemed_count,
        COUNT(q.id) FILTER (WHERE q.status = 'wallet_credited') AS wallet_count,
        COUNT(q.id) FILTER (WHERE q.status NOT IN ('generated','funded','expired')) AS scanned_count
      FROM batches b
      LEFT JOIN qr_codes q ON q.batch_id = b.id
      ${where}
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM batches b ${where}`, params),
  ])

  return { batches: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Returns a single batch by ID (org-scoped security check)
 * @param {string} batchId
 * @param {string} orgId
 * @returns {Promise<Object|null>}
 */
async function getBatchById(batchId, orgId) {
  const res = await pool.query(`
    SELECT b.*,
      COUNT(q.id) AS total_qrs,
      COUNT(q.id) FILTER (WHERE q.status = 'redeemed')        AS redeemed_count,
      COUNT(q.id) FILTER (WHERE q.status = 'wallet_credited') AS wallet_count,
      COUNT(q.id) FILTER (WHERE q.status = 'pending_reason')  AS pending_count,
      COUNT(q.id) FILTER (WHERE q.status = 'expired')         AS expired_count,
      COUNT(q.id) FILTER (WHERE q.status IN ('generated','funded')) AS unused_count
    FROM batches b
    LEFT JOIN qr_codes q ON q.batch_id = b.id
    WHERE b.id = $1 AND b.org_id = $2
    GROUP BY b.id
  `, [batchId, orgId])
  return res.rows[0] || null
}

/**
 * Returns QR codes for a batch with optional status filter (org-scoped via batch)
 * @param {string} batchId
 * @param {string} orgId
 * @param {Object} filters - { status, page, limit }
 * @returns {Promise<{qrCodes: Array, total: number}>}
 */
async function getQRsByBatch(batchId, orgId, { status, page = 1, limit = 50 } = {}) {
  // Verify batch belongs to org
  const batchCheck = await pool.query('SELECT id FROM batches WHERE id = $1 AND org_id = $2', [batchId, orgId])
  if (!batchCheck.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 })

  const conditions = ['batch_id = $1']
  const params     = [batchId]
  let idx = 2

  if (status) { conditions.push(`status = $${idx++}`); params.push(status) }

  const where  = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT * FROM qr_codes ${where}
      ORDER BY scanned_at DESC NULLS LAST, id
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]),
    pool.query(`SELECT COUNT(*) FROM qr_codes ${where}`, params),
  ])

  return { qrCodes: dataRes.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Funds a DRAFT batch — assigns amounts and sets expiry
 * @param {string} batchId
 * @param {string} orgId
 * @param {Object} opts - { distMode, totalAmount, tiers, expiresAt }
 * @returns {Promise<Object>}
 */
async function fundBatch(batchId, orgId, { distMode, totalAmount, tiers, expiresAt }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const batchRes = await client.query(
      'SELECT * FROM batches WHERE id = $1 AND org_id = $2 FOR UPDATE', [batchId, orgId]
    )
    const batch = batchRes.rows[0]
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 })
    if (batch.status !== 'draft') throw new Error(`Batch is already ${batch.status}`)

    const qrCount = parseInt(batch.qr_count) || 500
    const amounts = distMode === 'auto'
      ? autoDistribute(totalAmount, qrCount)
      : manualDistribute(tiers, totalAmount, qrCount)

    const qrRes = await client.query(
      'SELECT id FROM qr_codes WHERE batch_id = $1 ORDER BY id', [batchId]
    )
    const qrIds = qrRes.rows.map(r => r.id)

    for (let i = 0; i < qrIds.length; i++) {
      await client.query(`
        UPDATE qr_codes SET amount = $1, status = 'funded', expires_at = $2 WHERE id = $3
      `, [amounts[i], expiresAt, qrIds[i]])
    }

    const updated = await client.query(`
      UPDATE batches
      SET status = 'funded', total_amount = $1, dist_mode = $2, expires_at = $3, funded_at = NOW()
      WHERE id = $4 RETURNING *
    `, [totalAmount, distMode, expiresAt, batchId])

    await client.query('COMMIT')
    return { ...updated.rows[0], distribution: summariseDistribution(amounts) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Updates batch status (pause / reactivate) — org-scoped
 * @param {string} batchId
 * @param {string} orgId
 * @param {'paused'|'funded'} status
 * @returns {Promise<Object>}
 */
async function updateBatchStatus(batchId, orgId, status) {
  const allowed = ['paused', 'funded']
  if (!allowed.includes(status)) throw new Error(`Invalid status: ${status}`)

  const res = await pool.query(
    'UPDATE batches SET status = $1 WHERE id = $2 AND org_id = $3 AND status != $4 RETURNING *',
    [status, batchId, orgId, 'draft']
  )
  if (!res.rows[0]) throw Object.assign(new Error('Batch not found or cannot be updated'), { status: 404 })
  return res.rows[0]
}

/**
 * Generates a ZIP of all QR code PNGs for a batch (org-scoped)
 * @param {string} batchId
 * @param {string} orgId
 * @returns {Promise<Buffer>}
 */
async function exportBatchQRs(batchId, orgId) {
  const batchCheck = await pool.query('SELECT id FROM batches WHERE id = $1 AND org_id = $2', [batchId, orgId])
  if (!batchCheck.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 })

  const res = await pool.query('SELECT id FROM qr_codes WHERE batch_id = $1 ORDER BY id', [batchId])
  if (!res.rows.length) throw new Error('No QR codes found for this batch')
  return generateQRZip(res.rows)
}

module.exports = {
  createBatch, getBatches, getBatchById,
  getQRsByBatch, fundBatch, updateBatchStatus, exportBatchQRs,
}
