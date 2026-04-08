// JWT sign and verify helpers
const jwt = require('jsonwebtoken')

const SECRET  = process.env.JWT_SECRET || 'loyalty-dev-secret-change-in-prod'
const EXPIRES = '7d'

/**
 * Signs a JWT with the given payload
 * @param {{ id: string, email: string, role: string, orgId: string|null }} payload
 * @returns {string}
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES })
}

/**
 * Verifies a JWT and returns the decoded payload
 * @param {string} token
 * @returns {{ id: string, email: string, role: string, orgId: string|null }}
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

module.exports = { signToken, verifyToken }
