// Mobile-first user redemption flow — Firebase Phone Auth + premium warm design
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  QrCode, Smartphone, ShieldCheck, User, Wallet,
  CheckCircle, Clock, AlertCircle, Gift, XCircle, ArrowRight, Banknote, PiggyBank, MessageSquare
} from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth }          from '../../lib/firebase'
import StepIndicator     from '../../components/user/StepIndicator'
import api               from '../../lib/api'

const BG = 'linear-gradient(150deg, #b45309 0%, #c2410c 20%, #ea580c 45%, #f97316 70%, #f59e0b 100%)'

// ── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#fff', '#fef08a', '#fde68a', '#fed7aa', '#fdba74', '#fca5a5', '#d9f99d']
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_, i) => {
        const left  = 5 + (i * 4.3) % 90
        const delay = (i * 0.06).toFixed(2)
        const size  = 5 + (i % 5) * 3
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const shape = i % 3 === 0 ? '2px' : i % 3 === 1 ? '50%' : '1px'
        return (
          <div key={i} className="particle absolute"
            style={{
              left: `${left}%`, bottom: '15%',
              width: size, height: size,
              background: color, borderRadius: shape,
              animationDelay: `${delay}s`,
              animationDuration: `${1.1 + (i % 4) * 0.25}s`,
            }}
          />
        )
      })}
    </div>
  )
}

// ── Shared card ───────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-3xl w-full max-w-sm mx-auto overflow-hidden ${className}`}
         style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)' }}>
      {children}
    </div>
  )
}

// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading, disabled, className = '' }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`w-full py-4 rounded-2xl font-nunito font-black text-base text-white
        transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2.5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #c2410c, #ea580c, #f59e0b)',
        boxShadow: '0 8px 24px rgba(194,65,12,0.4)',
      }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : children
      }
    </button>
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ error }) {
  const CONFIG = {
    QR_NOT_FOUND:     { icon: XCircle,     color: '#ef4444', title: 'Invalid QR Code',     msg: 'This QR code is not valid or does not exist.' },
    QR_NOT_ACTIVATED: { icon: Clock,       color: '#f59e0b', title: 'Not Activated Yet',   msg: 'This QR code has not been funded yet. Check back later.' },
    QR_EXPIRED:       { icon: Clock,       color: '#f97316', title: 'Offer Expired',       msg: 'This QR code has passed its expiry date.' },
    QR_ALREADY_USED:  { icon: CheckCircle, color: '#22c55e', title: 'Already Redeemed',    msg: 'This QR code has already been used.' },
    BATCH_PAUSED:     { icon: AlertCircle, color: '#eab308', title: 'Temporarily Paused',  msg: 'This offer is paused. Please try again later.' },
  }
  const cfg  = CONFIG[error?.code] || { icon: XCircle, color: '#ef4444', title: 'Something went wrong', msg: error?.message || 'Please try again.' }
  const Icon = cfg.icon
  return (
    <div className="min-h-screen flex items-center justify-center p-4 noise-bg relative" style={{ background: BG }}>
      <Card className="p-8 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
             style={{ background: `${cfg.color}15`, border: `1.5px solid ${cfg.color}30` }}>
          <Icon size={38} style={{ color: cfg.color }} />
        </div>
        <h2 className="text-xl font-nunito font-black text-gray-800 mb-2">{cfg.title}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{cfg.msg}</p>
      </Card>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RedeemFlow() {
  const { qrId } = useParams()
  const DEMO_QR  = qrId || 'demo-qr-id'

  const [step,               setStep]               = useState(0)
  const [qrError,            setQrError]            = useState(null)
  const [mobile,             setMobile]             = useState('')
  const [otp,                setOtp]                = useState(['','','','','',''])
  const [userId,             setUserId]             = useState('')
  const [name,               setName]               = useState('')
  const [savedUpi,           setSavedUpi]           = useState('')
  const [amount,             setAmount]             = useState(null)
  const [qrMeta,             setQrMeta]             = useState(null)
  const [upiId,              setUpiId]              = useState('')
  const [action,             setAction]             = useState('redeemed')
  const [reason,             setReason]             = useState('')
  const [result,             setResult]             = useState(null)
  const [loading,            setLoading]            = useState(false)
  const [otpTimer,           setOtpTimer]           = useState(0)
  const [error,              setError]              = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)

  const otpRefs          = useRef([])
  const recaptchaRef     = useRef(null)
  const clearError       = useCallback(() => setError(''), [])

  useEffect(() => {
    if (DEMO_QR === 'demo-qr-id') { setStep(1); return }
    api.get(`/redeem/${DEMO_QR}/check`)
      .then(res => {
        if (!res.valid) { setQrError({ code: res.error, message: res.message }); setStep(-1) }
        else setStep(1)
      })
      .catch(() => { setQrError({ code: 'QR_NOT_FOUND', message: 'Unable to validate QR.' }); setStep(-1) })
  }, [])

  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setInterval(() => setOtpTimer(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [otpTimer])

  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }, [step])

  // ── Build / reset reCAPTCHA verifier ─────────────────────────────────────
  function buildRecaptchaVerifier() {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear() } catch (_) {}
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { setError('reCAPTCHA expired. Please try again.') },
    })
    return recaptchaRef.current
  }

  // ── Send OTP via Firebase ─────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!mobile.match(/^[6-9]\d{9}$/)) return setError('Enter a valid 10-digit mobile number')
    setLoading(true); clearError()
    try {
      const verifier     = buildRecaptchaVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${mobile}`, verifier)
      setConfirmationResult(confirmation)
      setOtpTimer(30); setStep(2)
    } catch (e) {
      console.error('Firebase sendOTP error:', e.code, e.message)
      if (e.code === 'auth/too-many-requests')       setError('Too many attempts. Please wait and try again.')
      else if (e.code === 'auth/invalid-phone-number') setError('Invalid phone number format.')
      else setError(`OTP error: ${e.code || e.message}`)
    } finally { setLoading(false) }
  }

  // ── OTP input helpers ─────────────────────────────────────────────────────
  function handleOtpInput(val, idx) {
    const digits = [...otp]
    digits[idx] = val.replace(/\D/g, '').slice(-1)
    setOtp(digits); clearError()
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
    if (digits.every(d => d) && val) {
      setTimeout(() => handleVerifyOTPWith(digits), 80)
    }
  }
  function handleOtpKey(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const digits = [...otp]; digits[idx - 1] = ''
      setOtp(digits); otpRefs.current[idx - 1]?.focus()
    }
  }

  // ── Verify OTP with Firebase, then send idToken to backend ───────────────
  async function handleVerifyOTPWith(digits) {
    const code = (digits || otp).join('')
    if (code.length < 6) return setError('Enter the complete 6-digit OTP')
    if (!confirmationResult) return setError('Session expired. Please request a new OTP.')
    setLoading(true); clearError()
    try {
      const firebaseResult = await confirmationResult.confirm(code)
      const idToken        = await firebaseResult.user.getIdToken()

      const res = await api.post('/redeem/otp/verify', { idToken, qr_id: DEMO_QR })
      setUserId(res.userId)
      localStorage.setItem('loyalty_user_id', res.userId)
      localStorage.setItem('loyalty_user_mobile', mobile)
      if (res.name)       setName(res.name)
      if (res.savedUpiId) { setSavedUpi(res.savedUpiId); setUpiId(res.savedUpiId) }
      setStep(3)
    } catch (e) {
      console.error('Firebase verifyOTP error:', e)
      if (e.code === 'auth/invalid-verification-code') setError('Incorrect OTP. Please try again.')
      else if (e.code === 'auth/code-expired') setError('OTP expired. Please request a new one.')
      else setError(e.error || 'Verification failed. Please try again.')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  async function handleResendOTP() {
    setLoading(true)
    try {
      const verifier     = buildRecaptchaVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${mobile}`, verifier)
      setConfirmationResult(confirmation)
      setOtpTimer(30); setOtp(['','','','','','']); clearError()
    } catch (e) {
      setError('Failed to resend OTP. Please try again.')
    } finally { setLoading(false) }
  }

  async function handleConfirmScan() {
    if (!name.trim() || name.trim().length < 2) return setError('Please enter your name (min 2 characters)')
    setLoading(true); clearError()
    try {
      const res = await api.post('/redeem/confirm-scan', {
        qr_id: DEMO_QR, user_id: userId, user_name: name.trim(), user_mobile: mobile
      })
      setAmount(res.amount)
      setQrMeta({ batchId: res.batchId, batchCode: res.batchCode, productName: res.productName })
      setStep(4)
    } catch (e) { setError(e.error || 'Confirmation failed') }
    finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (action === 'redeemed'       && !upiId.trim())            return setError('Enter your UPI ID')
    if (action === 'pending_reason' && reason.trim().length < 5) return setError('Provide a reason (min 5 characters)')
    setLoading(true); clearError()
    try {
      const res = await api.post('/redeem/submit', {
        qr_id: DEMO_QR, user_id: userId, action,
        upi_id:  action === 'redeemed'       ? upiId.trim()  : undefined,
        reason:  action === 'pending_reason' ? reason.trim() : undefined,
        batch_id: qrMeta?.batchId, batch_code: qrMeta?.batchCode, product_name: qrMeta?.productName,
      })
      setResult(res); setStep(5)
    } catch (e) { setError(e.error || 'Submission failed') }
    finally { setLoading(false) }
  }

  if (step === -1) return <ErrorScreen error={qrError} />

  if (step === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="w-10 h-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-nunito noise-bg relative"
         style={{ background: BG }}>

      {/* Invisible reCAPTCHA container — required by Firebase */}
      <div id="recaptcha-container" />

      {/* Brand bar */}
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

      {step < 5 && (
        <div className="mb-5 w-full max-w-sm relative z-10">
          <StepIndicator current={step} total={5} />
        </div>
      )}

      {/* ── Step 1: Mobile ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #fff7ed, #fed7aa)', boxShadow: '0 4px 16px rgba(234,88,12,0.15)' }}>
                <Smartphone size={30} style={{ color: '#ea580c' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Enter Mobile Number</h2>
              <p className="text-gray-400 text-sm mt-1.5">We'll send a one-time verification code</p>
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 px-4 py-3.5
                              focus-within:border-orange-400 focus-within:shadow-[0_0_0_3px_rgba(234,88,12,0.1)] transition-all bg-gray-50/60">
                <span className="text-gray-400 font-bold text-sm border-r border-gray-200 pr-3">+91</span>
                <input
                  type="tel" maxLength={10} value={mobile}
                  onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); clearError() }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  placeholder="9876543210"
                  className="flex-1 text-gray-800 text-xl font-black outline-none bg-transparent placeholder-gray-200"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm mt-2 text-center font-semibold">{error}</p>}
            </div>

            <PrimaryBtn onClick={handleSendOTP} loading={loading}>
              Send OTP <ArrowRight size={18} strokeWidth={2.5} />
            </PrimaryBtn>
          </div>
        </Card>
      )}

      {/* ── Step 2: OTP ─────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', boxShadow: '0 4px 16px rgba(59,130,246,0.15)' }}>
                <ShieldCheck size={30} style={{ color: '#3b82f6' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Verify OTP</h2>
              <p className="text-gray-400 text-sm mt-1.5">Sent to +91 <span className="font-black text-gray-700">{mobile}</span></p>
            </div>

            {/* OTP boxes */}
            <div className="flex gap-2 justify-center mb-5">
              {otp.map((d, i) => (
                <input key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="tel" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleOtpInput(e.target.value, i)}
                  onKeyDown={e => handleOtpKey(e, i)}
                  className="otp-input w-11 h-14 text-center text-2xl font-black text-gray-800 rounded-2xl
                    border-2 transition-all duration-150 outline-none bg-gray-50 focus:bg-white"
                  style={{
                    borderColor: d ? '#ea580c' : '#e5e7eb',
                    boxShadow: d
                      ? '0 0 0 3px rgba(234,88,12,0.12), 0 2px 6px rgba(234,88,12,0.1)'
                      : 'inset 0 1px 3px rgba(0,0,0,0.05)',
                    transform: d ? 'scale(1.04)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm mb-3 text-center font-semibold">{error}</p>}

            <PrimaryBtn onClick={() => handleVerifyOTPWith(null)} loading={loading}
              disabled={otp.join('').length < 6}>
              Verify OTP <ArrowRight size={18} strokeWidth={2.5} />
            </PrimaryBtn>

            <div className="text-center mt-4">
              {otpTimer > 0
                ? <p className="text-xs text-gray-400 font-medium">Resend in <span className="font-black text-orange-500">{otpTimer}s</span></p>
                : <button onClick={handleResendOTP} disabled={loading}
                    className="text-sm text-orange-500 font-black hover:text-orange-600 transition-colors">
                    Resend OTP
                  </button>
              }
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 3: Name + scan confirmation ────────────────────────── */}
      {step === 3 && (
        <Card>
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', boxShadow: '0 4px 16px rgba(139,92,246,0.15)' }}>
                <User size={30} style={{ color: '#8b5cf6' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">Your Details</h2>
              <p className="text-gray-400 text-sm mt-1.5">Almost there!</p>
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Your Name</label>
              <input value={name}
                onChange={e => { setName(e.target.value); clearError() }}
                onKeyDown={e => e.key === 'Enter' && handleConfirmScan()}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3.5 text-gray-800 bg-gray-50
                           font-semibold text-sm focus:border-purple-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] outline-none transition-all"
              />
            </div>

            {/* Scan again box */}
            <div className="rounded-2xl p-4 mb-5 flex items-start gap-3 relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid #fed7aa' }}>
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg viewBox="0 0 40 40" className="w-10 h-10">
                  <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="#ea580c" strokeWidth="2"/>
                  <rect x="5" y="5" width="10" height="10" rx="1" fill="#ea580c" opacity="0.25"/>
                  <rect x="22" y="2" width="16" height="16" rx="2" fill="none" stroke="#ea580c" strokeWidth="2"/>
                  <rect x="25" y="5" width="10" height="10" rx="1" fill="#ea580c" opacity="0.25"/>
                  <rect x="2" y="22" width="16" height="16" rx="2" fill="none" stroke="#ea580c" strokeWidth="2"/>
                  <rect x="5" y="25" width="10" height="10" rx="1" fill="#ea580c" opacity="0.25"/>
                  <rect x="22" y="22" width="5" height="5" rx="0.5" fill="#ea580c"/>
                  <rect x="29" y="22" width="5" height="5" rx="0.5" fill="#ea580c"/>
                  <rect x="22" y="29" width="5" height="5" rx="0.5" fill="#ea580c"/>
                  <rect x="33" y="29" width="5" height="5" rx="0.5" fill="#ea580c"/>
                </svg>
                <div className="scan-line absolute left-0 right-0 h-0.5 rounded"
                     style={{ background: 'rgba(234,88,12,0.8)', boxShadow: '0 0 6px rgba(234,88,12,0.6)' }} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-800">Scan Again to Confirm</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">Physically scan the QR code once more to verify</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-3 text-center font-semibold">{error}</p>}
            <PrimaryBtn onClick={handleConfirmScan} loading={loading}>
              Confirm &amp; See Reward <ArrowRight size={18} strokeWidth={2.5} />
            </PrimaryBtn>
          </div>
        </Card>
      )}

      {/* ── Step 4: Reward reveal + choice ──────────────────────────── */}
      {step === 4 && (
        <Card>
          {/* Reward header */}
          <div className="relative pt-8 pb-5 px-7 text-center overflow-hidden"
               style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)' }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-30"
                 style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', boxShadow: '0 4px 16px rgba(245,158,11,0.2)' }}>
              <Gift size={26} style={{ color: '#d97706' }} />
            </div>
            <p className="text-gray-500 text-sm font-semibold">Congrats, <span className="text-gray-700 font-black">{name}</span>!</p>
            <div className="amount-pop mt-2 pb-1">
              <p className="text-6xl font-black leading-none" style={{ color: '#c2410c' }}>₹{amount}</p>
              <p className="text-sm text-gray-400 mt-1.5 font-semibold">Choose how to receive it</p>
            </div>
          </div>

          <div className="px-5 pb-7 pt-4">
            {/* 3 option cards */}
            <div className="space-y-2.5 mb-5">
              {[
                {
                  val: 'redeemed', icon: Banknote,
                  label: 'Instant UPI Transfer', desc: `₹${amount} sent to your UPI right away`,
                  border: action === 'redeemed' ? '#22c55e' : '#e5e7eb',
                  ring: action === 'redeemed' ? 'rgba(34,197,94,0.12)' : 'transparent',
                  iconColor: '#16a34a', iconBg: '#dcfce7',
                },
                {
                  val: 'wallet_credited', icon: PiggyBank,
                  label: 'Add to Wallet', desc: 'Save up and withdraw anytime',
                  border: action === 'wallet_credited' ? '#06b6d4' : '#e5e7eb',
                  ring: action === 'wallet_credited' ? 'rgba(6,182,212,0.12)' : 'transparent',
                  iconColor: '#0891b2', iconBg: '#cffafe',
                },
                {
                  val: 'pending_reason', icon: MessageSquare,
                  label: 'Not Now', desc: 'Save this for later, tell us why',
                  border: action === 'pending_reason' ? '#f97316' : '#e5e7eb',
                  ring: action === 'pending_reason' ? 'rgba(249,115,22,0.12)' : 'transparent',
                  iconColor: '#ea580c', iconBg: '#ffedd5',
                },
              ].map(opt => (
                <button key={opt.val} onClick={() => { setAction(opt.val); clearError() }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: opt.border,
                    boxShadow: `0 0 0 3px ${opt.ring}`,
                    background: action === opt.val
                      ? `linear-gradient(135deg, ${opt.iconBg}, white)`
                      : 'white',
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: opt.iconBg }}>
                    <opt.icon size={20} style={{ color: opt.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                       style={{ borderColor: action === opt.val ? opt.iconColor : '#e5e7eb' }}>
                    {action === opt.val && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.iconColor }} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* UPI input */}
            {action === 'redeemed' && (
              <div className="mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Your UPI ID</label>
                <input value={upiId} onChange={e => { setUpiId(e.target.value); clearError() }}
                  placeholder="name@upi or 9876543210@paytm"
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                             bg-gray-50 focus:border-orange-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(234,88,12,0.1)] outline-none transition-all" />
                {savedUpi && <p className="text-xs text-green-500 mt-1.5 font-bold">✓ Pre-filled with your saved UPI ID</p>}
              </div>
            )}

            {/* Reason */}
            {action === 'pending_reason' && (
              <div className="mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Reason</label>
                <textarea value={reason} onChange={e => { setReason(e.target.value); clearError() }}
                  rows={3} placeholder="Tell us why you're not redeeming right now…"
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                             bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all resize-none" />
              </div>
            )}

            {error && <p className="text-red-500 text-sm mb-3 text-center font-semibold">{error}</p>}

            <PrimaryBtn onClick={handleSubmit} loading={loading}>
              {action === 'redeemed'        ? `Redeem ₹${amount} Now`      : ''}
              {action === 'wallet_credited'  ? `Add ₹${amount} to Wallet`   : ''}
              {action === 'pending_reason'   ? 'Submit Response'            : ''}
            </PrimaryBtn>
          </div>
        </Card>
      )}

      {/* ── Step 5: Success ──────────────────────────────────────────── */}
      {step === 5 && (
        <div className="w-full max-w-sm mx-auto">
          <Card className="relative overflow-visible">
            <Confetti />

            {action === 'redeemed' && (
              <div className="px-7 pt-8 pb-7 text-center relative z-10">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 success-ring"
                     style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', boxShadow: '0 0 50px rgba(34,197,94,0.28)' }}>
                  <CheckCircle size={46} style={{ color: '#16a34a' }} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-1">Payment Initiated!</h2>
                <p className="text-gray-500 text-sm mb-5">₹{amount} is on its way to your UPI</p>
                <div className="bg-gray-50/80 rounded-2xl p-4 text-left space-y-3 border border-gray-100 mb-5">
                  {[
                    { label: 'Amount', value: `₹${amount}`, cls: 'font-black text-gray-800 text-base' },
                    { label: 'UPI ID', value: upiId,         cls: 'font-mono text-xs text-gray-600' },
                    ...(result?.txnId ? [{ label: 'Txn ID', value: result.txnId, cls: 'font-mono text-xs text-gray-500' }] : []),
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 font-medium">{label}</span>
                      <span className={`text-sm ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <PrimaryBtn onClick={() => window.location.href = '/user'}>
                  View My Dashboard <ArrowRight size={16} />
                </PrimaryBtn>
              </div>
            )}

            {action === 'wallet_credited' && (
              <div className="px-7 pt-8 pb-7 text-center relative z-10">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 success-ring"
                     style={{ background: 'linear-gradient(135deg, #cffafe, #a5f3fc)', boxShadow: '0 0 50px rgba(6,182,212,0.28)' }}>
                  <Wallet size={44} style={{ color: '#0891b2' }} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-1">Added to Wallet!</h2>
                <p className="text-gray-500 text-sm mb-4">₹{amount} is now in your balance</p>
                <div className="rounded-2xl py-5 px-6 mb-5"
                     style={{ background: 'linear-gradient(135deg, #ecfeff, #f0fdff)', border: '1.5px solid #a5f3fc' }}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Wallet Balance</p>
                  <p className="text-4xl font-black" style={{ color: '#0891b2' }}>
                    ₹{result?.walletBalance?.toFixed(2) || amount}
                  </p>
                </div>
                <PrimaryBtn onClick={() => window.location.href = '/user'}>
                  View My Dashboard <ArrowRight size={16} />
                </PrimaryBtn>
              </div>
            )}

            {action === 'pending_reason' && (
              <div className="px-7 pt-8 pb-7 text-center relative z-10">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 success-ring"
                     style={{ background: 'linear-gradient(135deg, #ffedd5, #fed7aa)', boxShadow: '0 0 50px rgba(249,115,22,0.22)' }}>
                  <CheckCircle size={44} style={{ color: '#ea580c' }} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-1">Response Recorded</h2>
                <p className="text-gray-500 text-sm leading-relaxed mt-2 mb-5">
                  Thank you! Your feedback has been noted.<br />
                  You can still redeem this QR later.
                </p>
                <PrimaryBtn onClick={() => window.location.href = '/user'}>
                  View My Dashboard <ArrowRight size={16} />
                </PrimaryBtn>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
