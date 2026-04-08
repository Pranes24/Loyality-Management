// Loyalty Management System — Express entry point
require('dotenv').config()
require('express-async-errors')

const express = require('express')
const cors    = require('cors')

const authRouter       = require('./routes/auth')
const superRouter      = require('./routes/super')
const batchRouter      = require('./routes/batch')
const redeemRouter     = require('./routes/redeem')
const usersRouter      = require('./routes/users')
const walletRouter     = require('./routes/wallet')
const statsRouter      = require('./routes/stats')
const userWalletRouter = require('./routes/userWallet')

const { startExpiryCron } = require('./jobs/expireBatches')

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.BASE_URL || 'http://localhost:5173' }))
app.use(express.json())

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Public routes (no auth required)
app.use('/api/auth',        authRouter)
app.use('/api/redeem',      redeemRouter)
app.use('/api/user-wallet', userWalletRouter)

// Org admin routes (JWT required, scoped to org)
app.use('/api/batch',  batchRouter)
app.use('/api/users',  usersRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/stats',  statsRouter)

// Super admin routes (JWT required, super_admin role)
app.use('/api/super', superRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Loyalty API running on http://localhost:${PORT}`)

  // Log which env vars are present (not values — just presence) to aid debugging
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
  const missing  = required.filter(k => !process.env[k])
  if (missing.length) {
    console.warn(`[startup] WARNING — missing env vars: ${missing.join(', ')}`)
  } else {
    console.log('[startup] All required env vars present')
  }

  startExpiryCron()
})
