// Super admin layout — sidebar + main content area
import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, Building2, LogOut, ChevronRight, ShieldCheck, Wallet, Menu, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { to: '/super',             label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { to: '/super/orgs',        label: 'Organizations', icon: Building2 },
  { to: '/super/withdrawals', label: 'Withdrawals',   icon: Wallet },
]

export default function SuperLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed,    setCollapsed]    = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const SidebarContent = ({ onNav }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1c2d42]">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
            <Zap size={16} strokeWidth={2.5} className="text-black" />
          </div>
        </div>
        {!collapsed && (
          <div>
            <p className="text-[11px] font-barlow font-black text-white uppercase tracking-wider leading-none">Loyalty</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck size={9} className="text-amber-400" />
              <p className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <NavLink key={to} to={to} end={exact}
            onClick={onNav}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden
               ${isActive ? 'nav-active-item text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2d42]/50'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
                )}
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-barlow font-bold uppercase tracking-wide">{label}</span>}
                {!collapsed && (
                  <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-4 border-t border-[#1c2d42]">
          <p className="text-[10px] font-mono text-slate-600 truncate mb-2">{user?.email}</p>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full px-1">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="flex h-screen bg-[#070b12] admin-grid-bg overflow-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-[#1c2d42] transition-transform duration-300 lg:hidden
                         ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
             style={{ background: 'linear-gradient(to bottom, #0c1422, #070b12)' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1c2d42]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              <Zap size={16} strokeWidth={2.5} className="text-black" />
            </div>
            <div>
              <p className="text-[11px] font-barlow font-black text-white uppercase tracking-wider leading-none">Loyalty</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={9} className="text-amber-400" />
                <p className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest">Super Admin</p>
              </div>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2d42]">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative overflow-hidden
                 ${isActive ? 'nav-active-item text-white' : 'text-slate-400 hover:text-white hover:bg-[#1c2d42]/50'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />}
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="text-sm font-barlow font-bold uppercase tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#1c2d42]">
          <p className="text-[10px] font-mono text-slate-600 truncate mb-2">{user?.email}</p>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full px-1">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 border-r border-[#1c2d42] transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
             style={{ background: 'linear-gradient(to bottom, #0c1422, #070b12)' }}>
        <SidebarContent onNav={() => {}} />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1c2d42] sticky top-0 z-30"
             style={{ background: '#070b12' }}>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              <Zap size={12} strokeWidth={2.5} className="text-black" />
            </div>
            <span className="text-sm font-barlow font-black text-white uppercase tracking-wider">Super Admin</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
