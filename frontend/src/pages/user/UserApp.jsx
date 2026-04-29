// User app — responsive dashboard for web + mobile (stats, scanner, wallet, profile)
import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QrCode, Wallet, User, Home, ScanLine, ArrowDownLeft, ArrowUpRight,
         ChevronRight, ShieldCheck, LogOut, Edit2, Check, X, Zap } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import api from '../../lib/api'
import UserLogin    from './UserLogin'
import RedeemPopup  from './RedeemPopup'

const fmtRs   = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const mask    = m => m ? `${m.slice(0,2)}••••${m.slice(-4)}` : ''

function getUserFromStorage() {
  return {
    id:     localStorage.getItem('loyalty_user_id')     || '',
    mobile: localStorage.getItem('loyalty_user_mobile') || '',
    name:   localStorage.getItem('loyalty_user_name')   || '',
  }
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="flex-1 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden"
         style={{ background: '#161b2e', border: `1px solid ${color}22` }}>
      <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-10"
           style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
           style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-xl font-barlow font-black text-white leading-none">{value}</p>
    </div>
  )
}

// ── Manual entry (damaged QR fallback) ────────────────────────────────────────
function ManualEntryForm({ onScan, onBack }) {
  const [shortId,  setShortId]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const id = shortId.trim().toLowerCase()
    if (!id) return setError('Please enter the ID from your sticker')
    if (!/^[0-9a-f]{8}$/i.test(id)) return setError('ID must be exactly 8 characters (letters A–F and numbers 0–9)')
    setLoading(true); setError('')
    try {
      const res = await api.post('/redeem/by-short-id', { short_id: id })
      if (res.valid) onScan(res.qr_id)
      else setError(res.message || 'QR not found')
    } catch (err) {
      setError(err.message || err.error || 'Lookup failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-10">
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <span>←</span> Back to scanner
        </button>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 mx-auto"
             style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)' }}>
          <QrCode size={28} className="text-cyan-400" />
        </div>
        <h2 className="text-xl font-barlow font-black text-white uppercase tracking-wide text-center mb-1">Enter Sticker ID</h2>
        <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
          Type the 8-character ID printed at the bottom of the sticker (e.g. <span className="font-mono text-cyan-400">A1B2C3D4</span>).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2">
              Sticker ID (printed below QR)
            </label>
            <input
              value={shortId}
              onChange={e => { setShortId(e.target.value.toUpperCase()); setError('') }}
              placeholder="e.g. A1B2C3D4"
              maxLength={8}
              autoCapitalize="characters"
              className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                         rounded-xl px-4 py-3 text-lg font-mono tracking-[0.3em] text-center
                         focus:outline-none focus:border-cyan-500/50 transition-all"
            />
            <p className="text-[10px] font-mono text-slate-600 mt-1 text-center">
              {shortId.length}/8 characters
            </p>
          </div>
          {error && (
            <p className="text-red-400 text-sm font-medium bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || shortId.length !== 8}
            className="w-full py-3.5 rounded-2xl font-barlow font-black uppercase tracking-wide text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', color: '#000', boxShadow: '0 4px 16px rgba(34,211,238,0.25)' }}>
            {loading
              ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
              : 'Find & Claim Reward'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ── QR scanner ────────────────────────────────────────────────────────────────
function ScannerTab({ onScan }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const [active,   setActive]   = useState(false)
  const [scanned,  setScanned]  = useState(null)
  const [error,    setError]    = useState('')
  const [manual,   setManual]   = useState(false)

  if (manual) return <ManualEntryForm onScan={onScan} onBack={() => setManual(false)} />

  async function startCamera() {
    setError(''); setScanned(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setActive(true)
      tick()
    } catch { setError('Camera permission denied. Please allow camera access.') }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  async function tick() {
    if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return }
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    canvas.width  = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const jsQR = (await import('jsqr')).default
    const code = jsQR(img.data, img.width, img.height)
    if (code) {
      stopCamera(); setScanned(code.data)
      const match = code.data.match(/\/redeem\/([a-f0-9-]{36})/i)
      if (match) onScan(match[1])
      else { setScanned(null); setError('Not a valid LoyaltyQR code. Try again.') }
    } else { rafRef.current = requestAnimationFrame(tick) }
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-10 text-center">
      {!active && !scanned && (
        <>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
               style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <ScanLine size={40} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-barlow font-black text-white uppercase tracking-wide mb-2">Scan QR Code</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-sm">
            Point your camera at any LoyaltyQR code on a product to claim your reward.
          </p>
          {error && <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>}
          <button onClick={startCamera}
            className="px-8 py-3.5 rounded-2xl font-barlow font-black uppercase tracking-wide text-black text-sm"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
            Open Camera
          </button>
          <button onClick={() => setManual(true)}
            className="mt-4 text-sm text-slate-500 hover:text-cyan-400 transition-colors font-medium underline underline-offset-2">
            QR damaged? Enter number manually
          </button>
        </>
      )}
      {active && (
        <div className="w-full max-w-sm">
          <div className="relative rounded-3xl overflow-hidden mb-4" style={{ border: '2px solid rgba(245,158,11,0.4)' }}>
            <video ref={videoRef} playsInline muted className="w-full" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
              <div className="scan-line absolute left-4 right-4 h-0.5 rounded"
                   style={{ background: 'rgba(245,158,11,0.8)', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }} />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button onClick={stopCamera} className="text-sm text-slate-400 hover:text-white font-medium transition-colors">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ── OTP modal for withdrawal ──────────────────────────────────────────────────
function OTPModal({ mobile, onVerified, onClose }) {
  const [otp,     setOtp]     = useState(['','','','','',''])
  const [sent,    setSent]    = useState(false)
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

  function buildVerifier() {
    if (recaptchaRef.current) try { recaptchaRef.current.clear() } catch(_) {}
    recaptchaRef.current = new RecaptchaVerifier(auth, 'otp-modal-recaptcha', { size: 'invisible' })
    return recaptchaRef.current
  }

  async function sendOTP() {
    setLoading(true); setError('')
    try {
      const v = buildVerifier()
      const c = await signInWithPhoneNumber(auth, `+91${mobile}`, v)
      setConfirm(c); setSent(true); setTimer(30)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch(e) { setError(`Failed to send OTP: ${e.code || e.message}`) }
    finally { setLoading(false) }
  }

  function handleInput(val, idx) {
    const d = [...otp]; d[idx] = val.replace(/\D/g,'').slice(-1)
    setOtp(d)
    if (val && idx < 5) otpRefs.current[idx+1]?.focus()
    if (d.every(x=>x) && val) setTimeout(() => verify(d), 80)
  }

  function handleKey(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const d = [...otp]; d[idx-1] = ''; setOtp(d); otpRefs.current[idx-1]?.focus()
    }
  }

  async function verify(digits) {
    const code = (digits || otp).join('')
    if (code.length < 6) return setError('Enter the complete 6-digit OTP')
    setLoading(true); setError('')
    try {
      await confirm.confirm(code); onVerified()
    } catch(e) {
      if (e.code === 'auth/invalid-verification-code') setError('Incorrect OTP')
      else setError('Verification failed. Try again.')
      setOtp(['','','','','','']); otpRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div id="otp-modal-recaptcha" />
      <div className="bg-[#0f1629] border border-[#1c2d42] rounded-3xl p-6 w-full max-w-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <h3 className="font-barlow font-black text-white uppercase tracking-wide">Verify Identity</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {!sent ? (
          <>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              We'll send a verification code to<br />
              <span className="text-white font-bold">+91 {mobile}</span>
            </p>
            {error && <p className="text-red-400 text-sm mb-3 font-medium">{error}</p>}
            <button onClick={sendOTP} disabled={loading}
              className="w-full py-3 rounded-2xl font-barlow font-black uppercase tracking-wide text-black text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" /> : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">Code sent to +91 {mask(mobile)}</p>
            <div className="flex gap-2 justify-center mb-4">
              {otp.map((d,i) => (
                <input key={i} ref={el => otpRefs.current[i]=el}
                  type="tel" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleInput(e.target.value, i)}
                  onKeyDown={e => handleKey(e, i)}
                  className="w-10 h-12 text-center text-xl font-black text-white rounded-xl border-2 outline-none bg-[#161b2e] transition-all"
                  style={{ borderColor: d ? '#f59e0b' : '#1c2d42' }} />
              ))}
            </div>
            {error && <p className="text-red-400 text-sm mb-3 font-medium text-center">{error}</p>}
            <button onClick={() => verify(null)} disabled={loading || otp.join('').length < 6}
              className="w-full py-3 rounded-2xl font-barlow font-black uppercase tracking-wide text-black text-sm mb-3 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" /> : 'Verify & Withdraw'}
            </button>
            <p className="text-center text-xs text-slate-500">
              {timer > 0 ? `Resend in ${timer}s` : <button onClick={sendOTP} className="text-amber-400 font-bold">Resend OTP</button>}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { icon: Home,    label: 'Home',    idx: 0 },
  { icon: ScanLine,label: 'Scan',    idx: 1 },
  { icon: Wallet,  label: 'Wallet',  idx: 2 },
  { icon: User,    label: 'Profile', idx: 3 },
]

// ── main app ──────────────────────────────────────────────────────────────────
export default function UserApp() {
  const [searchParams] = useSearchParams()
  const [session,    setSession]    = useState(getUserFromStorage)
  const [activeQrId, setActiveQrId] = useState(null)
  const [tab,        setTab]        = useState(0)
  const [userData,   setUserData]   = useState(null)
  const [txns,       setTxns]       = useState([])
  const [pending,    setPending]    = useState(null)
  const [loadingData,setLoadingData]= useState(false)
  const [showOTP,    setShowOTP]    = useState(false)
  const [otpDone,    setOtpDone]    = useState(false)
  const [upiId,      setUpiId]      = useState('')
  const [amount,     setAmount]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wError,     setWError]     = useState('')
  const [wSuccess,   setWSuccess]   = useState(false)
  const [editName,   setEditName]   = useState(false)
  const [nameVal,    setNameVal]    = useState(session.name)

  useEffect(() => {
    if (session.mobile) {
      fetchData()
      const qr = searchParams.get('qr')
      if (qr) setActiveQrId(qr)
    }
  }, [session.id])

  async function fetchData() {
    if (!session.mobile) return
    setLoadingData(true)
    try {
      const res = await api.get(`/user-wallet/${session.mobile}`)
      setUserData(res.user)
      setTxns(res.transactions || [])
      setPending(res.pendingWithdrawal)
      if (res.user.name) localStorage.setItem('loyalty_user_name', res.user.name)
    } catch(_) {}
    finally { setLoadingData(false) }
  }

  async function handleWithdraw() {
    const amt = parseFloat(amount)
    if (!upiId.trim())    return setWError('Enter your UPI ID')
    if (!amt || amt < 20) return setWError('Minimum withdrawal is ₹20')
    setSubmitting(true); setWError('')
    try {
      await api.post('/user-wallet/withdraw', { user_id: session.id, amount: amt, upi_id: upiId.trim() })
      setWSuccess(true); setOtpDone(false); setUpiId(''); setAmount('')
      fetchData()
    } catch(e) { setWError(e.error || 'Request failed') }
    finally { setSubmitting(false) }
  }

  function saveName() {
    if (nameVal.trim().length < 2) return
    localStorage.setItem('loyalty_user_name', nameVal.trim())
    setSession(s => ({ ...s, name: nameVal.trim() }))
    setEditName(false)
  }

  function handleLogin(userId, mobile, name, savedUpiId) {
    setSession({ id: userId, mobile, name })
    const qr = searchParams.get('qr')
    if (qr) setActiveQrId(qr)
  }

  // No session → show OTP login page
  if (!session.id || !session.mobile) {
    return <UserLogin onLogin={handleLogin} pendingQr={searchParams.get('qr')} />
  }

  const user = userData || { wallet_balance: 0, total_scans: 0, total_earned: 0 }

  return (
    <div className="min-h-screen flex font-nunito" style={{ background: '#080d1a' }}>

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 border-r border-[#1c2d42]"
             style={{ background: 'linear-gradient(to bottom, #0c1422, #070b12)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-[#1c2d42]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
            <Zap size={17} strokeWidth={2.5} className="text-black" />
          </div>
          <div>
            <p className="text-[11px] font-barlow font-black text-white uppercase tracking-wider leading-none">LoyaltyQR</p>
            <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest mt-0.5">My Account</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-[#1c2d42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
              <span className="text-base font-barlow font-black text-black">
                {(userData?.name || session.name || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{userData?.name || session.name || 'Friend'}</p>
              <p className="text-[10px] text-slate-500 font-mono">+91 {session.mobile}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, idx }) => (
            <button key={idx} onClick={() => setTab(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left relative
                ${tab === idx ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2d42]/50'}`}
              style={tab === idx ? { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' } : {}}>
              {tab === idx && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: 'linear-gradient(to bottom, #f59e0b, #ea580c)' }} />
              )}
              <Icon size={16} strokeWidth={tab === idx ? 2.5 : 2} className="flex-shrink-0" />
              <span className="text-sm font-barlow font-bold uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </nav>

        {/* Wallet preview */}
        <div className="px-4 py-4 border-t border-[#1c2d42]">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-1">Wallet Balance</p>
          <p className="text-lg font-barlow font-black text-amber-400">{fmtRs(user.wallet_balance)}</p>
          <button onClick={() => { localStorage.removeItem('loyalty_user_id'); localStorage.removeItem('loyalty_user_mobile'); localStorage.removeItem('loyalty_user_name'); window.location.href = '/user' }}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-400 transition-colors mt-3">
            <LogOut size={11} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between px-5 pt-8 pb-4">
          <div>
            <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
            <p className="text-lg font-barlow font-black text-white uppercase tracking-wide leading-tight">
              {userData?.name || session.name || 'Friend'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}>
            <QrCode size={18} className="text-black" strokeWidth={2.5} />
          </div>
        </div>

        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between px-8 pt-8 pb-2">
          <div>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-2xl font-barlow font-black text-white uppercase tracking-wide">
              {userData?.name || session.name || 'Friend'}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-0.5">Wallet Balance</p>
            <p className="text-xl font-barlow font-black text-amber-400">{fmtRs(user.wallet_balance)}</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 px-5 md:px-8 py-4">

          {/* ── Home tab ─────────────────────────────────────────────────── */}
          {tab === 0 && (
            <div className="space-y-5 max-w-3xl">
              {/* Wallet balance hero */}
              <div className="rounded-3xl p-6 relative overflow-hidden"
                   style={{ background: 'linear-gradient(135deg, #1a0f00, #261500, #1a0800)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 8px 32px rgba(245,158,11,0.1)' }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-20"
                     style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
                <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400/60 mb-1">Wallet Balance</p>
                <p className="text-4xl font-barlow font-black text-amber-400 leading-none mb-4">
                  {loadingData ? '—' : fmtRs(user.wallet_balance)}
                </p>
                <button onClick={() => setTab(2)}
                  className="flex items-center gap-2 text-xs font-bold text-amber-400/80 hover:text-amber-400 transition-colors">
                  View Wallet <ChevronRight size={14} />
                </button>
              </div>

              {/* Stat cards */}
              <div className="flex gap-3">
                <StatCard label="Total Scans"  value={loadingData ? '—' : user.total_scans}         icon={ScanLine} color="#f59e0b" />
                <StatCard label="Total Earned" value={loadingData ? '—' : fmtRs(user.total_earned)} icon={Wallet}   color="#22c55e" />
              </div>

              {/* Scan CTA */}
              <button onClick={() => setTab(1)}
                className="w-full rounded-3xl p-5 flex items-center gap-4 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.06))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
                  <ScanLine size={24} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="font-barlow font-black text-white uppercase tracking-wide text-sm">Scan QR Code</p>
                  <p className="text-xs text-slate-400 mt-0.5">Point camera at product to earn reward</p>
                </div>
                <ChevronRight size={18} className="text-slate-500 ml-auto" />
              </button>

              {/* Recent transactions */}
              {txns.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Recent Activity</p>
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1629', border: '1px solid #1c2d42' }}>
                    {txns.slice(0,6).map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1c2d42] last:border-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type==='credit' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                          {t.type==='credit' ? <ArrowDownLeft size={13} className="text-green-400" /> : <ArrowUpRight size={13} className="text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{t.note || t.product_name || 'Transaction'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{fmtDate(t.created_at)}</p>
                        </div>
                        <p className={`text-sm font-black flex-shrink-0 ${t.type==='credit' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type==='credit' ? '+' : '–'}{fmtRs(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Scanner tab ──────────────────────────────────────────────── */}
          {tab === 1 && (
            <div className="max-w-lg">
              <ScannerTab onScan={qrId => { setActiveQrId(qrId); setTab(0) }} />
            </div>
          )}

          {/* ── Wallet tab ───────────────────────────────────────────────── */}
          {tab === 2 && (
            <div className="space-y-4 max-w-xl">
              <div className="rounded-3xl p-6 relative overflow-hidden"
                   style={{ background: 'linear-gradient(135deg, #0a1628, #0f1e3a)', border: '1px solid #1c2d42' }}>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Available Balance</p>
                <p className="text-4xl font-barlow font-black text-white leading-none mb-1">{fmtRs(user.wallet_balance)}</p>
                <p className="text-xs text-slate-500">+91 {session.mobile}</p>
              </div>

              {pending ? (
                <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-amber-400">Withdrawal Pending</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtRs(pending.amount)} → {pending.upi_id}</p>
                  </div>
                </div>
              ) : wSuccess ? (
                <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <p className="text-sm font-bold text-green-400">Withdrawal request submitted!</p>
                </div>
              ) : !otpDone ? (
                <button onClick={() => user.wallet_balance >= 20 ? setShowOTP(true) : null}
                  disabled={user.wallet_balance < 20}
                  className="w-full py-4 rounded-2xl font-barlow font-black uppercase tracking-wide text-black text-sm disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: user.wallet_balance >= 20 ? '0 4px 20px rgba(245,158,11,0.35)' : 'none' }}>
                  {user.wallet_balance < 20 ? `Need ₹${(20 - user.wallet_balance).toFixed(0)} more to withdraw` : 'Withdraw to UPI'}
                </button>
              ) : (
                <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0f1629', border: '1px solid #1c2d42' }}>
                  <p className="text-xs font-black text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Identity Verified
                  </p>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">UPI ID</label>
                    <input value={upiId} onChange={e => { setUpiId(e.target.value); setWError('') }}
                      placeholder="name@upi or 9876543210@paytm"
                      className="w-full bg-[#080d1a] border border-[#1c2d42] text-white placeholder-slate-600
                                 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">
                      Amount (min ₹20 · max {fmtRs(user.wallet_balance)})
                    </label>
                    <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setWError('') }}
                      min={20} max={user.wallet_balance} placeholder="Enter amount"
                      className="w-full bg-[#080d1a] border border-[#1c2d42] text-white placeholder-slate-600
                                 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all" />
                  </div>
                  {wError && <p className="text-red-400 text-xs font-semibold">{wError}</p>}
                  <button onClick={handleWithdraw} disabled={submitting}
                    className="w-full py-3.5 rounded-xl font-barlaw font-black uppercase tracking-wide text-black text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                    {submitting ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" /> : 'Submit Request'}
                  </button>
                </div>
              )}

              {txns.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1629', border: '1px solid #1c2d42' }}>
                  <div className="px-4 py-3 border-b border-[#1c2d42]">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">All Transactions</p>
                  </div>
                  <div className="divide-y divide-[#1c2d42] max-h-80 overflow-y-auto">
                    {txns.map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type==='credit'?'bg-green-500/15':'bg-red-500/15'}`}>
                          {t.type==='credit' ? <ArrowDownLeft size={13} className="text-green-400" /> : <ArrowUpRight size={13} className="text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{t.note || t.product_name || 'Transaction'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{fmtDate(t.created_at)}</p>
                        </div>
                        <p className={`text-sm font-black ${t.type==='credit'?'text-green-400':'text-red-400'}`}>
                          {t.type==='credit'?'+':'–'}{fmtRs(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Profile tab ──────────────────────────────────────────────── */}
          {tab === 3 && (
            <div className="space-y-4 max-w-xl">
              <div className="rounded-3xl p-6 flex items-center gap-4" style={{ background: '#0f1629', border: '1px solid #1c2d42' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                  <span className="text-2xl font-barlow font-black text-black">
                    {(userData?.name || session.name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {editName ? (
                    <div className="flex items-center gap-2">
                      <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                        className="flex-1 bg-[#080d1a] border border-[#1c2d42] text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                        autoFocus />
                      <button onClick={saveName} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                      <button onClick={() => setEditName(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold truncate">{userData?.name || session.name || 'No name set'}</p>
                      <button onClick={() => setEditName(true)} className="text-slate-500 hover:text-amber-400 transition-colors">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 font-mono mt-0.5">+91 {session.mobile}</p>
                </div>
              </div>

              {[
                { label: 'Total Scans',    value: user.total_scans || 0 },
                { label: 'Total Earned',   value: fmtRs(user.total_earned) },
                { label: 'Wallet Balance', value: fmtRs(user.wallet_balance) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-4 rounded-2xl"
                     style={{ background: '#0f1629', border: '1px solid #1c2d42' }}>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="text-sm font-barlow font-black text-white">{value}</p>
                </div>
              ))}

              <button onClick={() => {
                localStorage.removeItem('loyalty_user_id')
                localStorage.removeItem('loyalty_user_mobile')
                localStorage.removeItem('loyalty_user_name')
                window.location.href = '/user'
              }} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <LogOut size={15} /> Clear Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom navigation ─────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 px-4 pb-4 z-40">
        <div className="flex items-center justify-around rounded-3xl py-3 px-2"
             style={{ background: 'rgba(15,22,41,0.95)', backdropFilter: 'blur(20px)', border: '1px solid #1c2d42', boxShadow: '0 -4px 32px rgba(0,0,0,0.5)' }}>
          {NAV_ITEMS.map(({ icon: Icon, label, idx }) => (
            <button key={idx} onClick={() => setTab(idx)}
              className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all ${
                tab === idx ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              style={tab === idx ? { background: 'rgba(245,158,11,0.12)' } : {}}>
              <Icon size={20} strokeWidth={tab === idx ? 2.5 : 2} />
              <span className="text-[10px] font-mono uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showOTP && (
        <OTPModal
          mobile={session.mobile}
          onVerified={() => { setShowOTP(false); setOtpDone(true) }}
          onClose={() => setShowOTP(false)}
        />
      )}

      {activeQrId && (
        <RedeemPopup
          qrId={activeQrId}
          userId={session.id}
          mobile={session.mobile}
          name={userData?.name || session.name}
          savedUpi={userData?.upi_id || ''}
          onClose={() => setActiveQrId(null)}
          onDone={() => { setActiveQrId(null); fetchData() }}
        />
      )}
    </div>
  )
}
