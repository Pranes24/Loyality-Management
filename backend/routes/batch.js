// Thin HTTP layer for batch management — delegates to batchService
const express = require('express')
const router  = express.Router()
const { requireOrgAdmin } = require('../middleware/auth')
const svc = require('../services/batchService')

router.use(requireOrgAdmin)

// GET /api/batch/quota — quota usage for the org admin's organisation (US-048)
router.get('/quota', async (req, res) => {
  const quota = await svc.getOrgQuota(req.orgId)
  res.json(quota)
})

// GET /api/batch/sticker-config — get org's sticker design config
router.get('/sticker-config', async (req, res) => {
  const config = await svc.getStickerConfig(req.orgId)
  res.json(config)
})

// PATCH /api/batch/sticker-config — save org's sticker design config
router.patch('/sticker-config', async (req, res) => {
  const config = await svc.updateStickerConfig(req.orgId, req.body)
  res.json({ success: true, config })
})

// POST /api/batch/create
router.post('/create', async (req, res) => {
  const { name, product_name, qr_count } = req.body
  if (!name?.trim())         return res.status(400).json({ error: 'Batch name is required' })
  if (!product_name?.trim()) return res.status(400).json({ error: 'Product name is required' })

  const batch = await svc.createBatch(name.trim(), product_name.trim(), req.orgId, qr_count)
  res.status(201).json({ success: true, batch })
})

// GET /api/batch/list
router.get('/list', async (req, res) => {
  const { status, search, page, limit } = req.query
  const result = await svc.getBatches(req.orgId, {
    status, search,
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 20,
  })
  res.json(result)
})

// GET /api/batch/:id
router.get('/:id', async (req, res) => {
  const batch = await svc.getBatchById(req.params.id, req.orgId)
  if (!batch) return res.status(404).json({ error: 'Batch not found' })
  res.json(batch)
})

// GET /api/batch/:id/qrcodes
router.get('/:id/qrcodes', async (req, res) => {
  const { status, page, limit } = req.query
  const result = await svc.getQRsByBatch(req.params.id, req.orgId, {
    status,
    page:  parseInt(page)  || 1,
    limit: parseInt(limit) || 50,
  })
  res.json(result)
})

// POST /api/batch/:id/fund
router.post('/:id/fund', async (req, res) => {
  const { dist_mode, total_amount, tiers, expires_at } = req.body
  if (!dist_mode)    return res.status(400).json({ error: 'dist_mode is required (auto or manual)' })
  if (!total_amount) return res.status(400).json({ error: 'total_amount is required' })
  if (!expires_at)   return res.status(400).json({ error: 'expires_at is required' })
  if (dist_mode === 'manual' && (!Array.isArray(tiers) || !tiers.length)) {
    return res.status(400).json({ error: 'tiers array is required for manual mode' })
  }

  const result = await svc.fundBatch(req.params.id, req.orgId, {
    distMode: dist_mode,
    totalAmount: parseInt(total_amount),
    tiers,
    expiresAt: expires_at,
  })
  res.json({ success: true, batch: result })
})

// PATCH /api/batch/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })
  const batch = await svc.updateBatchStatus(req.params.id, req.orgId, status)
  res.json({ success: true, batch })
})

// NOTE: QR export is super-admin only — use GET /api/super/batches/:id/export/:mode

module.exports = router
