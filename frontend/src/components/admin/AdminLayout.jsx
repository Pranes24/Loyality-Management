// Admin layout — sidebar + scrollable content with dot-grid texture and vignettes
import React from 'react'
import Sidebar from './Sidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto admin-scroll admin-grid-bg relative">
        {/* Vignette top */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-28 z-10"
             style={{ background: 'linear-gradient(to bottom, rgba(7,11,18,0.7), transparent)' }} />
        {/* Vignette right edge */}
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-16 z-10"
             style={{ background: 'linear-gradient(to left, rgba(7,11,18,0.25), transparent)' }} />
        {/* Ambient orb top-left */}
        <div className="pointer-events-none absolute top-0 left-0 w-96 h-96 orb-pulse"
             style={{ background: 'radial-gradient(circle at top left, rgba(245,158,11,0.04), transparent 60%)', zIndex: 1 }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pl-10 z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
