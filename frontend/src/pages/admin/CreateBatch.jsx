// Create a new batch — premium form with animated success state
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus, ArrowLeft, CheckCircle, Package, Sparkles, AlertCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api         from '../../lib/api'

const FEATURES = [
  '500 unique QR codes with individual scan URLs',
  'Auto-generated Batch Code (BATCH-001, BATCH-002…)',
  'DRAFT status — no amounts assigned yet',
  'Ready to fund and activate whenever you\'re ready',
]

export default function CreateBatch() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ name: '', product_name: '', qr_count: '500' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim())         return setError('Batch name is required')
    if (!form.product_name.trim()) return setError('Product name is required')
    setLoading(true)
    try {
      const res = await api.post('/batch/create', { ...form, qr_count: parseInt(form.qr_count) || 500 })
      setDone({ id: res.batch.id, batch_code: res.batch.batch_code })
    } catch (err) {
      setError(err.error || 'Failed to create batch')
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (done) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12 text-center float-in">
          <div className="relative inline-flex mb-6">
            <div className="w-24 h-24 rounded-full bg-green-500/12 border border-green-500/20 flex items-center justify-center success-ring"
                 style={{ boxShadow: '0 0 50px rgba(74,222,128,0.18)' }}>
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Sparkles size={14} className="text-amber-400" />
            </div>
          </div>
          <h2 className="text-3xl font-barlow font-black text-white uppercase tracking-wide mb-2">Batch Created!</h2>
          <p className="text-slate-400 text-sm mb-1">
            <span className="text-amber-400 font-mono font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{done.batch_code}</span>
          </p>
          <p className="text-slate-500 text-xs mt-2 mb-8 font-mono">500 QR codes generated · Ready to fund</p>

          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 mb-6 text-left space-y-2">
            {FEATURES.map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-slate-400">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/admin/batch/${done.id}`)}
              className="btn-press px-6 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-black transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
            >
              View Batch
            </button>
            <button
              onClick={() => { setDone(null); setForm({ name: '', product_name: '' }) }}
              className="px-6 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-slate-300 bg-[#1c2d42] hover:bg-[#263448] hover:text-white transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 float-in">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">New Batch</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">Create Batch</h1>
        </div>
      </div>

      <div className="max-w-xl">
        {/* Info banner */}
        <div className="float-in-1 flex gap-3 p-4 mb-6 rounded-2xl border border-amber-500/15 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(234,88,12,0.03))' }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)' }} />
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/20 flex-shrink-0 h-fit">
            <Package size={14} className="text-amber-400" />
          </div>
          <div className="relative">
            <p className="text-sm font-barlow font-bold text-amber-300 mb-1.5 uppercase tracking-wide">Two-step process</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-white">Step 1:</strong> Create — generates 500 blank QR codes ready to print.<br />
              <strong className="text-white">Step 2:</strong> Fund later — assign amounts and expiry when ready to activate.
            </p>
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 space-y-5">
          {/* Batch Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Batch Name <span className="text-amber-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Diwali Campaign Q4"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm transition-all input-focus focus:outline-none"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono">A label to identify this batch in your panel</p>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Product Name <span className="text-amber-500">*</span>
            </label>
            <input
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              placeholder="e.g. Cement 50kg Bag"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm transition-all input-focus focus:outline-none"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono">Used in product-wise spending reports</p>
          </div>

          {/* QR Count */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Number of QR Codes
            </label>
            <input
              name="qr_count"
              type="number"
              value={form.qr_count}
              onChange={handleChange}
              min={50} max={5000}
              placeholder="500"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm transition-all input-focus focus:outline-none"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono">50–5,000 QRs per batch</p>
          </div>

          {/* What gets created */}
          <div className="rounded-xl p-4 border border-[#1c2d42] bg-[#0c1422]/60 space-y-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={11} className="text-amber-500" />
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">What gets created</p>
            </div>
            {FEATURES.map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle size={12} className="text-amber-500/70 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-slate-400 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full py-3 rounded-xl font-barlow font-black uppercase tracking-wider text-sm text-black
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            style={{
              background: loading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Generating 500 QR codes…
              </>
            ) : (
              <><PackagePlus size={16} strokeWidth={2.5} /> Create Batch</>
            )}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
