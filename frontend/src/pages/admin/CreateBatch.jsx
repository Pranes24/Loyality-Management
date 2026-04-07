// Create a new batch — premium form with animated success state
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus, ArrowLeft, CheckCircle, Package, Sparkles } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api         from '../../lib/api'

const FEATURES = [
  '500 unique QR codes with individual scan URLs',
  'Auto-generated Batch Code (BATCH-001, BATCH-002…)',
  'DRAFT status — no amounts assigned yet',
  'Ready to download and print immediately',
]

export default function CreateBatch() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ name: '', product_name: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)   // { id, batch_code }

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
      const res = await api.post('/batch/create', form)
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
        <div className="max-w-md mx-auto mt-16 text-center float-in">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5 success-ring"
               style={{ boxShadow: '0 0 40px rgba(74,222,128,0.2)' }}>
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-barlow font-black text-white uppercase tracking-wide mb-2">Batch Created!</h2>
          <p className="text-slate-400 text-sm mb-1">
            <span className="text-amber-400 font-mono font-semibold">{done.batch_code}</span> — 500 QR codes generated
          </p>
          <p className="text-slate-500 text-xs mb-8">Fund the batch whenever you're ready to activate the QR codes</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/admin/batch/${done.id}`)}
              className="btn-press px-6 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-black transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}
            >
              View Batch
            </button>
            <button
              onClick={() => { setDone(null); setForm({ name: '', product_name: '' }) }}
              className="px-6 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-slate-300 bg-[#1c2d42] hover:bg-[#263448] transition-colors"
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
            <PackagePlus size={14} className="text-amber-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">New Batch</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Create Batch</h1>
        </div>
      </div>

      <div className="max-w-xl">
        {/* Info banner */}
        <div className="float-in-1 flex gap-3 p-4 mb-6 rounded-2xl border border-amber-500/15"
             style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(234,88,12,0.03))' }}>
          <div className="p-1.5 rounded-lg bg-amber-500/15 flex-shrink-0 h-fit">
            <Package size={15} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Two-step process</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-white">Step 1:</strong> Create the batch — generates 500 blank QR codes ready to print.<br />
              <strong className="text-white">Step 2:</strong> Fund the batch later — assign amounts and expiry when ready.
            </p>
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 space-y-5">
          {/* Batch Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-2">
              Batch Name <span className="text-amber-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Diwali Campaign Q4"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm transition-all duration-200
                         focus:outline-none focus:border-amber-500/60 focus:bg-[#0f1929]"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}
            />
            <p className="text-[11px] text-slate-600 mt-1.5 font-mono">A label to identify this batch in your panel</p>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-2">
              Product Name <span className="text-amber-500">*</span>
            </label>
            <input
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              placeholder="e.g. Cement 50kg Bag"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-sm transition-all duration-200
                         focus:outline-none focus:border-amber-500/60 focus:bg-[#0f1929]"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}
            />
            <p className="text-[11px] text-slate-600 mt-1.5 font-mono">Used in product-wise spending reports</p>
          </div>

          {/* What gets created */}
          <div className="rounded-xl p-4 border border-[#1c2d42] bg-[#0c1422]/60 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-amber-500" />
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500">What gets created</p>
            </div>
            {FEATURES.map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-slate-400">{item}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
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
              boxShadow: loading ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Generating 500 QR codes…
              </>
            ) : (
              <>
                <PackagePlus size={16} strokeWidth={2.5} />
                Create Batch
              </>
            )}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
