// Super admin QR pool allocations — generate QR codes per org for printing
const pool = require('../db/pool')
const { generateQRZip, generateQRZipPlain } = require('../utils/qrGenerator')

/**
 * Creates a QR allocation: generates N QR codes with status='available' for an org.
 * Serial numbers (qr_number) continue from the org's last assigned number.
 * Also auto-increments org.qr_quota by count (kept for informational display).
 * @param {string} orgId
 * @param {number} count
 * @returns {Promise<Object>} allocation record
 */
async function createAllocation(orgId, count) {
  const n = Math.max(1, parseInt(count) || 0)
  if (n < 1)     throw Object.assign(new Error('Count must be at least 1'), { status: 400 })
  if (n > 50000) throw Object.assign(new Error('Maximum 50,000 QR codes per allocation'), { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock org row to prevent concurrent allocation race
    const orgRes = await client.query(
      'SELECT id FROM organizations WHERE id = $1 FOR UPDATE',
      [orgId]
    )
    if (!orgRes.rows[0]) throw Object.assign(new Error('Organisation not found'), { status: 404 })

    // Next serial number continues from org's highest existing qr_number
    const maxRes = await client.query(
      'SELECT COALESCE(MAX(qr_number), 0) AS max_num FROM qr_codes WHERE org_id = $1',
      [orgId]
    )
    const serialFrom = maxRes.rows[0].max_num + 1
    const serialTo   = serialFrom + n - 1

    // Record the allocation event
    const allocRes = await client.query(`
      INSERT INTO qr_allocations (org_id, count, serial_from, serial_to)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [orgId, n, serialFrom, serialTo])
    const allocation = allocRes.rows[0]

    // Generate QR codes into the pool (status='available', no batch_id yet)
    await client.query(`
      INSERT INTO qr_codes (org_id, allocation_id, qr_number, status)
      SELECT $1, $2, $3 + gs - 1, 'available'
      FROM generate_series(1, $4) AS gs
    `, [orgId, allocation.id, serialFrom, n])

    // Keep qr_quota in sync (total ever allocated, informational)
    await client.query(
      'UPDATE organizations SET qr_quota = qr_quota + $1 WHERE id = $2',
      [n, orgId]
    )

    await client.query('COMMIT')
    return allocation
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Returns QR pool summary for an org.
 * @param {string} orgId
 * @returns {Promise<{available: number, in_batches: number, total_allocated: number}>}
 */
async function getPoolStats(orgId) {
  const res = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'available')::int                          AS available,
      COUNT(*) FILTER (WHERE status NOT IN ('available','expired'))::int         AS in_batches,
      COUNT(*)::int                                                               AS total_allocated
    FROM qr_codes
    WHERE org_id = $1
  `, [orgId])
  return res.rows[0] || { available: 0, in_batches: 0, total_allocated: 0 }
}

/**
 * Returns allocations for an org, newest first.
 * @param {string} orgId
 * @param {{ page?: number, limit?: number }} opts
 * @returns {Promise<{allocations: Array, total: number}>}
 */
async function getAllocations(orgId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit
  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT a.*,
        COUNT(q.id) FILTER (WHERE q.status = 'available')::int AS available_count,
        COUNT(q.id) FILTER (WHERE q.status != 'available')::int AS claimed_count
      FROM qr_allocations a
      LEFT JOIN qr_codes q ON q.allocation_id = a.id
      WHERE a.org_id = $1
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `, [orgId, limit, offset]),
    pool.query('SELECT COUNT(*)::int AS cnt FROM qr_allocations WHERE org_id = $1', [orgId]),
  ])
  return { allocations: dataRes.rows, total: dataRes.rows.length > 0 ? parseInt(countRes.rows[0].cnt) : 0 }
}

/**
 * Exports a specific allocation as a ZIP (designed stickers or plain QR PNGs).
 * @param {string} allocationId
 * @param {string} orgId  used to verify ownership
 * @param {'designed'|'plain'} mode
 * @returns {Promise<Buffer>}
 */
async function exportAllocation(allocationId, orgId, mode = 'designed') {
  const allocRes = await pool.query(`
    SELECT a.serial_from, a.serial_to, o.name AS org_name, o.sticker_config
    FROM qr_allocations a
    JOIN organizations o ON o.id = a.org_id
    WHERE a.id = $1 AND a.org_id = $2
  `, [allocationId, orgId])
  if (!allocRes.rows.length) throw Object.assign(new Error('Allocation not found'), { status: 404 })
  const { org_name, sticker_config } = allocRes.rows[0]

  const qrRes = await pool.query(
    'SELECT id, qr_number, amount FROM qr_codes WHERE allocation_id = $1 ORDER BY qr_number ASC',
    [allocationId]
  )
  if (!qrRes.rows.length) throw new Error('No QR codes found in this allocation')

  return mode === 'plain'
    ? generateQRZipPlain(qrRes.rows)
    : generateQRZip(qrRes.rows, org_name, sticker_config || {})
}

module.exports = { createAllocation, getPoolStats, getAllocations, exportAllocation }
