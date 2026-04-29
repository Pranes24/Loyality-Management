// Persistent worker thread pool for QR code generation.
// Workers start once at server boot and stay alive — eliminates per-request startup overhead.
const { Worker }  = require('worker_threads')
const os          = require('os')
const path        = require('path')
require('dotenv').config()

const BASE_URL      = process.env.BASE_URL || 'http://localhost:5173'
const WORKER_SCRIPT = path.join(__dirname, 'qrWorker.js')
const POOL_SIZE     = Math.min(os.cpus().length, 8)

let jobCounter = 0

// Each pool slot: { worker, busy, resolve, reject }
const pool = []

function createWorker() {
  const slot = { worker: null, busy: false, resolve: null, reject: null }
  const w    = new Worker(WORKER_SCRIPT)

  w.on('message', ({ jobId, results }) => {
    if (slot.resolve) {
      const { resolve } = slot
      slot.busy    = false
      slot.resolve = null
      slot.reject  = null
      resolve(results)
      drainQueue()
    }
  })

  w.on('error', err => {
    if (slot.reject) {
      const { reject } = slot
      slot.busy    = false
      slot.resolve = null
      slot.reject  = null
      reject(err)
    }
    // Replace the dead worker
    pool.splice(pool.indexOf(slot), 1)
    pool.push(createWorker())
    drainQueue()
  })

  slot.worker = w
  return slot
}

// Queue of pending jobs: { jobId, qrIds, resolve, reject }
const queue = []

function drainQueue() {
  if (!queue.length) return
  const freeSlot = pool.find(s => !s.busy)
  if (!freeSlot) return

  const job       = queue.shift()
  freeSlot.busy   = true
  freeSlot.resolve = job.resolve
  freeSlot.reject  = job.reject
  freeSlot.worker.postMessage({ jobId: job.jobId, qrIds: job.qrIds, baseUrl: BASE_URL })
}

// Initialise pool at module load (happens once at server start)
for (let i = 0; i < POOL_SIZE; i++) pool.push(createWorker())

/**
 * Generates QR SVG strings for a list of QR code IDs using the worker pool.
 * Returns a map of id → SVG string (vector, no pixel rendering).
 * @param {string[]} ids
 * @returns {Promise<Map<string, string>>} id → SVG string
 */
async function generateQRBuffersParallel(ids) {
  if (!ids.length) return new Map()

  // Split IDs evenly across all workers
  const chunkSize = Math.max(1, Math.ceil(ids.length / POOL_SIZE))
  const chunks    = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    if (slice.length) chunks.push(slice)
  }

  // Dispatch one job per chunk and wait for all
  const allResults = await Promise.all(chunks.map(qrIds =>
    new Promise((resolve, reject) => {
      const jobId = ++jobCounter
      queue.push({ jobId, qrIds, resolve, reject })
      drainQueue()
    })
  ))

  const map = new Map()
  for (const results of allResults) {
    for (const { id, svg } of results) map.set(id, svg)
  }
  return map
}

module.exports = { generateQRBuffersParallel }
