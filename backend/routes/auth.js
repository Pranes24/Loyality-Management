// Thin HTTP layer for authentication — login and org registration
const express = require('express')
const router  = express.Router()
const svc     = require('../services/authService')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

  const result = await svc.login(email, password)
  res.json({ success: true, ...result })
})

// POST /api/auth/register — self-register new org + org_admin
router.post('/register', async (req, res) => {
  const { org_name, org_code, admin_name, email, password } = req.body
  if (!org_name || !org_code || !admin_name || !email || !password) {
    return res.status(400).json({ error: 'org_name, org_code, admin_name, email, and password are required' })
  }
  if (org_code.length < 3 || org_code.length > 10) {
    return res.status(400).json({ error: 'org_code must be 3–10 characters' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' })
  }

  const result = await svc.registerOrg({
    orgName: org_name, orgCode: org_code,
    adminName: admin_name, email, password,
  })
  res.status(201).json({ success: true, ...result })
})

module.exports = router
