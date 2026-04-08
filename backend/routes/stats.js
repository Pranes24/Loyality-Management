// Thin HTTP layer for dashboard stats and reports
const express = require('express')
const router  = express.Router()
const { requireOrgAdmin } = require('../middleware/auth')
const svc = require('../services/statsService')

router.use(requireOrgAdmin)

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  const summary = await svc.getSummary(req.orgId)
  res.json(summary)
})

// GET /api/stats/recent
router.get('/recent', async (req, res) => {
  const activity = await svc.getRecentActivity(req.orgId)
  res.json({ activity })
})

// GET /api/stats/by-product
router.get('/by-product', async (req, res) => {
  const products = await svc.getByProduct(req.orgId)
  res.json({ products })
})

module.exports = router
