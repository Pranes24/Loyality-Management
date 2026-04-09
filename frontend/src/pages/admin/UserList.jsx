// Admin user list — avatar initials with hashed color, sortable, paginated
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, ArrowUpDown, ChevronRight, UserX } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api         from '../../lib/api'

function fmtRs(n)      { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function fmtDate(d)    { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }
function maskMobile(m) { return m ? m.slice(0, 3) + '•••' + m.slice(-3) : '—' }

const SORTS = [
  { value: 'registered_at', label: 'Joined Date'    },
  { value: 'total_earned',  label: 'Total Earned'   },
  { value: 'total_scans',   label: 'Total Scans'    },
  { value: 'wallet_balance',label: 'Wallet Balance' },
  { value: 'last_scan_at',  label: 'Last Active'    },
]

const AVATAR_PALETTES = [
  { bg: 'rgba(245,158,11,0.2)',  text: '#f59e0b' },
  { bg: 'rgba(34,211,238,0.15)', text: '#22d3ee' },
  { bg: 'rgba(167,139,250,0.2)', text: '#a78bfa' },
  { bg: 'rgba(52,211,153,0.2)',  text: '#34d399' },
  { bg: 'rgba(251,146,60,0.2)',  text: '#fb923c' },
  { bg: 'rgba(244,114,182,0.2)', text: '#f472b6' },
]
function avatarPalette(str) {
  let h = 0
  for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length]
}

export default function UserList() {
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [search,  setSearch]  = useState('')
  const [sortBy,  setSortBy]  = useState('registered_at')
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300)
    return () => clearTimeout(t)
  }, [search, sortBy, page])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sortBy, page, limit: 20 })
      if (search) params.set('search', search)
      const res = await api.get(`/users/list?${params}`)
      setUsers(res.users || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">People</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">Users</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-barlow font-black gradient-text">{total.toLocaleString()}</p>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Registered</p>
        </div>
      </div>

      {/* Controls */}
      <div className="float-in-1 flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by mobile or name…"
            className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                       rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none input-focus transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1c2d42] rounded-xl px-3">
          <ArrowUpDown size={12} className="text-slate-500 flex-shrink-0" />
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}
            className="bg-transparent text-slate-300 text-sm py-2.5 focus:outline-none cursor-pointer">
            {SORTS.map(s => <option key={s.value} value={s.value} className="bg-[#111827]">{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="float-in-2 md:hidden space-y-2 mb-4">
        {loading
          ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111827] border border-[#1c2d42] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="shimmer-bg w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="shimmer-bg h-3 w-24 rounded" />
                    <div className="shimmer-bg h-2 w-16 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array(3).fill(0).map((__, j) => <div key={j} className="shimmer-bg h-8 rounded" />)}
                </div>
              </div>
            ))
          : users.length === 0
          ? (
            <div className="bg-[#111827] border border-[#1c2d42] rounded-xl py-12 text-center">
              <UserX size={22} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No users found</p>
            </div>
          )
          : users.map(u => {
              const name    = u.name || u.mobile || '?'
              const palette = avatarPalette(name)
              return (
                <Link key={u.id} to={`/admin/users/${u.id}`}
                  className="block bg-[#111827] border border-[#1c2d42] rounded-xl p-4 hover:border-[#2a3f5a] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-barlow font-black flex-shrink-0"
                         style={{ background: palette.bg, color: palette.text }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">
                        {u.name || <span className="text-slate-500 italic text-xs">Unnamed</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">{maskMobile(u.mobile)}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0c1422] rounded-lg p-2">
                      <p className="text-sm font-barlow font-bold text-white">{u.total_scans}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">Scans</p>
                    </div>
                    <div className="bg-[#0c1422] rounded-lg p-2">
                      <p className="text-xs font-barlow font-bold text-amber-400">{fmtRs(u.total_earned)}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">Earned</p>
                    </div>
                    <div className="bg-[#0c1422] rounded-lg p-2">
                      <p className="text-xs font-barlow font-bold text-cyan-400">{fmtRs(u.wallet_balance)}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">Wallet</p>
                    </div>
                  </div>
                </Link>
              )
            })
        }
      </div>

      {/* Desktop Table */}
      <div className="float-in-2 hidden md:block bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1c2d42]"
                  style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
                {['User', 'Scans', 'Redeemed', 'Earned', 'Wallet', 'Joined', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2d42]">
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="shimmer-bg w-8 h-8 rounded-full flex-shrink-0" />
                          <div className="space-y-1.5">
                            <div className="shimmer-bg h-3 w-24 rounded" />
                            <div className="shimmer-bg h-2 w-16 rounded" />
                          </div>
                        </div>
                      </td>
                      {Array(5).fill(0).map((__, j) => (
                        <td key={j} className="px-5 py-3.5"><div className="shimmer-bg h-3 w-16 rounded" /></td>
                      ))}
                      <td className="px-5 py-3.5"><div className="shimmer-bg h-5 w-5 rounded" /></td>
                    </tr>
                  ))
                : users.length === 0
                ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-3">
                      <UserX size={22} className="text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No users found</p>
                    {search && <p className="text-xs text-slate-600 mt-1 font-mono">Try a different search term</p>}
                  </td></tr>
                )
                : users.map(u => {
                    const name    = u.name || u.mobile || '?'
                    const palette = avatarPalette(name)
                    return (
                      <tr key={u.id} className="table-row-hover group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-barlow font-black flex-shrink-0"
                                 style={{ background: palette.bg, color: palette.text }}>
                              {name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium group-hover:text-amber-400 transition-colors">
                                {u.name || <span className="text-slate-500 italic text-xs">Unnamed</span>}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">{maskMobile(u.mobile)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-barlow font-bold text-white">{u.total_scans}</td>
                        <td className="px-5 py-3.5 font-barlow font-bold text-green-400">{u.total_redeemed}</td>
                        <td className="px-5 py-3.5 font-barlow font-bold text-amber-400">{fmtRs(u.total_earned)}</td>
                        <td className="px-5 py-3.5 font-barlow font-bold text-cyan-400">{fmtRs(u.wallet_balance)}</td>
                        <td className="px-5 py-3.5 text-[11px] text-slate-500 font-mono">{fmtDate(u.registered_at)}</td>
                        <td className="px-5 py-3.5">
                          <Link to={`/admin/users/${u.id}`}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42]">
            <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages} · {total} users</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">
                Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1 py-3">
          <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300">Next</button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
