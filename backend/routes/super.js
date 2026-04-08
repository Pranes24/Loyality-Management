// Thin HTTP layer for super admin — org and platform management
const express = require('express')
const router  = express.Router()
const { requireSuperAdmin } = require('../middleware/auth')
const svc          = require('../services/superService')
const withdrawalSvc = require('../services/withdrawalService')

router.use(requireSuperAdmin)

// GET /api/super/stats
router.get('/stats', async (req, res) => {
  const stats = await svc.getPlatformStats()
  res.json(stats)
})

// GET /api/super/orgs
router.get('/orgs', async (req, res) => {
  const { page, limit, search } = req.query
  const result = await svc.getOrgs({ page: parseInt(page) || 1, limit: parseInt(limit) || 20, search })
  res.json(result)
})

// GET /api/super/orgs/:id
router.get('/orgs/:id', async (req, res) => {
  const org = await svc.getOrgById(req.params.id)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json(org)
})

// POST /api/super/orgs — create org + org_admin
router.post('/orgs', async (req, res) => {
  const { org_name, org_code, admin_name, admin_email, admin_password } = req.body
  if (!org_name || !org_code || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'org_name, org_code, admin_name, admin_email, admin_password are required' })
  }
  if (org_code.length < 3 || org_code.length > 10) {
    return res.status(400).json({ error: 'org_code must be 3–10 characters' })
  }

  const result = await svc.createOrg({
    orgName: org_name, orgCode: org_code,
    adminName: admin_name, adminEmail: admin_email, adminPassword: admin_password,
  })
  res.status(201).json({ success: true, ...result })
})

// PATCH /api/super/orgs/:id/status
router.patch('/orgs/:id/status', async (req, res) => {
  const { status } = req.body
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or suspended' })
  }
  const org = await svc.updateOrgStatus(req.params.id, status)
  res.json({ success: true, org })
})

// POST /api/super/orgs/:id/topup
router.post('/orgs/:id/topup', async (req, res) => {
  const { amount, note } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'A positive amount is required' })
  const wallet = await svc.topupOrgWallet(req.params.id, parseFloat(amount), note)
  res.json({ success: true, wallet })
})

// GET /api/super/withdrawals
router.get('/withdrawals', async (req, res) => {
  const { status, page, limit } = req.query
  const result = await withdrawalSvc.getAllWithdrawals({
    status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
  })
  res.json(result)
})

// PATCH /api/super/withdrawals/:id — approve or reject
router.patch('/withdrawals/:id', async (req, res) => {
  const { status, note } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' })
  }
  const withdrawal = await withdrawalSvc.processWithdrawal(req.params.id, status, note)
  res.json({ success: true, withdrawal })
})

module.exports = router
