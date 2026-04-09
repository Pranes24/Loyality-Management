// Admin wallet — credit-card style balance + top-up + transaction history
import React, { useEffect, useState } from 'react'
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, CreditCard, TrendingDown } from 'lucide-react'
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
      <div className="flex items-center gap-3 mb-8 float-in">
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Wallet size={16} className="text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1 h-3.5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Finance</p>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">Admin Wallet</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">

        {/* Credit card style balance */}
        <div className="float-in-1 lg:col-span-2 relative overflow-hidden rounded-2xl p-7 card-shine"
             style={{
               background: 'linear-gradient(135deg, #1a1200 0%, #261900 35%, #1a1100 60%, #0d1826 100%)',
               border: '1px solid rgba(245,158,11,0.22)',
               boxShadow: '0 12px 40px rgba(245,158,11,0.1), inset 0 1px 0 rgba(245,158,11,0.08)',
             }}>
          {/* Ambient orbs */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full orb-pulse pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.1), transparent 70%)' }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
               style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 32px,rgba(245,158,11,0.6)32px,rgba(245,158,11,0.6)33px),repeating-linear-gradient(90deg,transparent,transparent 32px,rgba(245,158,11,0.6)32px,rgba(245,158,11,0.6)33px)' }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/60 mb-2">Available Balance</p>
                <p className="font-barlow font-black leading-none text-amber-400"
                   style={{
                     fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
                     textShadow: '0 0 40px rgba(245,158,11,0.25)',
                   }}>
                  {wallet ? fmtRs(wallet.balance) : '—'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <CreditCard size={26} className="text-amber-400/25" />
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-6 h-1 rounded-full bg-amber-500/20" />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-amber-500/10">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">Total Funded</p>
                <p className="text-xl font-barlow font-black text-white">{wallet ? fmtRs(wallet.total_funded) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">Total Debited</p>
                <p className="text-xl font-barlow font-black text-white">{wallet ? fmtRs(wallet.total_debited) : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up form */}
        <form onSubmit={handleTopup} className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2d42]">
            <div className="p-1.5 rounded-lg bg-green-500/12 border border-green-500/15">
              <Plus size={13} className="text-green-400" />
            </div>
            <h3 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Add Funds</h3>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">Amount (₹)</label>
            <input type="number" value={topup} onChange={e => setTopup(e.target.value)} min={1} placeholder="e.g. 5000"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm focus:outline-none input-focus transition-all" />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. April budget"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm focus:outline-none input-focus transition-all" />
          </div>

          <button type="submit" disabled={adding || !topup}
            className="btn-press w-full py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-white
                       flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.25)' }}>
            {adding
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Plus size={14} strokeWidth={2.5} />
            }
            Add Funds
          </button>

          {wallet && (
            <div className="pt-3 border-t border-[#1c2d42] text-center">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-0.5">Current Balance</p>
              <p className="text-lg font-barlow font-black text-amber-400">{fmtRs(wallet.balance)}</p>
            </div>
          )}
        </form>
      </div>

      {/* Summary row */}
      {summary && (
        <div className="float-in-3 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { icon: ArrowDownLeft, label: 'Total Credits', value: fmtRs(summary.total_credits), cls: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/15' },
            { icon: ArrowUpRight,  label: 'Total Debits',  value: fmtRs(summary.total_debits),  cls: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/15'   },
          ].map(({ icon: Icon, label, value, cls, bg, border }) => (
            <div key={label} className="flex items-center gap-4 bg-[#111827] border border-[#1c2d42] rounded-2xl px-5 py-4">
              <div className={`p-2.5 rounded-xl ${bg} border ${border} flex-shrink-0`}>
                <Icon size={16} className={cls} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-barlow font-black ${cls}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      <div className="float-in-4 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42]"
             style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
          <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Transaction History</h2>
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}
            className="bg-[#0c1422] border border-[#1c2d42] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
            <option value="" className="bg-[#0c1422]">All</option>
            <option value="credit" className="bg-[#0c1422]">Credits</option>
            <option value="debit" className="bg-[#0c1422]">Debits</option>
          </select>
        </div>

        <div className="divide-y divide-[#1c2d42]">
          {loading
            ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4 items-center">
                  <div className="shimmer-bg w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer-bg h-3 w-40 rounded" />
                    <div className="shimmer-bg h-2.5 w-24 rounded" />
                  </div>
                  <div className="shimmer-bg h-5 w-20 rounded" />
                </div>
              ))
            : txns.length === 0
            ? (
              <div className="px-5 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-3">
                  <TrendingDown size={22} className="text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No transactions yet</p>
              </div>
            )
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
                    <p className="text-sm text-white font-medium truncate">{t.note || (t.type === 'credit' ? 'Credit' : 'QR Debit')}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {t.batch_code ? `${t.batch_code} · ${t.product_name}` : fmtDate(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-barlow font-black text-sm ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
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
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/20)}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
