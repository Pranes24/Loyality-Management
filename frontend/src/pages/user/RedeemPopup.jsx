// Redemption reward popup — shown over the user dashboard, no OTP (user already logged in)
import React, { useEffect, useRef, useState } from 'react'
import { X, Gift, Banknote, PiggyBank, MessageSquare, CheckCircle, Wallet, ArrowRight, User } from 'lucide-react'
import api from '../../lib/api'

const BG = 'linear-gradient(150deg, #b45309 0%, #c2410c 20%, #ea580c 45%, #f97316 70%, #f59e0b 100%)'
const CONFETTI_COLORS = ['#fff','#fef08a','#fde68a','#fed7aa','#fdba74','#fca5a5','#d9f99d']

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 22 }, (_,i) => {
        const left  = 5 + (i * 4.3) % 90
        const delay = (i * 0.06).toFixed(2)
        const size  = 5 + (i % 5) * 3
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const shape = i % 3 === 0 ? '2px' : i % 3 === 1 ? '50%' : '1px'
        return (
          <div key={i} className="particle absolute"
            style={{ left:`${left}%`, bottom:'15%', width:size, height:size,
              background:color, borderRadius:shape, animationDelay:`${delay}s`, animationDuration:`${1.1+(i%4)*0.25}s` }} />
        )
      })}
    </div>
  )
}

function PrimaryBtn({ children, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-4 rounded-2xl font-nunito font-black text-base text-white
        transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2.5"
      style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c, #f59e0b)', boxShadow: '0 8px 24px rgba(194,65,12,0.4)' }}>
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
    </button>
  )
}

// step: 0=loading, -1=error, 1=name-needed, 2=reward, 3=success
export default function RedeemPopup({ qrId, userId, mobile, name: initName, savedUpi, onClose, onDone }) {
  const [step,    setStep]    = useState(0)
  const [name,    setName]    = useState(initName || '')
  const [amount,  setAmount]  = useState(null)
  const [qrMeta,  setQrMeta]  = useState(null)
  const [action,  setAction]  = useState('redeemed')
  const [upiId,   setUpiId]   = useState(savedUpi || '')
  const [reason,  setReason]  = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [qrError, setQrError] = useState('')
  const didLoad = useRef(false)  // guard against React StrictMode double-fire

  useEffect(() => {
    if (didLoad.current) return
    didLoad.current = true
    if (!initName) { setStep(1); return }  // need name first
    loadQR(initName)
  }, [])

  async function loadQR(nameToUse) {
    setLoading(true); setError('')
    try {
      const check = await api.get(`/redeem/${qrId}/check`)
      if (!check.valid) { setQrError(check.message || check.error); setStep(-1); return }

      const res = await api.post('/redeem/confirm-scan', {
        qr_id: qrId, user_id: userId, user_name: nameToUse.trim(), user_mobile: mobile
      })
      setAmount(res.amount)
      setQrMeta({ batchId: res.batchId, batchCode: res.batchCode, productName: res.productName })
      setStep(2)
    } catch(e) {
      setQrError(e.error || e.message || 'Failed to validate QR code')
      setStep(-1)
    } finally { setLoading(false) }
  }

  function confirmName() {
    if (!name.trim() || name.trim().length < 2) return setError('Enter your name (min 2 characters)')
    localStorage.setItem('loyalty_user_name', name.trim())
    setStep(0); loadQR(name.trim())
  }

  async function handleSubmit() {
    if (action === 'redeemed' && !upiId.trim()) return setError('Enter your UPI ID')
    if (action === 'pending_reason' && reason.trim().length < 5) return setError('Provide a reason (min 5 characters)')
    setLoading(true); setError('')
    try {
      const res = await api.post('/redeem/submit', {
        qr_id: qrId, user_id: userId, action,
        upi_id:  action === 'redeemed'       ? upiId.trim()  : undefined,
        reason:  action === 'pending_reason' ? reason.trim() : undefined,
        batch_id: qrMeta?.batchId, batch_code: qrMeta?.batchCode, product_name: qrMeta?.productName,
      })
      setResult(res); setStep(3)
    } catch(e) { setError(e.error || 'Submission failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 font-nunito"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>

      {/* Close — hide on success */}
      {step !== 3 && (
        <button onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <X size={18} className="text-white" />
        </button>
      )}

      {/* Step 0: loading spinner */}
      {step === 0 && (
        <div className="w-10 h-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
      )}

      {/* Step -1: error */}
      {step === -1 && (
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center"
             style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
          <p className="text-xl font-black text-gray-800 mb-2">Oops!</p>
          <p className="text-gray-500 text-sm">{qrError}</p>
          <button onClick={onClose} className="mt-5 text-sm text-orange-500 font-black">Go Back</button>
        </div>
      )}

      {/* Step 1: name needed */}
      {step === 1 && (
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
             style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28)' }}>
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
                <User size={30} style={{ color: '#8b5cf6' }} />
              </div>
              <h2 className="text-xl font-black text-gray-800">What's your name?</h2>
              <p className="text-gray-400 text-sm mt-1.5">Just once — we'll remember it</p>
            </div>
            <div className="mb-5">
              <input value={name} onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && confirmName()}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3.5 text-gray-800 bg-gray-50
                           font-semibold text-sm focus:border-purple-400 focus:bg-white outline-none transition-all"
                autoFocus />
              {error && <p className="text-red-500 text-sm mt-2 text-center font-semibold">{error}</p>}
            </div>
            <PrimaryBtn onClick={confirmName} loading={loading}>
              Continue <ArrowRight size={18} strokeWidth={2.5} />
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* Step 2: reward selection */}
      {step === 2 && (
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
             style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28)' }}>
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
            <div className="space-y-2.5 mb-5">
              {[
                { val:'redeemed',       icon:Banknote,      label:'Instant UPI Transfer', desc:`₹${amount} sent to your UPI right away`, border:action==='redeemed'?'#22c55e':'#e5e7eb', ring:action==='redeemed'?'rgba(34,197,94,0.12)':'transparent', iconColor:'#16a34a', iconBg:'#dcfce7' },
                { val:'wallet_credited',icon:PiggyBank,     label:'Add to Wallet',        desc:'Save up and withdraw anytime',            border:action==='wallet_credited'?'#06b6d4':'#e5e7eb', ring:action==='wallet_credited'?'rgba(6,182,212,0.12)':'transparent', iconColor:'#0891b2', iconBg:'#cffafe' },
                { val:'pending_reason', icon:MessageSquare, label:'Not Now',              desc:'Save this for later, tell us why',        border:action==='pending_reason'?'#f97316':'#e5e7eb', ring:action==='pending_reason'?'rgba(249,115,22,0.12)':'transparent', iconColor:'#ea580c', iconBg:'#ffedd5' },
              ].map(opt => (
                <button key={opt.val} onClick={() => { setAction(opt.val); setError('') }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
                  style={{ borderColor:opt.border, boxShadow:`0 0 0 3px ${opt.ring}`, background: action===opt.val ? `linear-gradient(135deg, ${opt.iconBg}, white)` : 'white' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:opt.iconBg }}>
                    <opt.icon size={20} style={{ color:opt.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                       style={{ borderColor: action===opt.val ? opt.iconColor : '#e5e7eb' }}>
                    {action===opt.val && <div className="w-2.5 h-2.5 rounded-full" style={{ background:opt.iconColor }} />}
                  </div>
                </button>
              ))}
            </div>

            {action === 'redeemed' && (
              <div className="mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Your UPI ID</label>
                <input value={upiId} onChange={e => { setUpiId(e.target.value); setError('') }}
                  placeholder="name@upi or 9876543210@paytm"
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                             bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
                {savedUpi && upiId === savedUpi && <p className="text-xs text-green-500 mt-1.5 font-bold">✓ Pre-filled with your saved UPI ID</p>}
              </div>
            )}

            {action === 'pending_reason' && (
              <div className="mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Reason</label>
                <textarea value={reason} onChange={e => { setReason(e.target.value); setError('') }}
                  rows={3} placeholder="Tell us why you're not redeeming right now…"
                  className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                             bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all resize-none" />
              </div>
            )}

            {error && <p className="text-red-500 text-sm mb-3 text-center font-semibold">{error}</p>}
            <PrimaryBtn onClick={handleSubmit} loading={loading}>
              {action==='redeemed' ? `Redeem ₹${amount} Now` : action==='wallet_credited' ? `Add ₹${amount} to Wallet` : 'Submit Response'}
            </PrimaryBtn>
          </div>
        </div>
      )}

      {/* Step 3: success */}
      {step === 3 && (
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl overflow-hidden relative"
               style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28)' }}>
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
                  {[{ label:'Amount', value:`₹${amount}`, cls:'font-black text-gray-800 text-base' }, { label:'UPI ID', value:upiId, cls:'font-mono text-xs text-gray-600' }].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 font-medium">{label}</span>
                      <span className={`text-sm ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <PrimaryBtn onClick={onDone}>Back to Dashboard <ArrowRight size={16} /></PrimaryBtn>
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
                  <p className="text-4xl font-black" style={{ color: '#0891b2' }}>₹{result?.walletBalance?.toFixed(2) || amount}</p>
                </div>
                <PrimaryBtn onClick={onDone}>Back to Dashboard <ArrowRight size={16} /></PrimaryBtn>
              </div>
            )}
            {action === 'pending_reason' && (
              <div className="px-7 pt-8 pb-7 text-center relative z-10">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 success-ring"
                     style={{ background: 'linear-gradient(135deg, #ffedd5, #fed7aa)', boxShadow: '0 0 50px rgba(249,115,22,0.22)' }}>
                  <CheckCircle size={44} style={{ color: '#ea580c' }} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-1">Response Recorded</h2>
                <p className="text-gray-500 text-sm leading-relaxed mt-2 mb-5">Thank you! You can still redeem this QR later.</p>
                <PrimaryBtn onClick={onDone}>Back to Dashboard <ArrowRight size={16} /></PrimaryBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
