// Self-registration page — create a new org + org_admin account
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, ArrowLeft, CheckCircle, AlertCircle, Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'

export default function RegisterOrgPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    org_name: '', org_code: '', admin_name: '', email: '', password: '',
  })
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
    const { org_name, org_code, admin_name, email, password } = form
    if (!org_name || !org_code || !admin_name || !email || !password) {
      return setError('All fields are required')
    }
    if (org_code.length < 3) return setError('Org code must be at least 3 characters')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    try {
      const res = await api.post('/auth/register', form)
      login(res.token, res.user)
      navigate('/admin')
    } catch (err) {
      setError(err.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center admin-grid-bg px-4 py-12"
         style={{ background: '#070b12' }}>

      <div className="fixed top-0 right-1/3 w-96 h-96 rounded-full pointer-events-none orb-pulse"
           style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.05), transparent 70%)' }} />

      <div className="w-full max-w-md float-in">
        {/* Back */}
        <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm font-mono mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/20">
              <Building2 size={18} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Register Org</h1>
          </div>
          <p className="text-sm text-slate-500 font-mono">Create your organization and admin account</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-8 space-y-5"
             style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Org Name */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                Organization Name <span className="text-amber-500">*</span>
              </label>
              <input name="org_name" value={form.org_name} onChange={handleChange}
                placeholder="e.g. Ramco Cements"
                className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                           rounded-xl px-4 py-3 text-sm input-focus focus:outline-none transition-all" />
            </div>

            {/* Org Code */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                Org Code <span className="text-amber-500">*</span>
              </label>
              <input name="org_code" value={form.org_code} onChange={handleChange}
                placeholder="e.g. RAMCO"
                maxLength={10}
                className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                           rounded-xl px-4 py-3 text-sm font-mono input-focus focus:outline-none transition-all tracking-widest" />
              <p className="text-[10px] text-slate-600 mt-1.5 font-mono">3–10 uppercase letters/numbers · auto-converted</p>
            </div>

            <div className="border-t border-[#1c2d42] pt-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-600 mb-3">Admin Account</p>

              {/* Admin Name */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Your Name <span className="text-amber-500">*</span>
                  </label>
                  <input name="admin_name" value={form.admin_name} onChange={handleChange}
                    placeholder="e.g. Vikram Kumar"
                    className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                               rounded-xl px-4 py-3 text-sm input-focus focus:outline-none transition-all" />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Email <span className="text-amber-500">*</span>
                  </label>
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="admin@company.com"
                    className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                               rounded-xl px-4 py-3 text-sm input-focus focus:outline-none transition-all" />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                    Password <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input name="password" type={show ? 'text' : 'password'} value={form.password} onChange={handleChange}
                      placeholder="Min 6 characters"
                      className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                                 rounded-xl px-4 pr-12 py-3 text-sm input-focus focus:outline-none transition-all" />
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn-press w-full py-3 rounded-xl font-barlow font-black uppercase tracking-wider text-sm text-black
                         flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: loading ? '#6b7280' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
              }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating org…</>
                : <><CheckCircle size={15} strokeWidth={2.5} /> Create Organization</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
