// Business logic for QR validation, Firebase Phone Auth verification, and redemption submission
const pool       = require('../db/pool')
const getAdmin   = require('../lib/firebaseAdmin')
const { debitAdminWallet } = require('./walletService')

/**
 * Validates a QR code on scan — checks all block conditions
 * @param {string} qrId
 * @returns {Promise<{valid: boolean, error?: string, message: string, qr?: Object}>}
 */
async function checkQR(qrId) {
  const res = await pool.query(`
    SELECT q.*, b.status AS batch_status, b.name AS batch_name,
           b.product_name, b.batch_code, b.id AS batch_uuid, b.org_id
    FROM qr_codes q
    JOIN batches b ON q.batch_id = b.id
    WHERE q.id = $1
  `, [qrId])

  if (!res.rows.length) {
    return { valid: false, error: 'QR_NOT_FOUND', message: 'This QR code is not valid' }
  }

  const qr = res.rows[0]

  if (qr.batch_status === 'draft' || qr.status === 'generated') {
    return { valid: false, error: 'QR_NOT_ACTIVATED', message: 'This QR code is not activated yet. Please check back later.' }
  }

  if (qr.batch_status === 'paused') {
    return { valid: false, error: 'BATCH_PAUSED', message: 'This offer is currently paused. Please try again later.' }
  }

  // Check org suspension
  const orgRes = await pool.query(
    'SELECT status FROM organizations WHERE id = $1', [qr.org_id]
  )
  if (orgRes.rows[0]?.status === 'suspended') {
    return { valid: false, error: 'ORG_SUSPENDED', message: 'This offer is not available at this time.' }
  }

  const now = new Date()
  if (qr.expires_at && new Date(qr.expires_at) < now) {
    return { valid: false, error: 'QR_EXPIRED', message: 'This QR code has expired', expiresAt: qr.expires_at }
  }

  const usedStatuses = ['scanning', 'redeemed', 'wallet_credited', 'pending_reason']
  if (usedStatuses.includes(qr.status)) {
    return { valid: false, error: 'QR_ALREADY_USED', message: 'This QR code has already been used' }
  }

  return { valid: true, qr }
}

/**
 * Verifies a Firebase Phone Auth ID token and upserts the global user
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<{userId: string, isNew: boolean, name: string|null, savedUpiId: string|null}>}
 */
async function verifyFirebaseToken(idToken) {
  const decoded     = await getAdmin().auth().verifyIdToken(idToken)
  const phoneNumber = decoded.phone_number // e.g. "+919876543210"
  if (!phoneNumber) throw new Error('Phone number not found in token')

  // Strip country code — store as 10-digit mobile
  const mobile = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '')
  if (mobile.length !== 10) throw new Error('Invalid phone number in token')

  // Global user — upsert by mobile only
  await pool.query(
    'INSERT INTO users (mobile) VALUES ($1) ON CONFLICT (mobile) DO NOTHING',
    [mobile]
  )
  const existing = await pool.query('SELECT * FROM users WHERE mobile = $1', [mobile])
  const user     = existing.rows[0]

  return { userId: user.id, isNew: !user.name, savedUpiId: user.upi_id, name: user.name }
}

/**
 * Confirms the scan — debits org wallet and marks QR as scanning
 * @param {string} qrId
 * @param {string} userId
 * @param {string} userName
 * @param {string} userMobile
 * @returns {Promise<{amount: number, batchId: string, batchCode: string, productName: string}>}
 */
async function confirmScan(qrId, userId, userName, userMobile) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const qrRes = await client.query(`
      SELECT q.*, b.id AS batch_uuid, b.batch_code, b.product_name, b.org_id
      FROM qr_codes q
      JOIN batches b ON q.batch_id = b.id
      WHERE q.id = $1 AND q.status = 'funded'
      FOR UPDATE OF q
    `, [qrId])
    if (!qrRes.rows.length) throw new Error('QR is no longer available for scanning')

    const qr = qrRes.rows[0]

    // Debit the org's wallet (not global admin_wallet)
    await debitAdminWallet(client, qr.org_id, parseFloat(qr.amount), qrId, qr.batch_id)

    await client.query(`
      UPDATE qr_codes
      SET status = 'scanning', scanned_at = NOW(), user_name = $1, user_mobile = $2
      WHERE id = $3
    `, [userName, userMobile, qrId])

    await client.query(
      'UPDATE users SET name = $1, total_scans = total_scans + 1, last_scan_at = NOW() WHERE id = $2',
      [userName, userId]
    )

    await client.query('COMMIT')
    return {
      amount:      parseFloat(qr.amount),
      batchId:     qr.batch_uuid,
      batchCode:   qr.batch_code,
      productName: qr.product_name,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Submits the final redemption choice (Option A, B, or C)
 * @param {string} qrId
 * @param {string} userId
 * @param {'redeemed'|'wallet_credited'|'pending_reason'} action
 * @param {Object} data - { upiId?, reason?, batchCode, productName, batchId }
 * @returns {Promise<{txnId?: string, walletBalance?: number}>}
 */
async function submitRedemption(qrId, userId, action, data) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const qrRes = await client.query(
      'SELECT * FROM qr_codes WHERE id = $1 AND status = $2 FOR UPDATE', [qrId, 'scanning']
    )
    if (!qrRes.rows.length) throw new Error('QR is not in a scannable state')

    const qr     = qrRes.rows[0]
    const amount = parseFloat(qr.amount)
    let txnId    = null
    let walletBalance = null

    if (action === 'redeemed') {
      txnId = `TXN${Date.now()}`
      await client.query(`
        UPDATE qr_codes SET status = 'redeemed', upi_id = $1, redeemed_at = NOW(), txn_id = $2 WHERE id = $3
      `, [data.upiId, txnId, qrId])

      await client.query(`
        UPDATE users
        SET total_redeemed = total_redeemed + 1, total_earned = total_earned + $1, upi_id = $2
        WHERE id = $3
      `, [amount, data.upiId, userId])

    } else if (action === 'wallet_credited') {
      await client.query('UPDATE qr_codes SET status = $1 WHERE id = $2', ['wallet_credited', qrId])

      const userRes = await client.query(`
        UPDATE users
        SET total_wallet_credits = total_wallet_credits + 1,
            wallet_balance = wallet_balance + $1,
            total_wallet_in = total_wallet_in + $1
        WHERE id = $2 RETURNING wallet_balance
      `, [amount, userId])
      walletBalance = parseFloat(userRes.rows[0].wallet_balance)

      await client.query(`
        INSERT INTO user_wallet_transactions (user_id, type, amount, qr_id, batch_code, product_name, note)
        VALUES ($1, 'credit', $2, $3, $4, $5, 'QR scan credit')
      `, [userId, amount, qrId, data.batchCode, data.productName])

    } else if (action === 'pending_reason') {
      await client.query('UPDATE qr_codes SET status = $1, reason = $2 WHERE id = $3', ['pending_reason', data.reason, qrId])
      await client.query('UPDATE users SET total_pending = total_pending + 1 WHERE id = $1', [userId])
    }

    await client.query(`
      INSERT INTO scan_history
        (user_id, qr_id, batch_id, batch_code, product_name, amount, action, upi_id, reason, txn_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [userId, qrId, data.batchId, data.batchCode, data.productName, amount, action, data.upiId || null, data.reason || null, txnId])

    await client.query('COMMIT')
    return { txnId, walletBalance, amount }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { checkQR, verifyFirebaseToken, confirmScan, submitRedemption }
