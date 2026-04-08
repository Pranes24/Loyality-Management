// Super admin dashboard — platform-wide stats
import React, { useEffect, useState } from 'react'
import { Building2, Users, BarChart3, Wallet, TrendingUp, ShieldCheck } from 'lucide-react'
import SuperLayout from '../../components/super/SuperLayout'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`bg-[#111827] border rounded-2xl p-5 hover:border-[#2a3f5a] transition-colors ${accent ? 'border-amber-500/20' : 'border-[#1c2d42]'}`}
         style={accent ? { boxShadow: '0 0 20px rgba(245,158,11,0.08)' } : {}}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${accent ? 'bg-amber-500/15' : 'bg-[#1c2d42]'}`}>
          <Icon size={14} className={accent ? 'text-amber-400' : 'text-slate-400'} />
        </div>
      </div>
      <p className={`text-2xl font-barlow font-black ${accent ? 'gradient-text' : 'text-white'}`}>{value ?? '—'}</p>
      <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[11px] font-mono text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function SuperDashboard() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/super/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <SuperLayout>
      {/* Header */}
      <div className="mb-8 float-in">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={12} className="text-amber-400" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Super Admin</span>
        </div>
        <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Platform Overview</h1>
        <p className="text-sm text-slate-500 font-mono mt-1">Welcome back, {user?.name || user?.email}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5">
              <div className="shimmer-bg h-4 rounded w-8 mb-3" />
              <div className="shimmer-bg h-7 rounded w-16 mb-2" />
              <div className="shimmer-bg h-3 rounded w-20" />
            </div>
          ))}
        </div>
      ) : stats && (
        <>
          <div className="float-in-1 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Building2} label="Organizations" accent
              value={stats.orgs?.total || 0}
              sub={`${stats.orgs?.active || 0} active`}
            />
            <StatCard
              icon={Users} label="Total Users"
              value={parseInt(stats.users?.total || 0).toLocaleString()}
            />
            <StatCard
              icon={BarChart3} label="Total Batches"
              value={stats.batches?.total || 0}
              sub={`${stats.batches?.funded || 0} funded`}
            />
            <StatCard
              icon={TrendingUp} label="Total Redeemed"
              value={`₹${parseFloat(stats.redeem?.total_paid_out || 0).toLocaleString('en-IN')}`}
              sub={`${stats.redeem?.redeemed || 0} QRs`}
            />
          </div>

          <div className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={14} className="text-amber-400" />
              <h2 className="text-sm font-barlow font-bold text-white uppercase tracking-wide">Platform Wallet Summary</h2>
            </div>
            <p className="text-3xl font-barlow font-black gradient-text">
              ₹{parseFloat(stats.orgs?.total_wallet_balance || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">Total balance across all org wallets</p>
          </div>
        </>
      )}
    </SuperLayout>
  )
}
