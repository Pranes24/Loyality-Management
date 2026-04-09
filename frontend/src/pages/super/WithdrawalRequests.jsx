// Super admin withdrawal requests — review and mark paid/rejected
import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Wallet } from 'lucide-react'
import SuperLayout from '../../components/super/SuperLayout'
import api         from '../../lib/api'

function fmtRs(n)   { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN') : '—' }

const STATUS_COLORS = {
  pending:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-400'  },
  approved: { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-400'  },
  rejected: { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-400'    },
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  )
}

export default function WithdrawalRequests() {
  const [withdrawals, setWithdrawals] = useState([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [filter,      setFilter]      = useState('pending')
  const [loading,     setLoading]     = useState(true)
  const [processing,  setProcessing]  = useState(null)
  const [noteModal,   setNoteModal]   = useState(null)
  const [note,        setNote]        = useState('')

  useEffect(() => { fetchWithdrawals() }, [page, filter])

  async function fetchWithdrawals() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (filter) params.set('status', filter)
      const res = await api.get(`/super/withdrawals?${params}`)
      setWithdrawals(res.withdrawals || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  async function handleProcess(id, status) {
    setProcessing(id)
    try {
      await api.patch(`/super/withdrawals/${id}`, { status, note: note.trim() })
      setNoteModal(null); setNote('')
      fetchWithdrawals()
    } finally { setProcessing(null) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <SuperLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Wallet size={16} className="text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Finance</p>
          <h1 className="text-2xl sm:text-3xl font-barlow font-black text-white uppercase tracking-wide leading-none">Withdrawals</h1>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1) }}
            className={`px-3 py-2 rounded-xl text-xs font-barlow font-bold uppercase tracking-wide transition-all ${
              filter === s ? 'text-black' : 'text-slate-400 bg-[#111827] border border-[#1c2d42] hover:text-white'
            }`}
            style={filter === s ? { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' } : {}}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 mb-4">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111827] border border-[#1c2d42] rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="shimmer-bg h-4 w-24 rounded" />
                  <div className="shimmer-bg h-6 w-20 rounded-full" />
                </div>
                <div className="shimmer-bg h-3 w-32 rounded" />
                <div className="shimmer-bg h-3 w-40 rounded" />
              </div>
            ))
          : withdrawals.length === 0
          ? (
            <div className="bg-[#111827] border border-[#1c2d42] rounded-xl py-12 text-center">
              <Clock size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No withdrawal requests found</p>
            </div>
          )
          : withdrawals.map(w => (
            <div key={w.id} className="bg-[#111827] border border-[#1c2d42] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white">{w.user_name || '—'}</p>
                  <p className="text-[11px] font-mono text-slate-400">+91 {w.user_mobile}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-barlow font-black text-amber-400">{fmtRs(w.amount)}</span>
                <span className="text-[11px] font-mono text-slate-500">{fmtDate(w.requested_at)}</span>
              </div>
              <p className="text-xs font-mono text-slate-400 truncate mb-3">UPI: {w.upi_id}</p>
              {w.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => setNoteModal({ id: w.id, action: 'approved' })}
                    disabled={processing === w.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-barlow font-bold uppercase
                               bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all disabled:opacity-50">
                    <CheckCircle size={12} /> Mark Paid
                  </button>
                  <button onClick={() => setNoteModal({ id: w.id, action: 'rejected' })}
                    disabled={processing === w.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-barlow font-bold uppercase
                               bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              )}
              {w.status !== 'pending' && w.note && (
                <p className="text-[11px] text-slate-500 font-mono">{w.note}</p>
              )}
            </div>
          ))
        }
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1c2d42]">
                {['User', 'Mobile', 'Amount', 'UPI ID', 'Requested', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2d42]">
              {loading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-5 py-3"><div className="shimmer-bg h-3 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                : withdrawals.length === 0
                ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center">
                    <Clock size={24} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No withdrawal requests found</p>
                  </td></tr>
                )
                : withdrawals.map(w => (
                  <tr key={w.id} className="table-row-hover">
                    <td className="px-5 py-3 text-white font-medium">{w.user_name || '—'}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">+91 {w.user_mobile}</td>
                    <td className="px-5 py-3 font-barlow font-black text-amber-400">{fmtRs(w.amount)}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-300 max-w-[140px] truncate">{w.upi_id}</td>
                    <td className="px-5 py-3 text-[11px] text-slate-500 font-mono">{fmtDate(w.requested_at)}</td>
                    <td className="px-5 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-5 py-3">
                      {w.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => setNoteModal({ id: w.id, action: 'approved' })} disabled={processing === w.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-barlow font-bold uppercase tracking-wide
                                       bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all disabled:opacity-50">
                            <CheckCircle size={11} /> Paid
                          </button>
                          <button onClick={() => setNoteModal({ id: w.id, action: 'rejected' })} disabled={processing === w.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-barlow font-bold uppercase tracking-wide
                                       bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                            <XCircle size={11} /> Reject
                          </button>
                        </div>
                      )}
                      {w.status !== 'pending' && (
                        <span className="text-[11px] text-slate-600 font-mono">{w.note || fmtDate(w.processed_at)}</span>
                      )}
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
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1 py-3">
          <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300">Next</button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-barlow font-black text-white uppercase tracking-wide mb-1">
              {noteModal.action === 'approved' ? 'Mark as Paid' : 'Reject Request'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {noteModal.action === 'approved'
                ? 'Confirm you have manually transferred the amount via UPI/PhonePe.'
                : "The amount will be returned to the user's wallet balance."
              }
            </p>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder={noteModal.action === 'approved' ? 'UTR / reference number (optional)' : 'Reason for rejection (optional)'}
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-4 input-focus" />
            <div className="flex gap-3">
              <button onClick={() => { setNoteModal(null); setNote('') }}
                className="flex-1 py-2.5 rounded-xl border border-[#1c2d42] text-slate-300 hover:text-white text-sm font-barlow font-bold uppercase tracking-wide transition-all">
                Cancel
              </button>
              <button onClick={() => handleProcess(noteModal.id, noteModal.action)} disabled={processing === noteModal.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-barlow font-bold uppercase tracking-wide text-white transition-all disabled:opacity-50"
                style={{ background: noteModal.action === 'approved' ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                {processing === noteModal.id
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  : noteModal.action === 'approved' ? 'Confirm Paid' : 'Confirm Reject'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperLayout>
  )
}
