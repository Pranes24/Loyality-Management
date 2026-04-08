// Full-page OTP login for /user — Firebase Phone Auth, warm orange design
import React, { useEffect, useRef, useState } from 'react'
import { Smartphone, ShieldCheck, ArrowRight, QrCode } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import api from '../../lib/api'

const BG = 'linear-gradient(150deg, #b45309 0%, #c2410c 20%, #ea580c 45%, #f97316 70%, #f59e0b 100%)'

function Btn({ children, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-4 rounded-2xl font-nunito font-black text-base text-white
        transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2.5"
      style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c, #f59e0b)', boxShadow: '0 8px 24px rgba(194,65,12,0.4)' }}>
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-nunito noise-bg relative"
         style={{ background: BG }}>
      <div id="login-recaptcha" />

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <QrCode size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-white font-black text-lg tracking-wider leading-none drop-shadow block">LoyaltyQR</span>
          <span className="text-white/60 text-[10px] font-semibold tracking-widest uppercase">Rewards</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl w-full max-w-sm mx-auto overflow-hidden relative z-10"
           style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)' }}>

        {/* Step 1: Phone */}
        {step === 1 && (
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #fff7ed, #fed7aa)', boxShadow: '0 4px 16px rgba(234,88,12,0.15)' }}>
                <Smartphone size={30} style={{ color: '#ea580c' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Sign in to LoyaltyQR</h2>
              <p className="text-gray-400 text-sm mt-1.5">
                {pendingQr ? 'Verify your number to claim your reward' : 'We\'ll send a one-time verification code'}
              </p>
            </div>
            <div className="mb-5">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 px-4 py-3.5
                              focus-within:border-orange-400 focus-within:shadow-[0_0_0_3px_rgba(234,88,12,0.1)] transition-all bg-gray-50/60">
                <span className="text-gray-400 font-bold text-sm border-r border-gray-200 pr-3">+91</span>
                <input type="tel" maxLength={10} value={mobile}
                  onChange={e => { setMobile(e.target.value.replace(/\D/g,'')); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  placeholder="9876543210"
                  className="flex-1 text-gray-800 text-xl font-black outline-none bg-transparent placeholder-gray-200"
                  autoFocus />
              </div>
              {error && <p className="text-red-500 text-sm mt-2 text-center font-semibold">{error}</p>}
            </div>
            <Btn onClick={sendOTP} loading={loading}>Send OTP <ArrowRight size={18} strokeWidth={2.5} /></Btn>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', boxShadow: '0 4px 16px rgba(59,130,246,0.15)' }}>
                <ShieldCheck size={30} style={{ color: '#3b82f6' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Verify OTP</h2>
              <p className="text-gray-400 text-sm mt-1.5">Sent to +91 <span className="font-black text-gray-700">{mobile}</span></p>
            </div>
            <div className="flex gap-2 justify-center mb-5">
              {otp.map((d,i) => (
                <input key={i} ref={el => otpRefs.current[i]=el}
                  type="tel" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpInput(e.target.value, i)}
                  onKeyDown={e => handleKey(e, i)}
                  className="w-11 h-14 text-center text-2xl font-black text-gray-800 rounded-2xl border-2 outline-none bg-gray-50 transition-all"
                  style={{ borderColor: d ? '#ea580c' : '#e5e7eb', boxShadow: d ? '0 0 0 3px rgba(234,88,12,0.12)' : undefined }} />
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mb-3 text-center font-semibold">{error}</p>}
            <Btn onClick={() => verifyOTP(null)} loading={loading} disabled={otp.join('').length < 6}>
              Verify &amp; Continue <ArrowRight size={18} strokeWidth={2.5} />
            </Btn>
            <div className="text-center mt-4">
              {timer > 0
                ? <p className="text-xs text-gray-400">Resend in <span className="font-black text-orange-500">{timer}s</span></p>
                : <button onClick={sendOTP} disabled={loading} className="text-sm text-orange-500 font-black hover:text-orange-600">Resend OTP</button>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
