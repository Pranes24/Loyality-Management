// Admin sidebar navigation — dark command center with amber glow accents
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PackagePlus, Layers, Users,
  Wallet, Menu, X, QrCode, Zap, ChevronRight
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard',    end: true  },
      { to: '/admin/batch',        icon: Layers,          label: 'All Batches',  end: false },
      { to: '/admin/create-batch', icon: PackagePlus,     label: 'Create Batch', end: true  },
    ]
  },
  {
    label: 'People & Finance',
    items: [
      { to: '/admin/users',  icon: Users,  label: 'Users',  end: false },
      { to: '/admin/wallet', icon: Wallet, label: 'Wallet', end: false },
    ]
  }
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
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-[220px] flex flex-col
        border-r border-[#1c2d42]
        transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `} style={{ background: 'linear-gradient(to bottom, #0d1828, #0c1422)' }}>

        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 border-b border-[#1c2d42]/80 relative overflow-hidden">
          {/* Ambient glow behind logo */}
          <div className="absolute -top-6 -left-4 w-24 h-24 rounded-full opacity-20 orb-pulse"
               style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
          <div className="flex items-center gap-3 relative">
            {/* Logo mark */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{
                     background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                     boxShadow: '0 0 20px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                   }}>
                <QrCode size={17} className="text-black" strokeWidth={2.5} />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 live-dot"
                    style={{ boxShadow: '0 0 8px rgba(74,222,128,0.9)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-barlow font-black text-white text-[15px] tracking-[0.12em] uppercase leading-none">
                LoyaltyQR
              </p>
              <p className="text-[9px] text-amber-500/60 font-mono uppercase tracking-[0.2em] mt-0.5">
                Admin Console
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 overflow-y-auto admin-scroll pt-3 pb-4 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 pb-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-slate-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                        isActive
                          ? 'nav-active-item text-amber-400'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Hover shimmer */}
                        {!isActive && (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                               style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.02), transparent)' }} />
                        )}
                        <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-slate-500 group-hover:text-slate-300 group-hover:bg-white/5'
                        }`}>
                          <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className="flex-1 font-barlow font-bold tracking-wide text-[12px] uppercase">
                          {label}
                        </span>
                        {isActive
                          ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                                  style={{ boxShadow: '0 0 6px rgba(245,158,11,0.9)' }} />
                          : <ChevronRight size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        }
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1c2d42]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px rgba(74,222,128,0.8)' }} />
            <p className="text-[10px] text-slate-600 font-mono">v1.0 · POC Build</p>
            <Zap size={10} className="text-amber-500/40 ml-auto" />
          </div>
        </div>
      </aside>
    </>
  )
}
