// Batch detail — header with progress ring, QR table with status filter
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Zap, Filter, QrCode, MoreHorizontal, PauseCircle, PlayCircle } from 'lucide-react'
import AdminLayout  from '../../components/admin/AdminLayout'
import StatusBadge  from '../../components/admin/StatusBadge'
import api          from '../../lib/api'

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }
function fmtRs(n)   { return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—' }

const QR_STATUSES = ['', 'generated', 'funded', 'scanning', 'redeemed', 'wallet_credited', 'pending_reason', 'expired']

function ProgressRing({ value = 0, max = 100, size = 72, stroke = 6, color = '#f59e0b' }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1c2d42" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  )
}

export default function BatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [batch,     setBatch]    = useState(null)
  const [qrs,       setQrs]      = useState([])
  const [total,     setTotal]    = useState(0)
  const [page,      setPage]     = useState(1)
  const [filter,    setFilter]   = useState('')
  const [loading,   setLoading]  = useState(true)
  const [pausing,   setPausing]  = useState(false)

  useEffect(() => { fetchBatch() }, [id])
  useEffect(() => { fetchQRs() },  [id, filter, page])

  async function fetchBatch() {
    try { setBatch(await api.get(`/batch/${id}`)) }
    catch { navigate('/admin/batch') }
  }

  async function fetchQRs() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page, limit: 50 })
      if (filter) p.set('status', filter)
      const res = await api.get(`/batch/${id}/qrcodes?${p}`)
      setQrs(res.qrCodes || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  async function handleTogglePause() {
    const newStatus = batch.status === 'paused' ? 'funded' : 'paused'
    setPausing(true)
    try { await api.patch(`/batch/${id}/status`, { status: newStatus }); fetchBatch() }
    finally { setPausing(false) }
  }

  if (!batch) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    </AdminLayout>
  )

  const redeemed   = batch.redeemed_count || 0
  const wallet     = batch.wallet_count   || 0
  const totalQrs   = batch.total_qrs || 500
  const usedQrs    = redeemed + wallet
  const totalPages = Math.ceil(total / 50)
  const usagePct   = Math.round((usedQrs / totalQrs) * 100)

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 float-in">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/admin/batch')}
            className="p-2 mt-1 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">{batch.batch_code}</span>
              <StatusBadge status={batch.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-barlow font-black text-white leading-none">{batch.name}</h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">{batch.product_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {batch.status === 'draft' && (
            <Link to={`/admin/batch/${id}/fund`}
              className="btn-press flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-barlow font-bold uppercase tracking-wide text-black hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}>
              <Zap size={14} strokeWidth={2.5} /> Fund Batch
            </Link>
          )}
          {['funded', 'paused'].includes(batch.status) && (
            <button onClick={handleTogglePause} disabled={pausing}
              className="flex items-center gap-2 px-4 py-2 border border-[#1c2d42] text-slate-300 hover:text-white hover:border-[#2a3f5a] text-sm font-barlow font-semibold uppercase tracking-wide rounded-xl transition-all disabled:opacity-50">
              {batch.status === 'paused'
                ? <><PlayCircle size={14} /> Reactivate</>
                : <><PauseCircle size={14} /> Pause</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="float-in-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {/* Progress ring */}
        <div className="col-span-2 sm:col-span-1 bg-[#111827] border border-[#1c2d42] rounded-2xl p-4 flex items-center gap-4 hover:border-[#2a3f5a] transition-colors">
          <div className="relative flex-shrink-0">
            <ProgressRing value={usedQrs} max={totalQrs} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[11px] font-barlow font-black ${usagePct > 80 ? 'text-amber-400' : 'text-slate-300'}`}>
                {usagePct}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Usage</p>
            <p className="text-lg font-barlow font-black text-white mt-0.5">
              {usedQrs}<span className="text-slate-500 font-normal text-sm">/{totalQrs}</span>
            </p>
          </div>
        </div>

        {[
          { label: 'Total Amount', value: fmtRs(batch.total_amount),  cls: 'text-amber-400' },
          { label: 'Expires',      value: fmtDate(batch.expires_at),  cls: 'text-white' },
          { label: 'Created',      value: fmtDate(batch.created_at),  cls: 'text-white' },
          { label: 'Dist. Mode',   value: batch.dist_mode || 'N/A',   cls: 'text-white capitalize' },
          {
            label: 'QR Range',
            value: batch.qr_number_start
              ? `${Number(batch.qr_number_start).toLocaleString('en-IN')} – ${Number(batch.qr_number_end).toLocaleString('en-IN')}`
              : '—',
            cls: 'text-cyan-400',
          },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-4 hover:border-[#2a3f5a] transition-colors">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
            <p className={`text-base font-barlow font-black ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="float-in-2 grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Unused',   value: batch.unused_count,    cls: 'text-slate-300',  bar: 'bg-slate-500' },
          { label: 'Redeemed', value: batch.redeemed_count,  cls: 'text-green-400',  bar: 'bg-green-500' },
          { label: 'Wallet',   value: batch.wallet_count,    cls: 'text-cyan-400',   bar: 'bg-cyan-500'  },
          { label: 'Pending',  value: batch.pending_count,   cls: 'text-orange-400', bar: 'bg-orange-500'},
          { label: 'Expired',  value: batch.expired_count,   cls: 'text-red-400',    bar: 'bg-red-500'   },
          { label: 'Total',    value: batch.total_qrs || 500,cls: 'text-amber-400',  bar: 'bg-amber-500' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-[#111827] border border-[#1c2d42] rounded-xl p-3 text-center hover:border-[#2a3f5a] transition-colors">
            <p className={`text-xl font-barlow font-black ${cls}`}>{value || 0}</p>
            <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-slate-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* QR table */}
      <div className="float-in-3 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42]"
             style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <QrCode size={13} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">QR Codes</h2>
            <span className="text-[11px] text-slate-500 font-mono bg-[#1c2d42] px-2 py-0.5 rounded-full">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-slate-500" />
            <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}
              className="bg-[#0c1422] border border-[#1c2d42] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
              {QR_STATUSES.map(s => <option key={s} value={s} className="bg-[#0c1422]">{s || 'All statuses'}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1c2d42]">
                {['No.', 'QR ID', 'Amount', 'Status', 'Scanned At', 'User', 'Action / Note'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2d42]">
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-5 py-3"><div className="shimmer-bg h-3 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                : qrs.length === 0
                ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-3">
                      <MoreHorizontal size={20} className="text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500">No QR codes match this filter</p>
                  </td></tr>
                )
                : qrs.map(q => (
                    <tr key={q.id} className="table-row-hover">
                      <td className="px-5 py-3 font-mono text-[11px] text-cyan-400 font-bold whitespace-nowrap">
                        {q.qr_number ? `No. ${String(q.qr_number).padStart(6, '0')}` : '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{q.id.slice(0, 8)}…</td>
                      <td className="px-5 py-3 font-barlow font-black text-amber-400">
                        {q.amount != null ? `₹${q.amount}` : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">
                        {q.scanned_at ? new Date(q.scanned_at).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-300 font-mono">{q.user_mobile || '—'}</td>
                      <td className="px-5 py-3 text-[11px] text-slate-500 max-w-[160px] truncate">
                        {q.reason || q.txn_id || '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42]">
            <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages}</span>
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
    </AdminLayout>
  )
}
