// Thin HTTP layer for batch management — delegates to batchService
const express = require('express')
const router  = express.Router()
const svc     = require('../services/batchService')

// POST /api/batch/create
router.post('/create', async (req, res) => {
  const { name, product_name } = req.body
  if (!name?.trim())         return res.status(400).json({ error: 'Batch name is required' })
  if (!product_name?.trim()) return res.status(400).json({ error: 'Product name is required' })

  const batch = await svc.createBatch(name.trim(), product_name.trim())
  res.status(201).json({ success: true, batch })
})

// GET /api/batch/list
router.get('/list', async (req, res) => {
  const { status, search, page, limit } = req.query
  const result = await svc.getBatches({ status, search, page: parseInt(page) || 1, limit: parseInt(limit) || 20 })
  res.json(result)
})

// GET /api/batch/:id
router.get('/:id', async (req, res) => {
  const batch = await svc.getBatchById(req.params.id)
  if (!batch) return res.status(404).json({ error: 'Batch not found' })
  res.json(batch)
})

// GET /api/batch/:id/qrcodes
router.get('/:id/qrcodes', async (req, res) => {
  const { status, page, limit } = req.query
  const result = await svc.getQRsByBatch(req.params.id, {
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

  const result = await svc.fundBatch(req.params.id, {
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
  const batch = await svc.updateBatchStatus(req.params.id, status)
  res.json({ success: true, batch })
})

// GET /api/batch/:id/export
router.get('/:id/export', async (req, res) => {
  const batch = await svc.getBatchById(req.params.id)
  if (!batch) return res.status(404).json({ error: 'Batch not found' })

  const zipBuffer = await svc.exportBatchQRs(req.params.id)
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${batch.batch_code}-qrcodes.zip"`)
  res.send(zipBuffer)
})

module.exports = router
