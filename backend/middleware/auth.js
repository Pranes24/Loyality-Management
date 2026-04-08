// Auth middleware — JWT verification, role guards
const { verifyToken } = require('../lib/jwt')

/**
 * Verifies JWT from Authorization header, sets req.user
 * req.user = { id, email, role, orgId }
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Requires the caller to be an org_admin, sets req.orgId
 */
function requireOrgAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'org_admin') {
      return res.status(403).json({ error: 'Org admin access required' })
    }
    req.orgId = req.user.orgId
    next()
  })
}

/**
 * Requires the caller to be a super_admin
 */
function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' })
    }
    next()
  })
}

module.exports = { requireAuth, requireOrgAdmin, requireSuperAdmin }
