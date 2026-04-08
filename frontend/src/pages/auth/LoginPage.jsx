// Login page — email + password for org_admin and super_admin
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) return setError('Email and password are required')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.token, res.user)
      navigate(res.user.role === 'super_admin' ? '/super' : '/admin')
    } catch (err) {
      setError(err.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center admin-grid-bg px-4"
         style={{ background: '#070b12' }}>

      {/* Ambient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none orb-pulse"
           style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06), transparent 70%)' }} />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none orb-pulse"
           style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.05), transparent 70%)', animationDelay: '1.5s' }} />

      <div className="w-full max-w-md float-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 8px 32px rgba(245,158,11,0.35)' }}>
            <Zap size={28} strokeWidth={2.5} className="text-black" />
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Loyalty Platform</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-8 space-y-5"
             style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="admin@company.com"
                  className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                             rounded-xl pl-10 pr-4 py-3 text-sm input-focus focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="password" type={show ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                             rounded-xl pl-10 pr-12 py-3 text-sm input-focus focus:outline-none transition-all"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
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
                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Signing in…</>
                : <><Zap size={15} strokeWidth={2.5} /> Sign In</>
              }
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-xs text-slate-600 font-mono pt-2 border-t border-[#1c2d42]">
            New organization?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
