// Public user wallet page — balance, history, withdrawal request
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Wallet, ArrowDownLeft, ArrowUpRight, QrCode, Clock, CheckCircle, XCircle } from 'lucide-react'
import api from '../../lib/api'

const BG = 'linear-gradient(150deg, #b45309 0%, #c2410c 20%, #ea580c 45%, #f97316 70%, #f59e0b 100%)'

function fmtRs(n)   { return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN') : '—' }

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-3xl w-full max-w-sm mx-auto overflow-hidden ${className}`}
         style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)' }}>
      {children}
    </div>
  )
}

function PrimaryBtn({ children, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-4 rounded-2xl font-nunito font-black text-base text-white
        transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2.5"
      style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c, #f59e0b)', boxShadow: '0 8px 24px rgba(194,65,12,0.4)' }}>
      {loading
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : children
      }
    </button>
  )
}

export default function UserWalletPage() {
  const { mobile } = useParams()

  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [upiId,     setUpiId]     = useState('')
  const [amount,    setAmount]    = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [success,   setSuccess]   = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { fetchWallet() }, [mobile])

  async function fetchWallet() {
    setLoading(true)
    try {
      const res = await api.get(`/user-wallet/${mobile}`)
      setData(res)
    } catch (e) {
      setError(e.error || 'Could not load wallet')
    } finally { setLoading(false) }
  }

  async function handleWithdraw() {
    const amt = parseFloat(amount)
    if (!upiId.trim())                    return setFormError('Enter your UPI ID')
    if (!amt || amt < 20)                 return setFormError('Minimum withdrawal is ₹20')
    if (amt > data.user.wallet_balance)   return setFormError(`Insufficient balance. Max: ${fmtRs(data.user.wallet_balance)}`)
    setSubmitting(true); setFormError('')
    try {
      const userId = localStorage.getItem('loyalty_user_id')
      if (!userId) return setFormError('Session expired. Please scan a QR code first to verify your identity.')
      await api.post('/user-wallet/withdraw', { user_id: userId, amount: amt, upi_id: upiId.trim() })
      setSuccess(true); fetchWallet()
    } catch (e) {
      setFormError(e.error || 'Failed to submit request')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="w-10 h-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <Card className="p-8 text-center">
        <XCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="font-nunito font-black text-gray-800">{error}</p>
      </Card>
    </div>
  )

  const { user, transactions, pendingWithdrawal } = data

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 font-nunito" style={{ background: BG }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <QrCode size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-white font-black text-lg tracking-wider leading-none drop-shadow block">LoyaltyQR</span>
          <span className="text-white/60 text-[10px] font-semibold tracking-widest uppercase">My Wallet</span>
        </div>
      </div>

      {/* Balance card */}
      <Card className="mb-4">
        <div className="px-7 pt-7 pb-5"
             style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
              <Wallet size={22} style={{ color: '#d97706' }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">Hi, {user.name || 'there'}!</p>
              <p className="text-xs font-mono text-gray-400">+91 {user.mobile}</p>
            </div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Wallet Balance</p>
          <p className="text-5xl font-black leading-none" style={{ color: '#c2410c' }}>
            {fmtRs(user.wallet_balance)}
          </p>
        </div>

        <div className="px-7 pb-7 pt-4">
          {pendingWithdrawal ? (
            <div className="rounded-2xl p-4 mb-4 flex items-start gap-3"
                 style={{ background: '#fef9c3', border: '1.5px solid #fde047' }}>
              <Clock size={18} style={{ color: '#ca8a04' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-gray-800">Withdrawal Pending</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmtRs(pendingWithdrawal.amount)} to {pendingWithdrawal.upi_id} · Processing
                </p>
              </div>
            </div>
          ) : success ? (
            <div className="rounded-2xl p-4 mb-4 flex items-start gap-3"
                 style={{ background: '#dcfce7', border: '1.5px solid #86efac' }}>
              <CheckCircle size={18} style={{ color: '#16a34a' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-gray-800">Request Submitted!</p>
                <p className="text-xs text-gray-500 mt-0.5">We'll process your withdrawal soon.</p>
              </div>
            </div>
          ) : user.wallet_balance >= 20 ? (
            showForm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">UPI ID</label>
                  <input value={upiId} onChange={e => { setUpiId(e.target.value); setFormError('') }}
                    placeholder="name@upi or 9876543210@paytm"
                    className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                               bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">
                    Amount (min ₹20, max {fmtRs(user.wallet_balance)})
                  </label>
                  <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setFormError('') }}
                    min={20} max={user.wallet_balance} placeholder="Enter amount"
                    className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-gray-800 text-sm font-semibold
                               bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
                </div>
                {formError && <p className="text-red-500 text-sm font-semibold text-center">{formError}</p>}
                <PrimaryBtn onClick={handleWithdraw} loading={submitting}>
                  Request Withdrawal
                </PrimaryBtn>
                <button onClick={() => setShowForm(false)}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <PrimaryBtn onClick={() => setShowForm(true)}>
                Withdraw to UPI
              </PrimaryBtn>
            )
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-400 font-semibold">Minimum ₹20 required to withdraw</p>
              <p className="text-xs text-gray-300 mt-1">Keep scanning QRs to earn more!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-black text-gray-700 uppercase tracking-wide">Transaction History</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {transactions.map(t => (
              <div key={t.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  t.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {t.type === 'credit'
                    ? <ArrowDownLeft size={14} className="text-green-500" />
                    : <ArrowUpRight  size={14} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{t.note || t.product_name || 'Transaction'}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{fmtDate(t.created_at)}</p>
                </div>
                <p className={`text-sm font-black flex-shrink-0 ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                  {t.type === 'credit' ? '+' : '–'}{fmtRs(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
