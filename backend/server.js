// Loyalty Management System — Express entry point
require('dotenv').config()
require('express-async-errors')

const express = require('express')
const cors    = require('cors')

const batchRouter  = require('./routes/batch')
const redeemRouter = require('./routes/redeem')
const usersRouter  = require('./routes/users')
const walletRouter = require('./routes/wallet')
const statsRouter  = require('./routes/stats')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.BASE_URL || 'http://localhost:5173' }))
app.use(express.json())

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
app.use('/api/batch',  batchRouter)
app.use('/api/redeem', redeemRouter)
app.use('/api/users',  usersRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/stats',  statsRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Loyalty API running on http://localhost:${PORT}`)
})
