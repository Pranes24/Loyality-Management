// Modal showing QR allocations (batches) for one org — view, create, and download
import React, { useEffect, useState } from 'react'
import { X, PackagePlus, Palette, QrCode, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import api from '../../lib/api'

const STATUS_COLORS = {
  draft:    { text: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20'  },
  funded:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  paused:   { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  completed:{ text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${c.text} ${c.bg} ${c.border}`}>
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

function BatchRow({ batch }) {
  const [dlLoading, setDlLoading] = useState(null)

  async function handleDl(mode) {
    setDlLoading(mode)
    try { await triggerDownload(batch.id, batch.batch_code, mode) }
    catch { alert('Download failed. Please try again.') }
    finally { setDlLoading(null) }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c2d42]/60 hover:bg-white/[0.02] transition-colors">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-amber-400/80">{batch.batch_code}</span>
          <StatusPill status={batch.status} />
        </div>
        <p className="text-[13px] font-barlow font-bold text-white truncate">{batch.name}</p>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{batch.product_name} · {fmtRs(batch.total_amount)} · {(batch.total_qrs || 0).toLocaleString('en-IN')} QRs · {fmtDate(batch.created_at)}</p>
      </div>

      {/* Download buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => handleDl('designed')}
          disabled={!!dlLoading}
          title="Download sticker ZIP with org design"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide
                     border border-amber-500/25 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
        >
          {dlLoading === 'designed'
            ? <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            : <Palette size={11} />
          }
          With Design
        </button>
        <button
          onClick={() => handleDl('plain')}
          disabled={!!dlLoading}
          title="Download plain QR PNGs only"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide
                     border border-[#1c2d42] text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all disabled:opacity-40"
        >
          {dlLoading === 'plain'
            ? <div className="w-3 h-3 border border-slate-400/40 border-t-slate-400 rounded-full animate-spin" />
            : <QrCode size={11} />
          }
          Plain QR
        </button>
      </div>
    </div>
  )
}

function CreateBatchForm({ orgId, onCreated, onCancel }) {
  const [form, setForm]     = useState({ name: '', product_name: '', qr_count: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())         return setError('Batch name is required')
    if (!form.product_name.trim()) return setError('Product name is required')
    setLoading(true); setError('')
    try {
      await api.post(`/super/orgs/${orgId}/batches`, {
        name: form.name.trim(),
        product_name: form.product_name.trim(),
        qr_count: parseInt(form.qr_count) || 500,
      })
      onCreated()
    } catch (err) {
      setError(err.error || 'Failed to create batch')
    } finally { setLoading(false) }
  }

  return (
    <div className="px-4 py-4 bg-[#0c1422] border-b border-[#1c2d42]">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">New Batch</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">Batch Name</label>
            <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }}
              placeholder="e.g. Diwali 2025"
              className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/40 transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">Product</label>
            <input value={form.product_name} onChange={e => { setForm(f => ({ ...f, product_name: e.target.value })); setError('') }}
              placeholder="e.g. Cement Bag"
              className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/40 transition-all" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">QR Count <span className="text-slate-600">(default 500)</span></label>
          <input type="number" min={1} value={form.qr_count} onChange={e => { setForm(f => ({ ...f, qr_count: e.target.value })); setError('') }}
            placeholder="500"
            className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                       rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/40 transition-all max-w-[140px]" />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
            <AlertCircle size={12} className="flex-shrink-0" /> {error}
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-barlow font-black uppercase tracking-wide text-black disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
            {loading ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <CheckCircle size={13} />}
            {loading ? 'Creating…' : 'Create Batch'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white border border-[#1c2d42] hover:border-[#2a3f5a] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function OrgBatchesModal({ org, onClose }) {
  const [batches,     setBatches]     = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)
  const [showCreate,  setShowCreate]  = useState(false)

  useEffect(() => { fetchBatches() }, [page])

  async function fetchBatches() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page, limit: 10 })
      const res = await api.get(`/super/orgs/${org.id}/batches?${p}`)
      setBatches(res.batches || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  const totalPages = Math.ceil(total / 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-[#111827] border border-[#1c2d42] rounded-2xl flex flex-col max-h-[85vh] float-in"
           style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-amber-400/80">{org.org_code}</span>
              <ChevronRight size={10} className="text-slate-600" />
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500">QR Allocations</span>
            </div>
            <h2 className="text-lg font-barlow font-black text-white uppercase tracking-wide">{org.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-barlow font-bold uppercase tracking-wide text-black transition-all"
              style={{ background: showCreate ? '#374151' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                       color: showCreate ? '#9ca3af' : '#000' }}>
              <PackagePlus size={13} />
              {showCreate ? 'Cancel' : 'New Batch'}
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Create form (inline) */}
        {showCreate && (
          <CreateBatchForm
            orgId={org.id}
            onCreated={() => { setShowCreate(false); fetchBatches() }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Batch list */}
        <div className="flex-1 overflow-y-auto admin-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1c2d42] flex items-center justify-center mb-3">
                <QrCode size={20} className="text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 font-mono">No batches yet for this org</p>
              <p className="text-[11px] text-slate-600 font-mono mt-1">Click "New Batch" to create the first allocation</p>
            </div>
          ) : (
            batches.map(b => <BatchRow key={b.id} batch={b} />)
          )}
        </div>

        {/* Pagination + legend */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="p-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                <Palette size={9} className="text-amber-400" />
              </div>
              <p className="text-[9px] font-mono text-slate-600">With Design = sticker SVGs</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-0.5 rounded bg-[#1c2d42]">
                <QrCode size={9} className="text-slate-500" />
              </div>
              <p className="text-[9px] font-mono text-slate-600">Plain QR = PNG only</p>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-[10px] font-mono rounded-lg border border-[#1c2d42] text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                ← Prev
              </button>
              <span className="text-[10px] font-mono text-slate-500 self-center">
                {page}/{totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-[10px] font-mono rounded-lg border border-[#1c2d42] text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
