// Root router — auth, super admin, org admin panel, and user redemption flow
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import LoginPage       from './pages/auth/LoginPage'
import RegisterOrgPage from './pages/auth/RegisterOrgPage'

import SuperDashboard from './pages/super/SuperDashboard'
import OrgList        from './pages/super/OrgList'

import Dashboard    from './pages/admin/Dashboard'
import CreateBatch  from './pages/admin/CreateBatch'
import BatchList    from './pages/admin/BatchList'
import BatchDetail  from './pages/admin/BatchDetail'
import FundBatch    from './pages/admin/FundBatch'
import UserList     from './pages/admin/UserList'
import UserDetail   from './pages/admin/UserDetail'
import WalletPage   from './pages/admin/WalletPage'
import RedeemFlow   from './pages/user/RedeemFlow'

// Redirects unauthenticated users to /login
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Redirects non-super-admins away
function RequireSuperAdmin({ children }) {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperAdmin)    return <Navigate to="/admin" replace />
  return children
}

// Redirects non-org-admins away
function RequireOrgAdmin({ children }) {
  const { isAuthenticated, isOrgAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isOrgAdmin)      return <Navigate to="/super" replace />
  return children
}

// Redirects already-logged-in users to their dashboard
function GuestOnly({ children }) {
  const { isAuthenticated, isSuperAdmin } = useAuth()
  if (!isAuthenticated) return children
  return <Navigate to={isSuperAdmin ? '/super' : '/admin'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth (public, guest-only) */}
      <Route path="/login"    element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterOrgPage /></GuestOnly>} />

      {/* Super admin */}
      <Route path="/super"       element={<RequireSuperAdmin><SuperDashboard /></RequireSuperAdmin>} />
      <Route path="/super/orgs"  element={<RequireSuperAdmin><OrgList /></RequireSuperAdmin>} />

      {/* Org admin panel */}
      <Route path="/admin"                element={<RequireOrgAdmin><Dashboard /></RequireOrgAdmin>} />
      <Route path="/admin/create-batch"   element={<RequireOrgAdmin><CreateBatch /></RequireOrgAdmin>} />
      <Route path="/admin/batch"          element={<RequireOrgAdmin><BatchList /></RequireOrgAdmin>} />
      <Route path="/admin/batch/:id"      element={<RequireOrgAdmin><BatchDetail /></RequireOrgAdmin>} />
      <Route path="/admin/batch/:id/fund" element={<RequireOrgAdmin><FundBatch /></RequireOrgAdmin>} />
      <Route path="/admin/users"          element={<RequireOrgAdmin><UserList /></RequireOrgAdmin>} />
      <Route path="/admin/users/:id"      element={<RequireOrgAdmin><UserDetail /></RequireOrgAdmin>} />
      <Route path="/admin/wallet"         element={<RequireOrgAdmin><WalletPage /></RequireOrgAdmin>} />

      {/* Public — consumer redemption flow (no auth) */}
      <Route path="/redeem/:qrId" element={<RedeemFlow />} />
      <Route path="/redeem"       element={<RedeemFlow />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
