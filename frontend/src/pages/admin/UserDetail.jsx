// Individual user profile — big avatar, stats, scan history, wallet tabs
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet, QrCode, TrendingUp, Calendar, CheckCircle2, Clock, PiggyBank } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import StatusBadge from '../../components/admin/StatusBadge'
import api         from '../../lib/api'

function fmtRs(n)   { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN') : '—' }

const AVATAR_PALETTES = [
  { bg: 'rgba(245,158,11,0.18)', text: '#f59e0b', ring: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.15)' },
  { bg: 'rgba(34,211,238,0.14)', text: '#22d3ee', ring: 'rgba(34,211,238,0.35)', glow: 'rgba(34,211,238,0.12)' },
  { bg: 'rgba(167,139,250,0.18)',text: '#a78bfa', ring: 'rgba(167,139,250,0.35)',glow: 'rgba(167,139,250,0.12)'},
  { bg: 'rgba(52,211,153,0.18)', text: '#34d399', ring: 'rgba(52,211,153,0.35)', glow: 'rgba(52,211,153,0.12)' },
  { bg: 'rgba(251,146,60,0.18)', text: '#fb923c', ring: 'rgba(251,146,60,0.35)', glow: 'rgba(251,146,60,0.12)' },
]
function avatarP(str) {
  let h = 0
  for (const c of (str || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length]
}

const ACTION_STYLES = {
  redeemed:        { label: 'Redeemed',  cls: 'bg-green-500/10 text-green-400 border-green-500/20'   },
  wallet_credited: { label: 'To Wallet', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'      },
  pending_reason:  { label: 'Not Now',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20'},
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user,    setUser]    = useState(null)
  const [history, setHistory] = useState([])
  const [htotal,  setHtotal]  = useState(0)
  const [hpage,   setHpage]   = useState(1)
  const [tab,     setTab]     = useState('scans')
  const [wallet,  setWallet]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(u => { setUser(u); return api.get(`/users/wallet/${u.mobile}`) })
      .then(w => setWallet(w))
      .catch(() => navigate('/admin/users'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!user) return
    api.get(`/users/${id}/history?page=${hpage}&limit=20`)
      .then(r => { setHistory(r.history || []); setHtotal(r.total || 0) })
  }, [id, hpage, user])

  if (loading || !user) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    </AdminLayout>
  )

  const name    = user.name || user.mobile || '?'
  const palette = avatarP(name)

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 float-in">
        <button onClick={() => navigate('/admin/users')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Big avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-barlow font-black"
                 style={{ background: palette.bg, color: palette.text, boxShadow: `0 0 0 2px ${palette.ring}, 0 0 20px ${palette.glow}` }}>
              {name[0].toUpperCase()}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-barlow font-black text-white leading-none">{user.name || 'Unnamed User'}</h1>
            <p className="text-sm font-mono text-slate-400 mt-1">{user.mobile}</p>
          </div>
        </div>
      </div>

      {/* Primary stats */}
      <div className="float-in-1 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { icon: QrCode,     label: 'Total Scans',    value: user.total_scans,          cls: 'text-white'     },
          { icon: TrendingUp, label: 'Total Earned',   value: fmtRs(user.total_earned),  cls: 'text-amber-400' },
          { icon: Wallet,     label: 'Wallet Balance', value: fmtRs(user.wallet_balance),cls: 'text-cyan-400'  },
          { icon: Calendar,   label: 'Joined',         value: new Date(user.registered_at).toLocaleDateString('en-IN'), cls: 'text-slate-300' },
        ].map(({ icon: Icon, label, value, cls }) => (
          <div key={label} className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-4 hover:border-[#2a3f5a] transition-colors group">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="p-1.5 rounded-lg bg-[#1c2d42] group-hover:bg-[#263448] transition-colors">
                <Icon size={12} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</p>
            </div>
            <p className={`text-xl font-barlow font-black ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mini stats */}
      <div className="float-in-2 grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {[
          { icon: CheckCircle2, label: 'Redeemed',  value: user.total_redeemed,       cls: 'text-green-400',  iconCls: 'text-green-500' },
          { icon: PiggyBank,    label: 'To Wallet', value: user.total_wallet_credits, cls: 'text-cyan-400',   iconCls: 'text-cyan-500'  },
          { icon: Clock,        label: 'Not Now',   value: user.total_pending,        cls: 'text-orange-400', iconCls: 'text-orange-500'},
        ].map(({ icon: Icon, label, value, cls, iconCls }) => (
          <div key={label} className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-4 text-center hover:border-[#2a3f5a] transition-colors">
            <Icon size={16} className={`${iconCls} mx-auto mb-2 opacity-60`} />
            <p className={`text-3xl font-barlow font-black ${cls}`}>{value}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="float-in-3 flex gap-1 bg-[#0c1422] border border-[#1c2d42] rounded-xl p-1 w-fit mb-5">
        {[['scans', 'Scan History'], ['wallet', 'Wallet']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-5 py-2 text-sm font-barlow font-bold uppercase tracking-wide rounded-lg transition-all ${
              tab === val ? 'text-black' : 'text-slate-400 hover:text-white'
            }`}
            style={tab === val ? { background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 2px 10px rgba(245,158,11,0.3)' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Scan History */}
      {tab === 'scans' && (
        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-[#1c2d42]" style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
                  {['QR No.', 'Date', 'Product', 'Batch', 'Amount', 'Action', 'Details'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2d42]">
                {history.length === 0
                  ? <tr><td colSpan={7} className="px-5 py-14 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-3">
                        <QrCode size={20} className="text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">No scans yet</p>
                    </td></tr>
                  : history.map(h => {
                      const cfg = ACTION_STYLES[h.action] || {}
                      return (
                        <tr key={h.id} className="table-row-hover">
                          <td className="px-5 py-3 font-mono text-[11px] text-cyan-400 font-bold whitespace-nowrap">
                            {h.qr_number ? `No. ${String(h.qr_number).padStart(6, '0')}` : '—'}
                          </td>
                          <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">{fmtDate(h.scanned_at)}</td>
                          <td className="px-5 py-3 text-sm text-white">{h.product_name}</td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{h.batch_code}</td>
                          <td className="px-5 py-3 font-barlow font-black text-amber-400">₹{h.amount}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono border ${cfg.cls}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[11px] text-slate-500 max-w-[160px] truncate">{h.reason || h.txn_id || h.upi_id || '—'}</td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
          {Math.ceil(htotal / 20) > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42]">
              <span className="text-[11px] text-slate-500 font-mono">Page {hpage} of {Math.ceil(htotal/20)}</span>
              <div className="flex gap-2">
                <button onClick={() => setHpage(p => Math.max(1, p-1))} disabled={hpage===1}
                  className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Prev</button>
                <button onClick={() => setHpage(p => p+1)} disabled={hpage >= Math.ceil(htotal/20)}
                  className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Tab */}
      {tab === 'wallet' && wallet && (
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)' }} />
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Current Balance</p>
            <p className="text-4xl font-barlow font-black text-cyan-400">{fmtRs(wallet.wallet_balance)}</p>
            <div className="flex gap-6 mt-3 text-[11px] font-mono text-slate-500">
              <span>Total In: <span className="text-green-400 font-bold">{fmtRs(wallet.total_wallet_in)}</span></span>
              <span>Total Out: <span className="text-red-400 font-bold">{fmtRs(wallet.total_wallet_out)}</span></span>
            </div>
          </div>
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-[#1c2d42]" style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
                  {['Date', 'Type', 'Amount', 'Product / UPI', 'Note'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2d42]">
                {(wallet.transactions || []).length === 0
                  ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500 text-sm">No wallet transactions</td></tr>
                  : wallet.transactions.map(t => (
                      <tr key={t.id} className="table-row-hover">
                        <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">{fmtDate(t.created_at)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-mono font-bold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                            {t.type === 'credit' ? '+ Credit' : '– Withdrawal'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-barlow font-black text-amber-400">₹{t.amount}</td>
                        <td className="px-5 py-3 text-[11px] text-slate-400">{t.product_name || t.upi_id || '—'}</td>
                        <td className="px-5 py-3 text-[11px] text-slate-500">{t.note}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
