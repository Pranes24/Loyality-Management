// Business logic for batch creation, funding, and QR management
const pool = require('../db/pool')
const { autoDistribute, manualDistribute, summariseDistribution } = require('../utils/distribute')
const { generateQRZip, generateQRZipPlain, DEFAULT_CONFIG } = require('../utils/qrGenerator')

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
 * Returns quota usage for an org: { qr_quota, qr_used, qr_remaining }
 * @param {string} orgId
 * @returns {Promise<{qr_quota: number, qr_used: number, qr_remaining: number}>}
 */
async function getOrgQuota(orgId) {
  const res = await pool.query(`
    SELECT
      o.qr_quota,
      COUNT(q.id)::int                AS qr_used,
      (o.qr_quota - COUNT(q.id))::int AS qr_remaining
    FROM organizations o
    LEFT JOIN qr_codes q ON q.org_id = o.id
    WHERE o.id = $1
    GROUP BY o.id, o.qr_quota
  `, [orgId])
  if (!res.rows[0]) throw Object.assign(new Error('Organisation not found'), { status: 404 })
  return res.rows[0]
}

/**
 * Creates a new batch by claiming N QR codes from the org's available pool.
 * Super admin must have allocated QR codes first (status='available').
 * Claims the lowest serial numbers first (sequential continuity).
 * @param {string} name
 * @param {string} productName
 * @param {string} orgId
 * @param {number} qrCount
 * @returns {Promise<Object>}
 */
async function createBatch(name, productName, orgId, qrCount = 500) {
  const count  = Math.max(1, parseInt(qrCount) || 500)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check available pool size upfront (no lock needed — UPDATE below is atomic)
    const poolRes = await client.query(
      "SELECT COUNT(*)::int AS available FROM qr_codes WHERE org_id = $1 AND status = 'available'",
      [orgId]
    )
    const available = poolRes.rows[0].available

    if (available === 0) {
      throw Object.assign(
        new Error('No QR codes in pool. Ask your Super Admin to generate QR codes for your organisation.'),
        { status: 400 }
      )
    }
    if (count > available) {
      throw Object.assign(
        new Error(`Not enough QR codes in pool. Requested: ${count}, Available: ${available}. Ask your Super Admin to generate more.`),
        { status: 400 }
      )
    }

    const batchCode = await getNextBatchCode(client, orgId)

    const batchRes = await client.query(`
      INSERT INTO batches (batch_code, name, product_name, org_id, qr_count)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [batchCode, name, productName, orgId, count])
    const batch = batchRes.rows[0]

    // Claim the lowest-serial available QR codes atomically
    const claimRes = await client.query(`
      UPDATE qr_codes SET batch_id = $1, status = 'generated'
      WHERE id IN (
        SELECT id FROM qr_codes
        WHERE org_id = $2 AND status = 'available'
        ORDER BY qr_number ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      )
      RETURNING qr_number
    `, [batch.id, orgId, count])

    if (claimRes.rows.length < count) {
      throw Object.assign(
        new Error(`Race condition: only ${claimRes.rows.length} of ${count} QR codes could be claimed. Please retry.`),
        { status: 409 }
      )
    }

    const nums = claimRes.rows.map(r => r.qr_number).sort((a, b) => a - b)

    await client.query('COMMIT')
    return {
      ...batch,
      qr_count:        claimRes.rows.length,
      qr_number_start: nums[0],
      qr_number_end:   nums[nums.length - 1],
    }
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
        COUNT(q.id)::int                                                            AS total_qrs,
        COUNT(q.id) FILTER (WHERE q.status = 'redeemed')::int        AS redeemed_count,
        COUNT(q.id) FILTER (WHERE q.status = 'wallet_credited')::int AS wallet_count,
        COUNT(q.id) FILTER (WHERE q.status NOT IN ('generated','funded','expired'))::int AS scanned_count
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
      COUNT(q.id) FILTER (WHERE q.status IN ('generated','funded')) AS unused_count,
      MIN(q.qr_number) AS qr_number_start,
      MAX(q.qr_number) AS qr_number_end
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
      ORDER BY qr_number ASC NULLS LAST
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
 * Generates a ZIP of sticker SVGs + raw QR PNGs + metadata.csv for a batch (org-scoped).
 * Stickers include org branding, QR image, and sequential number (US-054).
 * @param {string} batchId
 * @param {string} orgId
 * @returns {Promise<Buffer>}
 */
async function exportBatchQRs(batchId, orgId) {
  // Fetch batch + org name + sticker config in one query
  const batchRes = await pool.query(`
    SELECT b.id, o.name AS org_name, o.sticker_config
    FROM batches b
    JOIN organizations o ON o.id = b.org_id
    WHERE b.id = $1 AND b.org_id = $2
  `, [batchId, orgId])
  if (!batchRes.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 })
  const { org_name, sticker_config } = batchRes.rows[0]

  // Fetch QR codes with number and amount for sticker generation
  const res = await pool.query(
    'SELECT id, qr_number, amount FROM qr_codes WHERE batch_id = $1 ORDER BY qr_number ASC NULLS LAST',
    [batchId]
  )
  if (!res.rows.length) throw new Error('No QR codes found for this batch')

  return generateQRZip(res.rows, org_name, sticker_config || {})
}

/**
 * Returns the sticker config for an org (merged with defaults)
 * @param {string} orgId
 * @returns {Promise<Object>}
 */
async function getStickerConfig(orgId) {
  const res = await pool.query('SELECT sticker_config FROM organizations WHERE id = $1', [orgId])
  if (!res.rows[0]) throw Object.assign(new Error('Organisation not found'), { status: 404 })
  return { ...DEFAULT_CONFIG, ...(res.rows[0].sticker_config || {}) }
}

/**
 * Saves sticker config for an org (only whitelisted keys accepted)
 * @param {string} orgId
 * @param {Object} config
 * @returns {Promise<Object>}
 */
async function updateStickerConfig(orgId, config) {
  const allowed = ['bg_color', 'accent_from', 'accent_to', 'tagline', 'show_badge', 'badge_label', 'badge_color']
  const safe = {}
  for (const key of allowed) {
    if (key in config) safe[key] = config[key]
  }
  const res = await pool.query(
    'UPDATE organizations SET sticker_config = $1 WHERE id = $2 RETURNING sticker_config',
    [JSON.stringify(safe), orgId]
  )
  return { ...DEFAULT_CONFIG, ...(res.rows[0].sticker_config || {}) }
}

/**
 * Lists all batches across all orgs for super admin view.
 * @param {{ page: number, limit: number, search: string }} opts
 * @returns {Promise<{batches: Array, total: number}>}
 */
async function getAllBatchesForSuper({ page = 1, limit = 30, search = '' } = {}) {
  const offset = (page - 1) * limit
  const where  = search
    ? `WHERE b.name ILIKE $3 OR o.org_code ILIKE $3 OR o.name ILIKE $3`
    : ''
  const params = search ? [limit, offset, `%${search}%`] : [limit, offset]

  const rows = await pool.query(`
    SELECT b.id, b.batch_code, b.name, b.status, b.dist_mode,
           b.total_amount, b.created_at, b.expires_at,
           o.id AS org_id, o.name AS org_name, o.org_code,
           COUNT(q.id)::int AS total_qrs
    FROM batches b
    JOIN organizations o ON o.id = b.org_id
    LEFT JOIN qr_codes q ON q.batch_id = b.id
    ${where}
    GROUP BY b.id, o.id
    ORDER BY b.created_at DESC
    LIMIT $1 OFFSET $2
  `, params)

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM batches b JOIN organizations o ON o.id = b.org_id ${where}`,
    search ? [`%${search}%`] : []
  )

  return { batches: rows.rows, total: parseInt(countRes.rows[0].count) }
}

/**
 * Exports batch QR codes for super admin — designed (sticker ZIP) or plain (QR PNGs only).
 * Not org-scoped so super admin can download any batch.
 * @param {string} batchId
 * @param {'designed'|'plain'} mode
 * @returns {Promise<{buffer: Buffer, batchCode: string}>}
 */
async function exportBatchForSuper(batchId, mode = 'designed') {
  const batchRes = await pool.query(`
    SELECT b.id, b.batch_code, o.name AS org_name, o.sticker_config
    FROM batches b
    JOIN organizations o ON o.id = b.org_id
    WHERE b.id = $1
  `, [batchId])
  if (!batchRes.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 })
  const { batch_code, org_name, sticker_config } = batchRes.rows[0]

  const qrRes = await pool.query(
    'SELECT id, qr_number, amount FROM qr_codes WHERE batch_id = $1 ORDER BY qr_number ASC NULLS LAST',
    [batchId]
  )
  if (!qrRes.rows.length) throw new Error('No QR codes found for this batch')

  const buffer = mode === 'plain'
    ? await generateQRZipPlain(qrRes.rows)
    : await generateQRZip(qrRes.rows, org_name, sticker_config || {})

  return { buffer, batchCode: batch_code }
}

module.exports = {
  createBatch, getBatches, getBatchById,
  getQRsByBatch, fundBatch, updateBatchStatus, exportBatchQRs,
  getOrgQuota, getStickerConfig, updateStickerConfig,
  getAllBatchesForSuper, exportBatchForSuper,
}
