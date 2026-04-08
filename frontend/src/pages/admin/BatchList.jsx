// All batches — searchable, filterable card grid with status, amounts, usage
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Search, Plus, ChevronRight, Zap, SlidersHorizontal } from 'lucide-react'
import AdminLayout  from '../../components/admin/AdminLayout'
import StatusBadge  from '../../components/admin/StatusBadge'
import api          from '../../lib/api'

function fmtRs(n)   { return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }

const STATUSES = ['', 'draft', 'funded', 'paused', 'exhausted', 'expired']

const AVATAR_COLORS = [
  'rgba(245,158,11,0.18)', 'rgba(34,211,238,0.14)',
  'rgba(167,139,250,0.16)', 'rgba(52,211,153,0.14)',
  'rgba(251,146,60,0.16)',
]
function batchColor(str) {
  let h = 0
  for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function BatchList() {
  const [batches, setBatches] = useState([])
  const [total,   setTotal]   = useState(0)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => fetchBatches(), 250)
    return () => clearTimeout(t)
  }, [search, status, page])

  async function fetchBatches() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const res = await api.get(`/batch/list?${params}`)
      setBatches(res.batches || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Inventory</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">All Batches</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-barlow font-black gradient-text">{total}</p>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Total</p>
          </div>
          <Link
            to="/admin/create-batch"
            className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-black transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            New Batch
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="float-in-1 flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, code, product…"
            className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                       rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all input-focus
                       focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1c2d42] rounded-xl px-3">
          <SlidersHorizontal size={13} className="text-slate-500 flex-shrink-0" />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-transparent text-slate-300 text-sm py-2.5 focus:outline-none cursor-pointer"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-[#111827]">
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="shimmer-bg w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer-bg h-3.5 w-32 rounded" />
                  <div className="shimmer-bg h-2.5 w-20 rounded" />
                </div>
                <div className="shimmer-bg h-5 w-16 rounded-full" />
              </div>
              <div className="shimmer-bg h-1.5 w-full rounded-full" />
              <div className="flex justify-between pt-1">
                <div className="shimmer-bg h-3 w-16 rounded" />
                <div className="shimmer-bg h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl py-20 text-center float-in">
          <div className="w-16 h-16 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-4">
            <Layers size={28} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium text-sm">No batches found</p>
          {search
            ? <p className="text-slate-600 text-xs mt-1 font-mono">Try a different search term</p>
            : (
              <Link to="/admin/create-batch"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-sm font-barlow font-bold uppercase tracking-wide text-black btn-press"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}>
                <Plus size={14} /> Create your first batch
              </Link>
            )
          }
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 float-in-1">
          {batches.map(b => {
            const redeemed = parseInt(b.redeemed_count || 0)
            const wallet   = parseInt(b.wallet_count   || 0)
            const ttl      = b.qr_count || 500
            const used     = redeemed + wallet
            const usedPct  = Math.round((used / ttl) * 100)

            return (
              <Link
                key={b.id}
                to={`/admin/batch/${b.id}`}
                className="group bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 hover:border-amber-500/30 hover:-translate-y-0.5 transition-all duration-250 block relative overflow-hidden"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl"
                     style={{ background: 'radial-gradient(ellipse at top right, rgba(245,158,11,0.04), transparent 60%)' }} />

                {/* Top row */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-barlow font-black flex-shrink-0 relative"
                       style={{ background: batchColor(b.batch_code) }}>
                    {b.batch_code?.replace('BATCH-', '') || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">{b.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{b.product_name}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Progress bar */}
                {b.status !== 'draft' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                      <span>Usage</span>
                      <span className={usedPct > 80 ? 'text-amber-400' : ''}>{usedPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1c2d42] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bar-grow"
                        style={{
                          width: `${usedPct}%`,
                          background: usedPct > 80
                            ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                            : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1c2d42]">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Amount</p>
                      <p className="text-sm font-barlow font-black text-amber-400">{fmtRs(b.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Expires</p>
                      <p className="text-sm font-barlow font-bold text-slate-300">{fmtDate(b.expires_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.status === 'draft' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                        <Zap size={9} /> Fund
                      </span>
                    )}
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 float-in">
          <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages} · {total} total</span>
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
    </AdminLayout>
  )
}
