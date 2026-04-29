// Thin HTTP layer for super admin — org and platform management
const express = require('express')
const router  = express.Router()
const { requireSuperAdmin } = require('../middleware/auth')
const svc          = require('../services/superService')
const withdrawalSvc = require('../services/withdrawalService')
const batchSvc     = require('../services/batchService')
const allocSvc     = require('../services/allocationService')

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

// POST /api/super/orgs — create org + org_admin (qr_quota optional, defaults to 0)
router.post('/orgs', async (req, res) => {
  const { org_name, org_code, admin_name, admin_email, admin_password, qr_quota } = req.body
  if (!org_name || !org_code || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'org_name, org_code, admin_name, admin_email, admin_password are required' })
  }
  if (org_code.length < 3 || org_code.length > 10) {
    return res.status(400).json({ error: 'org_code must be 3–10 characters' })
  }

  const result = await svc.createOrg({
    orgName: org_name, orgCode: org_code,
    adminName: admin_name, adminEmail: admin_email, adminPassword: admin_password,
    qrQuota: qr_quota,
  })
  res.status(201).json({ success: true, ...result })
})

// PATCH /api/super/orgs/:id/quota — set or adjust QR quota (US-047, US-051)
router.patch('/orgs/:id/quota', async (req, res) => {
  const { qr_quota } = req.body
  if (qr_quota === undefined || qr_quota === null) {
    return res.status(400).json({ error: 'qr_quota is required' })
  }
  const result = await svc.updateOrgQuota(req.params.id, qr_quota)
  res.json({ success: true, org: result })
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

// GET /api/super/orgs/:orgId/pool — available QR pool stats
router.get('/orgs/:orgId/pool', async (req, res) => {
  const stats = await allocSvc.getPoolStats(req.params.orgId)
  res.json(stats)
})

// GET /api/super/orgs/:orgId/allocations — list allocation events (newest first)
router.get('/orgs/:orgId/allocations', async (req, res) => {
  const { page, limit } = req.query
  const result = await allocSvc.getAllocations(req.params.orgId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  })
  res.json(result)
})

// POST /api/super/orgs/:orgId/allocations — generate QR codes into org pool
router.post('/orgs/:orgId/allocations', async (req, res) => {
  const { count } = req.body
  if (!count || parseInt(count) < 1) return res.status(400).json({ error: 'count must be at least 1' })
  const allocation = await allocSvc.createAllocation(req.params.orgId, parseInt(count))
  res.status(201).json({ success: true, allocation })
})

// GET /api/super/orgs/:orgId/allocations/:allocationId/export/:mode — download allocation ZIP
router.get('/orgs/:orgId/allocations/:allocationId/export/:mode', async (req, res) => {
  const { orgId, allocationId, mode } = req.params
  if (!['designed', 'plain'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be designed or plain' })
  }
  const buffer = await allocSvc.exportAllocation(allocationId, orgId, mode)
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="alloc-${allocationId.slice(0,8)}-${mode}.zip"`)
  res.send(buffer)
})

// GET /api/super/orgs/:orgId/batches — org admin's batches (read-only view for super admin)
router.get('/orgs/:orgId/batches', async (req, res) => {
  const { page, limit, search, status } = req.query
  const result = await batchSvc.getBatches(req.params.orgId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    search, status,
  })
  res.json(result)
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
