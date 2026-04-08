// Thin HTTP layer for user redemption flow — delegates to redeemService
const express = require('express')
const router  = express.Router()
const svc     = require('../services/redeemService')

// GET /api/redeem/:qrId/check — instant QR validation on scan
router.get('/:qrId/check', async (req, res) => {
  const result = await svc.checkQR(req.params.qrId)
  if (!result.valid) {
    return res.status(200).json({ valid: false, error: result.error, message: result.message, expiresAt: result.expiresAt })
  }
  res.json({ valid: true, message: 'QR is valid. Proceed to OTP.' })
})

// POST /api/otp/send
router.post('/otp/send', async (req, res) => {
  const { mobile, qr_id } = req.body
  if (!mobile?.match(/^[6-9]\d{9}$/)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' })
  if (!qr_id) return res.status(400).json({ error: 'qr_id is required' })

  const result = await svc.sendOTP(mobile, qr_id)
  res.json({ success: true, sessionId: result.sessionId, message: 'OTP sent successfully' })
})

// POST /api/otp/verify
router.post('/otp/verify', async (req, res) => {
  const { mobile, otp, qr_id } = req.body
  if (!mobile || !otp || !qr_id) return res.status(400).json({ error: 'mobile, otp, and qr_id are required' })

  const result = await svc.verifyOTP(mobile, otp, qr_id)
  res.json({ success: true, userId: result.userId, isNew: result.isNew, name: result.name, savedUpiId: result.savedUpiId })
})

// POST /api/redeem/confirm-scan — name + scan-again → debit wallet → reveal amount
router.post('/confirm-scan', async (req, res) => {
  const { qr_id, user_id, user_name, user_mobile } = req.body
  if (!qr_id || !user_id || !user_name || !user_mobile) {
    return res.status(400).json({ error: 'qr_id, user_id, user_name, and user_mobile are required' })
  }

  const result = await svc.confirmScan(qr_id, user_id, user_name.trim(), user_mobile)
  res.json({
    success:     true,
    amount:      result.amount,
    batchId:     result.batchId,
    batchCode:   result.batchCode,
    productName: result.productName,
  })
})

// POST /api/redeem/submit — final redemption choice A / B / C
router.post('/submit', async (req, res) => {
  const { qr_id, user_id, action, upi_id, reason, batch_id, batch_code, product_name } = req.body

  if (!qr_id || !user_id || !action) return res.status(400).json({ error: 'qr_id, user_id, and action are required' })

  const validActions = ['redeemed', 'wallet_credited', 'pending_reason']
  if (!validActions.includes(action)) return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` })

  if (action === 'redeemed'      && !upi_id)              return res.status(400).json({ error: 'upi_id is required for instant redemption' })
  if (action === 'pending_reason' && (!reason || reason.trim().length < 5)) {
    return res.status(400).json({ error: 'reason must be at least 5 characters' })
  }

  const result = await svc.submitRedemption(qr_id, user_id, action, {
    upiId: upi_id, reason: reason?.trim(),
    batchId: batch_id, batchCode: batch_code, productName: product_name,
  })
  res.json({ success: true, ...result })
})

module.exports = router
