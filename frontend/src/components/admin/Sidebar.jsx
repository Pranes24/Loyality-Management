// Admin sidebar navigation — dark industrial with amber glow accents
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PackagePlus, Layers, Users,
  Wallet, Menu, X, QrCode, Zap
} from 'lucide-react'

const NAV = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    end: true  },
  { to: '/admin/create-batch', icon: PackagePlus,     label: 'Create Batch', end: true  },
  { to: '/admin/batch',        icon: Layers,          label: 'All Batches',  end: false },
  { to: '/admin/users',        icon: Users,           label: 'Users',        end: false },
  { to: '/admin/wallet',       icon: Wallet,          label: 'Wallet',       end: false },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#111827] border border-[#1c2d42] text-slate-400 hover:text-amber-400 transition-colors shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-[220px] flex flex-col
        bg-[#0c1422] border-r border-[#1c2d42]
        transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 border-b border-[#1c2d42]">
          <div className="flex items-center gap-3">
            {/* Hex logo mark */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg"
                   style={{ boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}>
                <QrCode size={17} className="text-black" strokeWidth={2.5} />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400"
                    style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-barlow font-black text-white text-[15px] tracking-widest uppercase leading-none">
                LoyaltyQR
              </p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.15em] mt-0.5">
                Admin Console
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600">Navigation</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto admin-scroll pb-4">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'nav-active-item text-amber-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-500 group-hover:text-slate-300 group-hover:bg-white/5'
                  }`}>
                    <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="flex-1 font-barlow font-semibold tracking-wide text-[13px] uppercase">
                    {label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"
                          style={{ boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1c2d42]">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-amber-500/60" />
            <p className="text-[10px] text-slate-600 font-mono">v1.0.0 · POC Build</p>
          </div>
        </div>
      </aside>
    </>
  )
}
