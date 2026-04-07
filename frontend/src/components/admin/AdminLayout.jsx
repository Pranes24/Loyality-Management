// Admin layout — sidebar + content area with grid texture
import React from 'react'
import Sidebar from './Sidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto admin-scroll admin-grid-bg relative">
        {/* Subtle vignette top */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-24"
             style={{ background: 'linear-gradient(to bottom, rgba(7,11,18,0.6), transparent)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pl-10">
          {children}
        </div>
      </main>
    </div>
  )
}
