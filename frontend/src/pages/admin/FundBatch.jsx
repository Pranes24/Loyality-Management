// Fund a DRAFT batch — Auto Split or Manual Tiers with visual bar chart
import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Plus, Trash2, AlertCircle, BarChart3 } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api         from '../../lib/api'

const EMPTY_TIER = { qty: '', amount: '' }

// Simple deterministic distribution for preview
function buildDistribution(total) {
  if (!total || isNaN(total)) return null
  const t = parseInt(total)
  if (t < 500 || t > 7500) return null
  const amounts = Array(500).fill(1)
  let rem = t - 500
  const seed = t % 97
  for (let i = 0; rem > 0 && i < 50000; i++) {
    const idx = (i * 37 + seed) % 500
    if (amounts[idx] < 15) { amounts[idx]++; rem-- }
  }
  const dist = {}
  amounts.forEach(a => { dist[a] = (dist[a] || 0) + 1 })
  return dist
}

function barColor(amt) {
  const v = parseInt(amt)
  if (v >= 13) return '#f59e0b'
  if (v >= 10) return '#ea580c'
  if (v >= 7)  return '#f97316'
  if (v >= 4)  return '#fb923c'
  return '#475569'
}

export default function FundBatch() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [batch,   setBatch]   = useState(null)
  const [mode,    setMode]    = useState('auto')
  const [total,   setTotal]   = useState('')
  const [expires, setExpires] = useState('')
  const [tiers,   setTiers]   = useState([{ ...EMPTY_TIER }])
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/batch/${id}`)
      .then(b => {
        if (b.status !== 'draft') { navigate(`/admin/batch/${id}`); return }
        setBatch(b)
      })
      .catch(() => navigate('/admin'))
  }, [id])

  const preview  = useMemo(() => mode === 'auto' ? buildDistribution(total) : null, [total, mode])
  const maxCount = preview ? Math.max(...Object.values(preview)) : 1

  function addTier()           { setTiers(t => [...t, { ...EMPTY_TIER }]) }
  function removeTier(i)       { setTiers(t => t.filter((_, idx) => idx !== i)) }
  function updateTier(i, k, v) {
    setTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [k]: v } : tier))
    setError('')
  }

  const tierQtyTotal = tiers.reduce((s, t) => s + (parseInt(t.qty) || 0), 0)
  const tierTotal    = tiers.reduce((s, t) => s + (parseInt(t.qty) || 0) * (parseInt(t.amount) || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!total || isNaN(total)) return setError('Total amount is required')
    if (!expires)               return setError('Expiry date is required')
    if (mode === 'manual') {
      if (tierQtyTotal > 500)          return setError('Total QR quantity across tiers cannot exceed 500')
      if (tierTotal > parseInt(total)) return setError(`Tier total (₹${tierTotal}) exceeds the budget (₹${total})`)
    }
    const payload = { dist_mode: mode, total_amount: parseInt(total), expires_at: expires }
    if (mode === 'manual') {
      payload.tiers = tiers.map(t => ({ qty: parseInt(t.qty), amount: parseInt(t.amount) }))
    }
    setLoading(true)
    try {
      await api.post(`/batch/${id}/fund`, payload)
      navigate(`/admin/batch/${id}`)
    } catch (err) {
      setError(err.error || 'Failed to fund batch')
    } finally { setLoading(false) }
  }

  if (!batch) return null

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 float-in">
        <button onClick={() => navigate(`/admin/batch/${id}`)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">{batch.batch_code}</span>
            <span className="text-[11px] font-mono text-slate-500">·</span>
            <span className="text-[11px] font-mono text-slate-400">{batch.product_name}</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">Fund Batch</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">

        {/* Mode toggle */}
        <div className="float-in-1 bg-[#0c1422] border border-[#1c2d42] rounded-2xl p-1 flex gap-1">
          {[['auto', 'Auto Split'], ['manual', 'Manual Tiers']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setMode(val)}
              className={`flex-1 py-2.5 text-sm font-barlow font-bold uppercase tracking-wide rounded-xl transition-all duration-200 ${
                mode === val ? 'text-black' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={mode === val ? {
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
              } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Common fields */}
        <div className="float-in-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Total Budget (₹) <span className="text-amber-500">*</span>
            </label>
            <input
              type="number" value={total}
              onChange={e => { setTotal(e.target.value); setError('') }}
              min={500} max={7500} placeholder="e.g. 1500"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm input-focus focus:outline-none transition-all"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono">Min ₹500 · Max ₹7,500 · 500 QRs</p>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Expiry Date <span className="text-amber-500">*</span>
            </label>
            <input
              type="date" value={expires}
              onChange={e => { setExpires(e.target.value); setError('') }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white
                         rounded-xl px-4 py-3 text-sm input-focus focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Auto Split Preview */}
        {mode === 'auto' && (
          <div className="float-in-3 bg-[#0c1422] border border-[#1c2d42] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-amber-400" />
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Distribution Preview</p>
              {preview && (
                <span className="ml-auto text-[10px] font-mono text-slate-600">
                  ₹{total} across 500 QRs
                </span>
              )}
            </div>

            {!preview ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-[#111827] flex items-center justify-center mx-auto mb-3">
                  <BarChart3 size={20} className="text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">Enter a total budget (₹500–₹7,500) to preview</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(preview).sort(([a],[b]) => parseInt(a) - parseInt(b)).map(([amt, cnt]) => {
                  const pct  = Math.round((cnt / 500) * 100)
                  const barW = Math.round((cnt / maxCount) * 100)
                  const color = barColor(amt)
                  return (
                    <div key={amt} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-amber-400 w-7 text-right flex-shrink-0">₹{amt}</span>
                      <div className="flex-1 h-5 bg-[#111827] rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg bar-grow relative"
                          style={{ width: `${barW}%`, background: color, boxShadow: `0 0 8px ${color}40` }}
                        >
                          <div className="absolute inset-0 opacity-20 rounded-lg"
                               style={{ background: 'linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.15))' }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-20 text-right flex-shrink-0">{cnt} QRs ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Manual Tiers */}
        {mode === 'manual' && (
          <div className="float-in-3 bg-[#0c1422] border border-[#1c2d42] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="border-b border-[#1c2d42]"
                    style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
                  {['Quantity', 'Amount / QR (₹)', 'Subtotal', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2d42]">
                {tiers.map((tier, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="px-4 py-2.5">
                      <input type="number" value={tier.qty} min={1}
                        onChange={e => updateTier(i, 'qty', e.target.value)}
                        placeholder="100"
                        className="w-full bg-[#111827] border border-[#1c2d42] text-white rounded-lg px-3 py-2 text-sm
                                   input-focus focus:outline-none transition-all" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="number" value={tier.amount} min={1} max={15}
                        onChange={e => updateTier(i, 'amount', e.target.value)}
                        placeholder="5"
                        className="w-full bg-[#111827] border border-[#1c2d42] text-white rounded-lg px-3 py-2 text-sm
                                   input-focus focus:outline-none transition-all" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm">
                      <span className={tier.qty && tier.amount ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                        {tier.qty && tier.amount ? `₹${parseInt(tier.qty) * parseInt(tier.amount)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {tiers.length > 1 && (
                        <button type="button" onClick={() => removeTier(i)}
                          className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            </div>
            <div className="px-4 py-3 border-t border-[#1c2d42] flex items-center justify-between">
              <button type="button" onClick={addTier}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono transition-colors">
                <Plus size={13} /> Add Tier
              </button>
              <div className="text-right text-[11px] font-mono space-y-1">
                <p className="text-slate-500">
                  QRs: <span className={tierQtyTotal > 500 ? 'text-red-400 font-bold' : 'text-white'}>{tierQtyTotal}</span>
                  <span className="text-slate-600"> / 500</span>
                </p>
                <p className="text-slate-500">
                  Total: <span className={total && tierTotal > parseInt(total) ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>₹{tierTotal}</span>
                  {total ? <span className="text-slate-600"> / ₹{total}</span> : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="btn-press w-full py-3.5 rounded-xl font-barlow font-black uppercase tracking-wider text-sm text-black
                     transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: loading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
          }}
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Activating batch…</>
            : <><Zap size={16} strokeWidth={2.5} /> Activate Batch</>
          }
        </button>
      </form>
    </AdminLayout>
  )
}
