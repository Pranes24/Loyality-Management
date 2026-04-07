// Admin wallet — credit-card style balance + top-up + transaction history
import React, { useEffect, useState } from 'react'
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api         from '../../lib/api'

function fmtRs(n)   { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN') : '—' }

export default function WalletPage() {
  const [wallet,  setWallet]  = useState(null)
  const [txns,    setTxns]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [summary, setSummary] = useState(null)
  const [topup,   setTopup]   = useState('')
  const [note,    setNote]    = useState('')
  const [adding,  setAdding]  = useState(false)
  const [filter,  setFilter]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchWallet(); fetchTxns() }, [])
  useEffect(() => { fetchTxns() }, [page, filter])

  async function fetchWallet() {
    const w = await api.get('/wallet/balance')
    setWallet(w)
  }

  async function fetchTxns() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (filter) params.set('type', filter)
      const res = await api.get(`/wallet/transactions?${params}`)
      setTxns(res.transactions || [])
      setTotal(res.total || 0)
      setSummary(res.summary)
    } finally { setLoading(false) }
  }

  async function handleTopup(e) {
    e.preventDefault()
    if (!topup || topup <= 0) return
    setAdding(true)
    try {
      await api.post('/wallet/topup', { amount: parseFloat(topup), note: note || 'Manual top-up' })
      setTopup(''); setNote('')
      fetchWallet(); fetchTxns()
    } finally { setAdding(false) }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-8 float-in">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <Wallet size={16} className="text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Finance</p>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Admin Wallet</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">

        {/* Credit card style balance */}
        <div className="float-in-1 lg:col-span-2 relative overflow-hidden rounded-2xl p-6 card-shine"
             style={{
               background: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 30%, #1c1100 60%, #0f1929 100%)',
               border: '1px solid rgba(245,158,11,0.25)',
               boxShadow: '0 8px 32px rgba(245,158,11,0.12), inset 0 1px 0 rgba(245,158,11,0.1)',
             }}>

          {/* Background orb */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #ea580c, transparent 70%)' }} />

          {/* Card grid lines */}
          <div className="absolute inset-0 opacity-5"
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(245,158,11,0.5) 40px, rgba(245,158,11,0.5) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(245,158,11,0.5) 40px, rgba(245,158,11,0.5) 41px)' }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400/70 mb-1">Available Balance</p>
                <p className="text-5xl font-barlow font-black text-amber-400 leading-none"
                   style={{ textShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
                  {wallet ? fmtRs(wallet.balance) : '—'}
                </p>
              </div>
              <CreditCard size={28} className="text-amber-400/30" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-500/10">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">Total Funded</p>
                <p className="text-lg font-barlow font-black text-white">{wallet ? fmtRs(wallet.total_funded) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1">Total Debited</p>
                <p className="text-lg font-barlow font-black text-white">{wallet ? fmtRs(wallet.total_debited) : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up form */}
        <form onSubmit={handleTopup} className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-green-500/15">
              <Plus size={13} className="text-green-400" />
            </div>
            <h3 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Add Funds</h3>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-2">Amount (₹)</label>
            <input type="number" value={topup} onChange={e => setTopup(e.target.value)} min={1} placeholder="e.g. 5000"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60 transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-2">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. April budget"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60 transition-colors" />
          </div>

          <button type="submit" disabled={adding || !topup}
            className="btn-press w-full py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-white
                       flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
            {adding
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Plus size={14} strokeWidth={2.5} />
            }
            Add Funds
          </button>
        </form>
      </div>

      {/* Summary row */}
      {summary && (
        <div className="float-in-3 grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-3 bg-[#111827] border border-[#1c2d42] rounded-2xl px-5 py-4">
            <div className="p-2 rounded-xl bg-green-500/10">
              <ArrowDownLeft size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Credits</p>
              <p className="text-lg font-barlow font-black text-green-400">{fmtRs(summary.total_credits)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#111827] border border-[#1c2d42] rounded-2xl px-5 py-4">
            <div className="p-2 rounded-xl bg-red-500/10">
              <ArrowUpRight size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Debits</p>
              <p className="text-lg font-barlow font-black text-red-400">{fmtRs(summary.total_debits)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="float-in-4 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42]">
          <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Transaction History</h2>
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}
            className="bg-[#0c1422] border border-[#1c2d42] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/60">
            <option value="">All</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
          </select>
        </div>

        <div className="divide-y divide-[#1c2d42]">
          {loading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4 items-center">
                  <div className="shimmer-bg w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer-bg h-3 w-40 rounded" />
                    <div className="shimmer-bg h-2.5 w-24 rounded" />
                  </div>
                  <div className="shimmer-bg h-5 w-20 rounded" />
                </div>
              ))
            : txns.length === 0
            ? <p className="px-5 py-10 text-center text-sm text-slate-500">No transactions yet</p>
            : txns.map(t => (
                <div key={t.id} className="px-5 py-4 flex items-center gap-4 table-row-hover">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {t.type === 'credit'
                      ? <ArrowDownLeft size={15} className="text-green-400" />
                      : <ArrowUpRight  size={15} className="text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{t.note || (t.type === 'credit' ? 'Credit' : 'QR Debit')}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {t.batch_code ? `${t.batch_code} · ${t.product_name}` : fmtDate(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-barlow font-bold text-sm ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'credit' ? '+' : '–'}₹{t.amount}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">{new Date(t.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {Math.ceil(total/20) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42]">
            <span className="text-[11px] text-slate-500 font-mono">Page {page} of {Math.ceil(total/20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/20)}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
