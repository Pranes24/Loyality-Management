// Full-page OTP login for /user — Firebase Phone Auth, dark theme matching UserApp
import React, { useEffect, useRef, useState } from 'react'
import { Smartphone, ShieldCheck, ArrowRight, QrCode, Sparkles } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import api from '../../lib/api'

function Btn({ children, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-4 rounded-2xl font-barlow font-black text-base text-white
        transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2.5"
      style={{
        background: loading || disabled
          ? 'rgba(245,158,11,0.3)'
          : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
        boxShadow: loading || disabled ? 'none' : '0 8px 28px rgba(245,158,11,0.35)',
      }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : children}
    </button>
  )
}

export default function UserLogin({ onLogin, pendingQr }) {
  const [step,    setStep]    = useState(1)
  const [mobile,  setMobile]  = useState('')
  const [otp,     setOtp]     = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [timer,   setTimer]   = useState(0)
  const [confirm, setConfirm] = useState(null)
  const otpRefs      = useRef([])
  const recaptchaRef = useRef(null)

  useEffect(() => {
    if (timer <= 0) return
    const t = setInterval(() => setTimer(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [timer])

  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }, [step])

  function buildVerifier() {
    if (recaptchaRef.current) try { recaptchaRef.current.clear() } catch(_) {}
    recaptchaRef.current = new RecaptchaVerifier(auth, 'login-recaptcha', { size: 'invisible' })
    return recaptchaRef.current
  }

  async function sendOTP() {
    if (!mobile.match(/^[6-9]\d{9}$/)) return setError('Enter a valid 10-digit mobile number')
    setLoading(true); setError('')
    try {
      const v = buildVerifier()
      const c = await signInWithPhoneNumber(auth, `+91${mobile}`, v)
      setConfirm(c); setTimer(30); setStep(2)
    } catch(e) {
      if (e.code === 'auth/too-many-requests') setError('Too many attempts. Please wait.')
      else setError(`OTP error: ${e.code || e.message}`)
    } finally { setLoading(false) }
  }

  function handleOtpInput(val, idx) {
    const d = [...otp]; d[idx] = val.replace(/\D/g,'').slice(-1)
    setOtp(d); setError('')
    if (val && idx < 5) otpRefs.current[idx+1]?.focus()
    if (d.every(x=>x) && val) setTimeout(() => verifyOTP(d), 80)
  }

  function handleKey(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const d = [...otp]; d[idx-1] = ''; setOtp(d); otpRefs.current[idx-1]?.focus()
    }
  }

  async function verifyOTP(digits) {
    const code = (digits || otp).join('')
    if (code.length < 6) return setError('Enter the complete 6-digit OTP')
    setLoading(true); setError('')
    try {
      const firebaseResult = await confirm.confirm(code)
      const idToken = await firebaseResult.user.getIdToken()
      const res = await api.post('/user-wallet/login', { idToken })
      localStorage.setItem('loyalty_user_id',     res.userId)
      localStorage.setItem('loyalty_user_mobile',  mobile)
      if (res.name) localStorage.setItem('loyalty_user_name', res.name)
      onLogin(res.userId, mobile, res.name || '', res.savedUpiId || '')
    } catch(e) {
      if (e.code === 'auth/invalid-verification-code') setError('Incorrect OTP')
      else if (e.code === 'auth/code-expired') setError('OTP expired. Resend.')
      else setError(e.error || 'Verification failed')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-barlow relative overflow-hidden"
         style={{ background: '#080d1a' }}>

      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse, #f59e0b 0%, transparent 65%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', filter: 'blur(50px)' }} />

      <div id="login-recaptcha" />

      {/* Brand mark */}
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.2))', border: '1px solid rgba(245,158,11,0.3)' }}>
          <QrCode size={20} style={{ color: '#f59e0b' }} strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-white font-black text-xl tracking-wider leading-none block"
                style={{ fontFamily: "'Barlow', sans-serif" }}>LoyaltyQR</span>
          <span className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: '#f59e0b99' }}>Rewards Platform</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10 rounded-3xl overflow-hidden"
           style={{ background: '#111827', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>

        {/* Amber top accent line */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, #ea580c, transparent)' }} />

        {/* Step 1 — Phone number */}
        {step === 1 && (
          <div className="px-7 pt-8 pb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 relative"
                   style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Smartphone size={28} style={{ color: '#f59e0b' }} strokeWidth={2} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                     style={{ background: '#f59e0b' }}>
                  <Sparkles size={9} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">Sign In</h2>
              <p className="text-sm mt-1.5 leading-relaxed"
                 style={{ color: '#94a3b8' }}>
                {pendingQr
                  ? 'Verify your number to claim your reward'
                  : "We'll send a one-time verification code"}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-mono uppercase tracking-[0.18em] mb-2"
                     style={{ color: '#64748b' }}>Mobile Number</label>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all"
                   style={{ background: '#1e293b', border: '1.5px solid rgba(245,158,11,0.15)' }}
                   onFocus={() => {}} onBlur={() => {}}>
                <span className="font-mono font-bold text-sm pr-3"
                      style={{ color: '#f59e0b', borderRight: '1px solid rgba(245,158,11,0.2)' }}>+91</span>
                <input type="tel" maxLength={10} value={mobile}
                  onChange={e => { setMobile(e.target.value.replace(/\D/g,'')); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  placeholder="9876543210"
                  className="flex-1 text-xl font-black outline-none bg-transparent placeholder-slate-700"
                  style={{ color: '#f1f5f9' }}
                  autoFocus />
              </div>
              {error && (
                <p className="text-sm mt-2.5 text-center font-semibold" style={{ color: '#f87171' }}>{error}</p>
              )}
            </div>

            <Btn onClick={sendOTP} loading={loading}>
              Send OTP <ArrowRight size={18} strokeWidth={2.5} />
            </Btn>

            <p className="text-center text-xs mt-5" style={{ color: '#475569' }}>
              By continuing you agree to our{' '}
              <span className="cursor-pointer" style={{ color: '#f59e0b' }}>Terms of Service</span>
            </p>
          </div>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <div className="px-7 pt-8 pb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}>
                <ShieldCheck size={28} style={{ color: '#22d3ee' }} strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">Verify OTP</h2>
              <p className="text-sm mt-1.5" style={{ color: '#94a3b8' }}>
                Sent to +91{' '}
                <span className="font-black" style={{ color: '#f1f5f9' }}>{mobile}</span>
              </p>
            </div>

            {/* OTP boxes */}
            <div className="flex gap-2.5 justify-center mb-6">
              {otp.map((d, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el}
                  type="tel" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpInput(e.target.value, i)}
                  onKeyDown={e => handleKey(e, i)}
                  className="w-11 h-14 text-center text-2xl font-black rounded-2xl outline-none transition-all"
                  style={{
                    background: d ? 'rgba(245,158,11,0.12)' : '#1e293b',
                    border: `2px solid ${d ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                    color: '#f1f5f9',
                    boxShadow: d ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none',
                  }} />
              ))}
            </div>

            {error && (
              <p className="text-sm mb-4 text-center font-semibold" style={{ color: '#f87171' }}>{error}</p>
            )}

            <Btn onClick={() => verifyOTP(null)} loading={loading} disabled={otp.join('').length < 6}>
              Verify &amp; Continue <ArrowRight size={18} strokeWidth={2.5} />
            </Btn>

            <div className="text-center mt-5">
              {timer > 0
                ? <p className="text-xs" style={{ color: '#64748b' }}>
                    Resend in{' '}
                    <span className="font-black tabular-nums" style={{ color: '#f59e0b' }}>{timer}s</span>
                  </p>
                : <button onClick={sendOTP} disabled={loading}
                    className="text-sm font-black hover:opacity-80 transition-opacity"
                    style={{ color: '#f59e0b' }}>
                    Resend OTP
                  </button>
              }
            </div>

            <button onClick={() => { setStep(1); setOtp(['','','','','','']); setError('') }}
              className="w-full text-center text-xs mt-3 hover:opacity-80 transition-opacity"
              style={{ color: '#475569' }}>
              ← Change number
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <p className="mt-6 text-xs relative z-10" style={{ color: '#334155' }}>
        Secured by Firebase Authentication
      </p>
    </div>
  )
}
