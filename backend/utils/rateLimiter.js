// In-memory rate limiter for manual QR entry — 5 failed lookups per IP per hour
// Key: `${ip}:${orgCode}` — window resets after WINDOW_MS of inactivity

const WINDOW_MS = 60 * 60 * 1000  // 1 hour
const MAX_FAILS = 5

const store = new Map()

// Purge stale windows every 30 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key)
  }
}, 30 * 60 * 1000)

/**
 * Throws HTTP 429 if the IP has exceeded MAX_FAILS in the current window.
 * Call BEFORE attempting the lookup.
 * @param {string} ip
 * @param {string} orgCode
 */
function checkLimit(ip, orgCode) {
  const key   = `${ip}:${orgCode}`
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) return // new window — allow

  if (entry.count >= MAX_FAILS) {
    const resetIn = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 60000)
    throw Object.assign(
      new Error(`Too many failed attempts. Try again in ${resetIn} minute(s).`),
      { status: 429 }
    )
  }
}

/**
 * Increments failure count for the IP:orgCode key.
 * Call AFTER a failed lookup.
 * @param {string} ip
 * @param {string} orgCode
 */
function recordFailure(ip, orgCode) {
  const key   = `${ip}:${orgCode}`
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now })
  } else {
    entry.count++
  }
}

/**
 * Clears failures for the IP:orgCode key after a successful lookup.
 * @param {string} ip
 * @param {string} orgCode
 */
function clearFailures(ip, orgCode) {
  store.delete(`${ip}:${orgCode}`)
}

module.exports = { checkLimit, recordFailure, clearFailures }
