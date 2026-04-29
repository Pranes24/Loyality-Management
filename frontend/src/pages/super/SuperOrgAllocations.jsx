// Super admin — QR pool management: generate QR codes for an org, track allocations, view org batches
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Layers, QrCode, Palette, AlertCircle, X,
  Download, Plus, ChevronLeft, ChevronRight, Package,
} from 'lucide-react'
import SuperLayout from '../../components/super/SuperLayout'
import api from '../../lib/api'

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

// ─── Pool stats card ──────────────────────────────────────────────────────────
function PoolStats({ stats, loading }) {
  const items = [
    { label: 'Available in Pool', value: stats.available,       color: 'text-emerald-400' },
    { label: 'In Batches',        value: stats.in_batches,      color: 'text-amber-400'   },
    { label: 'Total Generated',   value: stats.total_allocated, color: 'text-slate-200'   },
  ]
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-[#111827] border border-[#1c2d42] rounded-2xl px-5 py-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
          {loading
            ? <div className="shimmer-bg h-7 w-20 rounded mt-1" />
            : <p className={`text-2xl font-barlow font-black ${color}`}>
                {(value || 0).toLocaleString('en-IN')}
              </p>
          }
        </div>
      ))}
    </div>
  )
}

// Rough estimate: 3ms per code for plain, 7ms for designed (warm pool)
function estimateSecs(n, mode) {
  return Math.max(3, Math.round(n * (mode === 'plain' ? 0.003 : 0.007)))
}

// ─── Generate panel ───────────────────────────────────────────────────────────
function GeneratePanel({ orgId, onGenerated }) {
  const [count,    setCount]    = useState('')
  const [loading,  setLoading]  = useState(null)   // 'designed' | 'plain' | null
  const [phase,    setPhase]    = useState('')      // 'creating' | 'building' | 'downloading'
  const [error,    setError]    = useState('')

  async function handleGenerate(mode) {
    const n = parseInt(count)
    if (!n || n < 1)  { setError('Enter a valid count'); return }
    if (n > 50000)    { setError('Maximum 50,000 per generation'); return }
    setError(''); setLoading(mode); setPhase('creating')
    try {
      const res = await api.post(`/super/orgs/${orgId}/allocations`, { count: n })
      const allocId = res.allocation.id
      onGenerated()

      setPhase('building')
      const token  = localStorage.getItem('loyalty_token')
      const dlRes  = await fetch(
        `/api/super/orgs/${orgId}/allocations/${allocId}/export/${mode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!dlRes.ok) throw new Error('Export failed')

      setPhase('downloading')
      const blob = await dlRes.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `alloc-${res.allocation.serial_from}-to-${res.allocation.serial_to}-${mode}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setCount('')
    } catch (err) {
      setError(err.error || err.message || 'Failed to generate QR codes')
    } finally {
      setLoading(null); setPhase('')
    }
  }

  const n = parseInt(count) || 0
  const phaseLabels = {
    creating:    'Creating allocation…',
    building:    `Building ${n.toLocaleString('en-IN')} QR codes (~${estimateSecs(n, loading)}s)…`,
    downloading: 'Preparing download…',
  }

  return (
    <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl px-5 py-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Plus size={14} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Generate QR Codes</p>
          <p className="text-[10px] font-mono text-slate-500">Serial numbers continue from the last allocation · downloads start automatically</p>
        </div>
      </div>

      {/* Loading progress bar */}
      {loading && (
        <div className="mb-4 p-3 bg-[#0d1520] border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
            <p className="text-xs font-mono text-amber-300">{phaseLabels[phase] || '…'}</p>
          </div>
          <div className="h-1 bg-[#1c2d42] rounded-full overflow-hidden">
            <div className="h-full bg-amber-400/60 rounded-full animate-pulse" style={{ width: phase === 'downloading' ? '90%' : phase === 'building' ? '60%' : '20%', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-40">
          <label className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
            Number of QR Codes
          </label>
          <input
            type="number" min="1" max="50000"
            value={count}
            onChange={e => { setCount(e.target.value); setError('') }}
            placeholder="e.g. 10000"
            disabled={!!loading}
            className="w-full bg-[#0d1520] border border-[#1c2d42] text-white placeholder-slate-600
                       rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/40 transition-all disabled:opacity-50"
          />
        </div>

        <button
          onClick={() => handleGenerate('designed')}
          disabled={!!loading || !count}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                     bg-amber-500/15 border border-amber-500/30 text-amber-300
                     hover:bg-amber-500/25 transition-all disabled:opacity-40 whitespace-nowrap">
          {loading === 'designed'
            ? <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            : <Palette size={14} />}
          Generate + Download (With Design)
        </button>

        <button
          onClick={() => handleGenerate('plain')}
          disabled={!!loading || !count}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                     border border-[#1c2d42] text-slate-400
                     hover:text-white hover:bg-[#1c2d42] transition-all disabled:opacity-40 whitespace-nowrap">
          {loading === 'plain'
            ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
            : <QrCode size={14} />}
          Generate + Download (Plain QR)
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400 font-mono flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}

// ─── Allocation row ───────────────────────────────────────────────────────────
function AllocationRow({ alloc, orgId }) {
  const [dlLoading, setDlLoading] = useState(null)
  const [dlError,   setDlError]   = useState('')

  async function handleDl(mode) {
    setDlLoading(mode); setDlError('')
    try {
      const token = localStorage.getItem('loyalty_token')
      const res   = await fetch(
        `/api/super/orgs/${orgId}/allocations/${alloc.id}/export/${mode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `alloc-${alloc.serial_from}-to-${alloc.serial_to}-${mode}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch { setDlError('Download failed') }
    finally  { setDlLoading(null) }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-[#1c2d42] last:border-0 hover:bg-[#0d1520]/50 transition-colors">
      {/* Serial range */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-barlow font-bold text-white font-mono">
          #{String(alloc.serial_from).padStart(6, '0')} → #{String(alloc.serial_to).padStart(6, '0')}
        </p>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{fmtDate(alloc.created_at)}</p>
      </div>
      {/* Counts */}
      <div className="flex gap-4 text-[11px] font-mono">
        <span className="text-slate-400">Generated: <span className="text-white font-bold">{alloc.count.toLocaleString('en-IN')}</span></span>
        <span className="text-emerald-400">Available: <span className="font-bold">{alloc.available_count}</span></span>
        <span className="text-amber-400">Claimed: <span className="font-bold">{alloc.claimed_count}</span></span>
      </div>
      {/* Download buttons */}
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => handleDl('designed')} disabled={!!dlLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase
                     border border-amber-500/25 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40">
          {dlLoading === 'designed'
            ? <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            : <Palette size={10} />}
          Designed
        </button>
        <button onClick={() => handleDl('plain')} disabled={!!dlLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase
                     border border-[#1c2d42] text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all disabled:opacity-40">
          {dlLoading === 'plain'
            ? <div className="w-3 h-3 border border-slate-400/40 border-t-slate-400 rounded-full animate-spin" />
            : <QrCode size={10} />}
          Plain
        </button>
      </div>
      {dlError && <p className="w-full text-xs text-red-400 font-mono">{dlError}</p>}
    </div>
  )
}

// ─── Batch card (read-only) ───────────────────────────────────────────────────
const STATUS_COLORS = {
  draft:    { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/20',  dot: 'bg-slate-400'  },
  funded:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  dot: 'bg-amber-400'  },
  paused:   { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  exhausted:{ bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400'    },
  expired:  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400'    },
}
function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  )
}

function BatchRow({ batch }) {
  const total    = parseInt(batch.total_qrs || batch.qr_count || 0)
  const redeemed = parseInt(batch.redeemed_count || 0)
  const wallet   = parseInt(batch.wallet_count   || 0)
  const used     = redeemed + wallet
  const usedPct  = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-[#1c2d42] last:border-0 hover:bg-[#0d1520]/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{batch.name}</p>
          <StatusBadge status={batch.status} />
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{batch.batch_code} · {batch.product_name}</p>
      </div>
      <div className="flex gap-4 text-[11px] font-mono items-center">
        <span className="text-slate-400">QRs: <span className="text-white font-bold">{total.toLocaleString('en-IN')}</span></span>
        {batch.status !== 'draft' && (
          <span className="text-slate-400">Used: <span className={usedPct > 80 ? 'text-amber-400 font-bold' : 'text-white font-bold'}>{usedPct}%</span></span>
        )}
        <span className="text-slate-500">{fmtDate(batch.created_at)}</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const BATCH_STATUSES = ['', 'draft', 'funded', 'paused', 'exhausted', 'expired']

export default function SuperOrgAllocations() {
  const { orgId }  = useParams()
  const navigate   = useNavigate()

  const [org,         setOrg]         = useState(null)
  const [stats,       setStats]       = useState({ available: 0, in_batches: 0, total_allocated: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const [allocations,  setAllocations]  = useState([])
  const [allocTotal,   setAllocTotal]   = useState(0)
  const [allocPage,    setAllocPage]    = useState(1)
  const [allocLoading, setAllocLoading] = useState(true)

  const [batches,      setBatches]      = useState([])
  const [batchTotal,   setBatchTotal]   = useState(0)
  const [batchPage,    setBatchPage]    = useState(1)
  const [batchStatus,  setBatchStatus]  = useState('')
  const [batchLoading, setBatchLoading] = useState(true)

  const [error, setError] = useState('')

  // ── Fetch org info ──
  useEffect(() => {
    api.get(`/super/orgs/${orgId}`)
      .then(setOrg)
      .catch(() => navigate('/super/orgs'))
  }, [orgId])

  // ── Fetch pool stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try { setStats(await api.get(`/super/orgs/${orgId}/pool`)) }
    catch { /* silent */ }
    finally { setStatsLoading(false) }
  }, [orgId])

  // ── Fetch allocations ──
  const fetchAllocations = useCallback(async () => {
    setAllocLoading(true)
    try {
      const res = await api.get(`/super/orgs/${orgId}/allocations?page=${allocPage}&limit=10`)
      setAllocations(res.allocations || [])
      setAllocTotal(res.total || 0)
    } catch (err) { setError(err.error || err.message || 'Failed to load allocations') }
    finally { setAllocLoading(false) }
  }, [orgId, allocPage])

  // ── Fetch org admin batches ──
  const fetchBatches = useCallback(async () => {
    setBatchLoading(true)
    try {
      const p = new URLSearchParams({ page: batchPage, limit: 10 })
      if (batchStatus) p.set('status', batchStatus)
      const res = await api.get(`/super/orgs/${orgId}/batches?${p}`)
      setBatches(res.batches || [])
      setBatchTotal(res.total || 0)
    } catch (err) { setError(err.error || err.message || 'Failed to load batches') }
    finally { setBatchLoading(false) }
  }, [orgId, batchPage, batchStatus])

  useEffect(() => { fetchStats() },       [fetchStats])
  useEffect(() => { fetchAllocations() }, [fetchAllocations])
  useEffect(() => { fetchBatches() },     [fetchBatches])

  function handleGenerated() {
    fetchStats()
    fetchAllocations()
  }

  const allocPages = Math.ceil(allocTotal / 10)
  const batchPages = Math.ceil(batchTotal / 10)

  return (
    <SuperLayout>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 float-in">
        <div>
          <button onClick={() => navigate('/super/orgs')}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-white transition-colors mb-3">
            <ArrowLeft size={13} /> Organizations
          </button>
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">QR Allocations</span>
            {org && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-[10px] font-mono text-amber-400/80">{org.org_code}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">
            {org ? org.name : '…'}
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Generate QR codes here → print & hand to org · Org admin creates batches from the pool
          </p>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center justify-between mb-4 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2"><AlertCircle size={14} />{error}</div>
          <button onClick={() => setError('')}><X size={14} className="text-slate-500 hover:text-white" /></button>
        </div>
      )}

      {/* ── Pool stats ── */}
      <PoolStats stats={stats} loading={statsLoading} />

      {/* ── Generate panel ── */}
      <GeneratePanel orgId={orgId} onGenerated={handleGenerated} />

      {/* ── Allocation history ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download size={13} className="text-amber-400" />
            <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Allocation History</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{allocTotal} total</span>
        </div>

        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
          {allocLoading ? (
            <div className="py-10 text-center">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
            </div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center">
              <QrCode size={28} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No allocations yet</p>
              <p className="text-slate-600 text-xs font-mono mt-1">Generate QR codes above to create the first allocation</p>
            </div>
          ) : (
            allocations.map(a => <AllocationRow key={a.id} alloc={a} orgId={orgId} />)
          )}
        </div>

        {allocPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-mono text-slate-500">Page {allocPage} of {allocPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setAllocPage(p => Math.max(1, p - 1))} disabled={allocPage === 1}
                className="p-1.5 border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setAllocPage(p => Math.min(allocPages, p + 1))} disabled={allocPage === allocPages}
                className="p-1.5 border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-400 hover:text-white transition-all">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Org admin batches (read-only) ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Package size={13} className="text-slate-400" />
            <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Org Admin Batches</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={batchStatus} onChange={e => { setBatchStatus(e.target.value); setBatchPage(1) }}
              className="bg-[#111827] border border-[#1c2d42] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer">
              {BATCH_STATUSES.map(s => (
                <option key={s} value={s} className="bg-[#111827]">
                  {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-slate-500">{batchTotal} total</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
          {batchLoading ? (
            <div className="py-10 text-center">
              <div className="w-6 h-6 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin mx-auto" />
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={28} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No batches yet</p>
              <p className="text-slate-600 text-xs font-mono mt-1">Org admin will create batches once QR codes are in the pool</p>
            </div>
          ) : (
            batches.map(b => <BatchRow key={b.id} batch={b} />)
          )}
        </div>

        {batchPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-mono text-slate-500">Page {batchPage} of {batchPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setBatchPage(p => Math.max(1, p - 1))} disabled={batchPage === 1}
                className="p-1.5 border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-400 hover:text-white transition-all">
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setBatchPage(p => Math.min(batchPages, p + 1))} disabled={batchPage === batchPages}
                className="p-1.5 border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-400 hover:text-white transition-all">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="mt-6 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20"><Palette size={9} className="text-amber-400" /></div>
          <p className="text-[9px] font-mono text-slate-600">Designed — sticker SVGs using org brand colours + serial #</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1c2d42]"><QrCode size={9} className="text-slate-400" /></div>
          <p className="text-[9px] font-mono text-slate-600">Plain — bare QR PNG files only</p>
        </div>
      </div>
    </SuperLayout>
  )
}
