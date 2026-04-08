// Thin HTTP layer for user management and reports
const express = require('express')
const router  = express.Router()
const { requireOrgAdmin } = require('../middleware/auth')
const svc = require('../services/userService')

router.use(requireOrgAdmin)

// GET /api/users/list
router.get('/list', async (req, res) => {
  const { search, sortBy, page, limit, dateFrom, dateTo } = req.query
  const result = await svc.getUsers(req.orgId, {
    search, sortBy,
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 20,
    dateFrom, dateTo,
  })
  res.json(result)
})

// GET /api/users/top
router.get('/top', async (req, res) => {
  const { rankBy } = req.query
  const users = await svc.getTopUsers(req.orgId, rankBy)
  res.json({ users })
})

// GET /api/users/search?q=mobile
router.get('/search', async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'q (search term) is required' })
  const result = await svc.getUsers(req.orgId, { search: q, limit: 10 })
  res.json(result)
})

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const user = await svc.getUserById(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

// GET /api/users/:id/history
router.get('/:id/history', async (req, res) => {
  const { page, limit } = req.query
  const result = await svc.getScanHistory(req.params.id, req.orgId, {
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 20,
  })
  res.json(result)
})

// GET /api/users/wallet/:mobile
router.get('/wallet/:mobile', async (req, res) => {
  const wallet = await svc.getUserWallet(req.params.mobile)
  res.json(wallet)
})

// POST /api/users/wallet/withdraw
router.post('/wallet/withdraw', async (req, res) => {
  const { mobile, upi_id, amount } = req.body
  if (!mobile || !upi_id || !amount) return res.status(400).json({ error: 'mobile, upi_id, and amount are required' })
  if (amount < 1) return res.status(400).json({ error: 'Minimum withdrawal is ₹1' })

  const result = await svc.withdrawFromWallet(mobile, upi_id, parseFloat(amount))
  res.json({ success: true, ...result })
})

module.exports = router
