// Admin dashboard — animated stat cards + activity feed + batch list
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, PackagePlus, QrCode, Users, Wallet, TrendingUp, Clock, ArrowRight, Activity } from 'lucide-react'
import AdminLayout  from '../../components/admin/AdminLayout'
import StatCard     from '../../components/admin/StatCard'
import StatusBadge  from '../../components/admin/StatusBadge'
import api          from '../../lib/api'

function fmtRs(n) { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const ACTION_CFG = {
  redeemed:        { label: 'Redeemed',  cls: 'text-green-400', bg: 'bg-green-500/10' },
  wallet_credited: { label: 'Wallet',    cls: 'text-cyan-400',  bg: 'bg-cyan-500/10'  },
  pending_reason:  { label: 'Not Now',   cls: 'text-orange-400',bg: 'bg-orange-500/10'},
}

const AVATAR_COLORS = [
  'bg-amber-500/20 text-amber-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-purple-500/20 text-purple-400',
  'bg-green-500/20 text-green-400',
  'bg-pink-500/20 text-pink-400',
]

function avatarColor(str) {
  let h = 0
  for (let c of (str || '')) h = h * 31 + c.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function Dashboard() {
  const [summary,  setSummary]  = useState(null)
  const [activity, setActivity] = useState([])
  const [batches,  setBatches]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/stats/summary'),
      api.get('/stats/recent'),
      api.get('/batch/list?limit=5'),
    ]).then(([s, a, b]) => {
      setSummary(s)
      setActivity(a.activity || [])
      setBatches(b.batches  || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard size={14} className="text-amber-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Overview</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Dashboard</h1>
        </div>
        <Link
          to="/admin/create-batch"
          className="btn-press flex items-center gap-2 px-5 py-2.5 rounded-xl font-barlow font-bold uppercase tracking-wide text-sm text-black
                     transition-all duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
            boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
          }}
        >
          <PackagePlus size={15} strokeWidth={2.5} />
          New Batch
        </Link>
      </div>

      {/* Primary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="float-in-1"><StatCard loading={loading} label="Total Batches"    value={summary?.batches?.total || 0}   icon={QrCode}     /></div>
        <div className="float-in-2"><StatCard loading={loading} label="Total QR Codes"   value={summary?.qrCodes?.total || 0}   icon={QrCode}     /></div>
        <div className="float-in-3"><StatCard loading={loading} label="Registered Users" value={summary?.users?.total || 0}     icon={Users}      /></div>
        <div className="float-in-4"><StatCard loading={loading} label="Redemption Rate"  value={`${summary?.redemptionRate || 0}%`} icon={TrendingUp} accent /></div>
      </div>

      {/* Finance stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="float-in-1"><StatCard loading={loading} label="Wallet Balance"    value={fmtRs(summary?.wallet?.balance)}        icon={Wallet} accent /></div>
        <div className="float-in-2"><StatCard loading={loading} label="Total Distributed" value={fmtRs(summary?.wallet?.total_debited)}   icon={Wallet} /></div>
        <div className="float-in-3"><StatCard loading={loading} label="QRs Redeemed"      value={summary?.qrCodes?.redeemed || 0}         icon={TrendingUp} /></div>
        <div className="float-in-4"><StatCard loading={loading} label="In Wallets"        value={summary?.qrCodes?.walletCredited || 0}   icon={Wallet} /></div>
      </div>

      {/* Bottom panels */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent Activity */}
        <div className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Activity size={14} className="text-amber-400" />
              </div>
              <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Recent Activity</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">Live</span>
            </div>
          </div>

          <div className="divide-y divide-[#1c2d42]">
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex gap-3">
                    <div className="shimmer-bg w-9 h-9 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <div className="shimmer-bg h-3 w-32 rounded" />
                      <div className="shimmer-bg h-2 w-24 rounded" />
                    </div>
                    <div className="shimmer-bg h-5 w-14 rounded" />
                  </div>
                ))
              : activity.length === 0
              ? (
                <div className="px-5 py-12 text-center">
                  <Clock size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No activity yet</p>
                  <p className="text-xs text-slate-600 mt-1">Scans will appear here</p>
                </div>
              )
              : activity.map((a, idx) => {
                  const cfg = ACTION_CFG[a.action] || {}
                  const name = a.user_name || a.user_mobile || '?'
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-3 table-row-hover">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-barlow font-black flex-shrink-0 ${avatarColor(name)}`}>
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate font-medium">
                          {name}
                          <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{a.product_name} · {a.batch_code}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-barlow font-bold text-amber-400">₹{a.amount}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{timeAgo(a.scanned_at)}</p>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Recent Batches */}
        <div className="float-in-3 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2d42]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <QrCode size={14} className="text-amber-400" />
              </div>
              <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Recent Batches</h2>
            </div>
            <Link to="/admin/batch" className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-mono transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-[#1c2d42]">
            {loading
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex justify-between items-center">
                    <div className="space-y-1.5">
                      <div className="shimmer-bg h-3 w-32 rounded" />
                      <div className="shimmer-bg h-2.5 w-20 rounded" />
                    </div>
                    <div className="shimmer-bg h-5 w-16 rounded-full" />
                  </div>
                ))
              : batches.length === 0
              ? (
                <div className="px-5 py-12 text-center">
                  <QrCode size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No batches created yet</p>
                  <Link to="/admin/create-batch" className="text-xs text-amber-400 mt-2 block hover:underline">
                    Create your first batch →
                  </Link>
                </div>
              )
              : batches.map(b => (
                  <Link
                    key={b.id}
                    to={`/admin/batch/${b.id}`}
                    className="px-5 py-3.5 flex items-center justify-between table-row-hover hover:no-underline group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium group-hover:text-amber-400 transition-colors truncate">{b.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{b.batch_code} · {b.product_name}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {b.total_amount != null && (
                        <span className="text-xs font-barlow font-bold text-amber-400">₹{b.total_amount}</span>
                      )}
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                ))
            }
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
