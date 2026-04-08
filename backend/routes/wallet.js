// Thin HTTP layer for org wallet management
const express = require('express')
const router  = express.Router()
const { requireOrgAdmin } = require('../middleware/auth')
const svc = require('../services/walletService')

router.use(requireOrgAdmin)

// GET /api/wallet/balance
router.get('/balance', async (req, res) => {
  const wallet = await svc.getAdminWallet(req.orgId)
  res.json(wallet)
})

// POST /api/wallet/topup
router.post('/topup', async (req, res) => {
  const { amount, note } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'A positive amount is required' })
  const wallet = await svc.topupWallet(req.orgId, parseFloat(amount), note)
  res.json({ success: true, wallet })
})

// GET /api/wallet/transactions
router.get('/transactions', async (req, res) => {
  const { type, dateFrom, dateTo, page, limit } = req.query
  const result = await svc.getWalletTransactions(req.orgId, {
    type, dateFrom, dateTo,
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 20,
  })
  res.json(result)
})

module.exports = router
