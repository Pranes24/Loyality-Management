// Super admin — view all batches across orgs, download with design or plain QR
import React, { useEffect, useState } from 'react'
import { Layers, Search, Download, QrCode, Palette } from 'lucide-react'
import SuperLayout from '../../components/super/SuperLayout'
import api from '../../lib/api'

const STATUS_COLORS = {
  draft:          { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/20'  },
  funded:         { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20'  },
  paused:         { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  completed:      { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20'  },
  partially_used: { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20'   },
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      {status}
    </span>
  )
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function fmtRs(n)   { return n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—' }

async function triggerDownload(batchId, batchCode, mode) {
  const token = localStorage.getItem('loyalty_token')
  const res   = await fetch(`/api/super/batches/${batchId}/export/${mode}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${batchCode}-${mode}.zip`; a.click()
  URL.revokeObjectURL(url)
}

function DownloadCell({ batch }) {
  const [loading, setLoading] = useState(null) // 'designed' | 'plain' | null

  async function handleDl(mode) {
    setLoading(mode)
    try { await triggerDownload(batch.id, batch.batch_code, mode) }
    catch { alert('Download failed. Please try again.') }
    finally { setLoading(null) }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleDl('designed')}
        disabled={!!loading}
        title="Download sticker ZIP (with org design)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide
                   border border-amber-500/25 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
      >
        {loading === 'designed'
          ? <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          : <Palette size={11} />
        }
        With Design
      </button>
      <button
        onClick={() => handleDl('plain')}
        disabled={!!loading}
        title="Download plain QR PNGs only"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide
                   border border-[#1c2d42] text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all disabled:opacity-40"
      >
        {loading === 'plain'
          ? <div className="w-3 h-3 border border-slate-400/40 border-t-slate-400 rounded-full animate-spin" />
          : <QrCode size={11} />
        }
        Plain QR
      </button>
    </div>
  )
}

export default function SuperBatchList() {
  const [batches,  setBatches]  = useState([])
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchBatches() }, [search, page])

  async function fetchBatches() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page, limit: 30 })
      if (search) p.set('search', search)
      const res = await api.get(`/super/batches?${p}`)
      setBatches(res.batches || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <SuperLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Print & Export</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">All Batches</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Download QR stickers for any org batch in two formats</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-barlow font-black text-white">{total.toLocaleString('en-IN')}</p>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Total Batches</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 float-in-1">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search batch or org…"
            className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                       rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden float-in-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1c2d42]">
                {['Batch', 'Organisation', 'Status', 'QRs', 'Amount', 'Created', 'Download'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-mono text-sm">
                    No batches found
                  </td>
                </tr>
              ) : batches.map(b => (
                <tr key={b.id} className="border-b border-[#1c2d42]/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-mono text-amber-400/80">{b.batch_code}</p>
                      <p className="text-white font-barlow font-bold text-[13px] leading-tight mt-0.5">{b.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[11px] font-mono text-cyan-400">{b.org_code}</p>
                      <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{b.org_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                  <td className="px-4 py-3">
                    <span className="text-white font-barlow font-bold">{(b.total_qrs || 0).toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-amber-400 font-barlow font-bold text-[13px]">{fmtRs(b.total_amount)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 font-mono text-[11px]">{fmtDate(b.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DownloadCell batch={b} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1c2d42]">
            <p className="text-[11px] font-mono text-slate-500">
              Page {page} of {totalPages} · {total} batches
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[#1c2d42] text-slate-400
                           hover:text-white hover:border-[#2a3f5a] disabled:opacity-30 transition-all">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[#1c2d42] text-slate-400
                           hover:text-white hover:border-[#2a3f5a] disabled:opacity-30 transition-all">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 float-in">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 border border-amber-500/25">
            <Palette size={10} className="text-amber-400" />
          </div>
          <p className="text-[10px] font-mono text-slate-500">With Design — sticker SVGs + QR PNGs using org brand colours</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1c2d42]">
            <QrCode size={10} className="text-slate-400" />
          </div>
          <p className="text-[10px] font-mono text-slate-500">Plain QR — bare QR code PNGs only, no sticker design</p>
        </div>
      </div>
    </SuperLayout>
  )
}
