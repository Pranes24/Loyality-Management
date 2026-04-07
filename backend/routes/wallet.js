// Thin HTTP layer for admin wallet management
const express = require('express')
const router  = express.Router()
const svc     = require('../services/walletService')

// GET /api/wallet/balance
router.get('/balance', async (req, res) => {
  const wallet = await svc.getAdminWallet()
  res.json(wallet)
})

// POST /api/wallet/topup
router.post('/topup', async (req, res) => {
  const { amount, note } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'A positive amount is required' })
  const wallet = await svc.topupWallet(parseFloat(amount), note)
  res.json({ success: true, wallet })
})

// GET /api/wallet/transactions
router.get('/transactions', async (req, res) => {
  const { type, dateFrom, dateTo, page, limit } = req.query
  const result = await svc.getWalletTransactions({
    type, dateFrom, dateTo,
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 20,
  })
  res.json(result)
})

module.exports = router
