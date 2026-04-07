// Root router — admin panel and user redemption flow
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard    from './pages/admin/Dashboard'
import CreateBatch  from './pages/admin/CreateBatch'
import BatchDetail  from './pages/admin/BatchDetail'
import FundBatch    from './pages/admin/FundBatch'
import UserList     from './pages/admin/UserList'
import UserDetail   from './pages/admin/UserDetail'
import WalletPage   from './pages/admin/WalletPage'
import RedeemFlow   from './pages/user/RedeemFlow'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<Navigate to="/admin" replace />} />
        <Route path="/admin"                  element={<Dashboard />} />
        <Route path="/admin/create-batch"     element={<CreateBatch />} />
        <Route path="/admin/batch/:id"        element={<BatchDetail />} />
        <Route path="/admin/batch/:id/fund"   element={<FundBatch />} />
        <Route path="/admin/users"            element={<UserList />} />
        <Route path="/admin/users/:id"        element={<UserDetail />} />
        <Route path="/admin/wallet"           element={<WalletPage />} />
        <Route path="/redeem/:qrId"           element={<RedeemFlow />} />
        <Route path="/redeem"                 element={<RedeemFlow />} />
      </Routes>
    </BrowserRouter>
  )
}
