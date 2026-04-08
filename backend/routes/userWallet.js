// Public routes for user wallet — no auth required (mobile-based lookup)
const express      = require('express')
const router       = express.Router()
const svc          = require('../services/withdrawalService')
const { verifyFirebaseToken } = require('../services/redeemService')

// GET /api/user-wallet/:mobile — wallet balance + transaction history
router.get('/:mobile', async (req, res) => {
  const { mobile } = req.params
  if (!mobile.match(/^[6-9]\d{9}$/)) return res.status(400).json({ error: 'Invalid mobile number' })
  const data = await svc.getUserWallet(mobile)
  res.json(data)
})

// POST /api/user-wallet/withdraw — submit withdrawal request
router.post('/withdraw', async (req, res) => {
  const { user_id, amount, upi_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id is required' })
  if (!upi_id)  return res.status(400).json({ error: 'upi_id is required' })
  if (!amount || amount < 20) return res.status(400).json({ error: 'Minimum withdrawal is ₹20' })

  const withdrawal = await svc.requestWithdrawal(user_id, parseFloat(amount), upi_id.trim())
  res.status(201).json({ success: true, withdrawal })
})

// POST /api/user-wallet/login — verify Firebase token, upsert user, return session info
router.post('/login', async (req, res) => {
  const { idToken } = req.body
  if (!idToken) return res.status(400).json({ error: 'idToken is required' })
  const result = await verifyFirebaseToken(idToken)
  res.json({ success: true, userId: result.userId, name: result.name, savedUpiId: result.savedUpiId })
})

module.exports = router
