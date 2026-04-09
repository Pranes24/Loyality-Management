// Super admin — organization list with create modal and wallet top-up
import React, { useEffect, useState } from 'react'
import { Building2, Plus, Search, Wallet, MoreHorizontal, CheckCircle, AlertCircle, X, Eye, EyeOff } from 'lucide-react'
import SuperLayout from '../../components/super/SuperLayout'
import api from '../../lib/api'

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider
      ${status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
      {status}
    </span>
  )
}

function CreateOrgModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ org_name: '', org_code: '', admin_name: '', admin_email: '', admin_password: '' })
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const val = e.target.name === 'org_code'
      ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
      : e.target.value
    setForm(f => ({ ...f, [e.target.name]: val }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (Object.values(form).some(v => !v)) return setError('All fields are required')
    setLoading(true)
    try {
      await api.post('/super/orgs', form)
      onCreated()
      onClose()
    } catch (err) {
      setError(err.error || 'Failed to create org')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 float-in"
           style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-barlow font-black text-white uppercase tracking-wide">Create Organization</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'org_name',    label: 'Organization Name', placeholder: 'Ramco Cements' },
            { name: 'org_code',    label: 'Org Code (3–10 chars)', placeholder: 'RAMCO', mono: true },
            { name: 'admin_name',  label: 'Admin Name', placeholder: 'Vikram Kumar' },
            { name: 'admin_email', label: 'Admin Email', placeholder: 'admin@ramco.com', type: 'email' },
          ].map(({ name, label, placeholder, mono, type }) => (
            <div key={name}>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">{label}</label>
              <input name={name} type={type || 'text'} value={form[name]} onChange={handleChange}
                placeholder={placeholder} maxLength={name === 'org_code' ? 10 : undefined}
                className={`w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                           rounded-xl px-4 py-2.5 text-sm input-focus focus:outline-none transition-all ${mono ? 'font-mono tracking-widest' : ''}`} />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">Admin Password</label>
            <div className="relative">
              <input name="admin_password" type={show ? 'text' : 'password'} value={form.admin_password} onChange={handleChange}
                placeholder="Min 6 characters"
                className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                           rounded-xl px-4 pr-12 py-2.5 text-sm input-focus focus:outline-none transition-all" />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-barlow font-bold uppercase tracking-wide text-slate-400 bg-[#1c2d42] hover:bg-[#263448] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-barlow font-black uppercase tracking-wide text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: loading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <CheckCircle size={14} />}
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TopupModal({ org, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [note,   setNote]   = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount')
    setLoading(true)
    try {
      await api.post(`/super/orgs/${org.id}/topup`, { amount: parseFloat(amount), note })
      onDone()
      onClose()
    } catch (err) {
      setError(err.error || 'Top-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 float-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-barlow font-black text-white uppercase">Top Up Wallet</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2d42] transition-all">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-400 font-mono mb-5">
          <span className="text-amber-400">{org.org_code}</span> · Current: <span className="text-white font-bold">₹{parseFloat(org.balance || 0).toLocaleString('en-IN')}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError('') }}
              placeholder="e.g. 10000" min={1}
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm input-focus focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Q1 budget allocation"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-2.5 text-sm input-focus focus:outline-none transition-all" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-barlow font-black uppercase tracking-wide text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: loading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
            {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Wallet size={14} />}
            {loading ? 'Processing…' : 'Top Up'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function OrgList() {
  const [orgs,     setOrgs]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [topupOrg,   setTopupOrg]   = useState(null)

  useEffect(() => { fetchOrgs() }, [search, page])

  async function fetchOrgs() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page, limit: 20 })
      if (search) p.set('search', search)
      const res = await api.get(`/super/orgs?${p}`)
      setOrgs(res.orgs || [])
      setTotal(res.total || 0)
    } finally { setLoading(false) }
  }

  async function toggleStatus(org) {
    const newStatus = org.status === 'active' ? 'suspended' : 'active'
    await api.patch(`/super/orgs/${org.id}/status`, { status: newStatus })
    fetchOrgs()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <SuperLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Organizations</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">All Orgs</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">{total} organization{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="btn-press flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-barlow font-bold uppercase tracking-wide text-black transition-all"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}>
          <Plus size={14} strokeWidth={2.5} /> New Org
        </button>
      </div>

      {/* Search */}
      <div className="float-in-1 relative mb-5">
        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or org code…"
          className="w-full bg-[#111827] border border-[#1c2d42] text-white placeholder-slate-600
                     rounded-xl pl-10 pr-4 py-2.5 text-sm input-focus focus:outline-none transition-all max-w-sm" />
      </div>

      {/* Table */}
      <div className="float-in-2 bg-[#111827] border border-[#1c2d42] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-[#1c2d42]"
                style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.03), transparent)' }}>
              {['Organization', 'Org Code', 'Wallet Balance', 'Active Batches', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2d42]">
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((__, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="shimmer-bg h-3 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              : orgs.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#1c2d42] flex items-center justify-center mx-auto mb-3">
                      <MoreHorizontal size={20} className="text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-500">No organizations found</p>
                  </td>
                </tr>
              )
              : orgs.map(org => (
                  <tr key={org.id} className="table-row-hover">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-barlow font-bold text-white">{org.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{new Date(org.created_at).toLocaleDateString('en-IN')}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
                        {org.org_code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-barlow font-black text-amber-400">
                      ₹{parseFloat(org.balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-white">
                      {org.active_batches || 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={org.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setTopupOrg(org)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 font-mono transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10">
                          <Wallet size={12} /> Top Up
                        </button>
                        <button onClick={() => toggleStatus(org)}
                          className={`text-xs font-mono px-2.5 py-1.5 rounded-lg transition-colors ${
                            org.status === 'active'
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                          }`}>
                          {org.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c2d42]">
            <span className="text-[11px] text-slate-500 font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">
                Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-[#1c2d42] rounded-lg disabled:opacity-40 text-slate-300 hover:text-white hover:border-[#2a3f5a] transition-all">
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={fetchOrgs} />}
      {topupOrg   && <TopupModal org={topupOrg} onClose={() => setTopupOrg(null)} onDone={fetchOrgs} />}
    </SuperLayout>
  )
}
