// Org admin — customise QR sticker design with live preview
import React, { useEffect, useState } from 'react'
import { Palette, Save, RotateCcw, CheckCircle, AlertCircle, Eye, QrCode } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/api'

const DEFAULT_CONFIG = {
  bg_color:    '#0f172a',
  accent_from: '#f59e0b',
  accent_to:   '#ea580c',
  tagline:     'LOYALTY REWARDS',
  show_badge:  true,
  badge_label: 'UPI',
  badge_color: '#5f259f',
}

function escX(str) {
  return String(str || '').replace(/[<>&"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]
  )
}

/** Renders the sticker SVG inline in the browser (uses a placeholder QR grid) */
function StickerPreview({ orgName, config: cfg }) {
  const shortId = 'A1B2C3D4'
  const numStr  = '000001'
  const safeOrg = escX(orgName || 'YOUR ORG')
  const tagline = escX(cfg.tagline || 'LOYALTY REWARDS')
  const badge   = escX(cfg.badge_label || 'UPI')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="240" viewBox="0 0 460 240">
  <defs>
    <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${escX(cfg.accent_from)}"/>
      <stop offset="100%" stop-color="${escX(cfg.accent_to)}"/>
    </linearGradient>
    <clipPath id="rA"><rect width="460" height="240" rx="12" ry="12"/></clipPath>
    <clipPath id="lP"><rect x="0" y="0" width="218" height="240"/></clipPath>
  </defs>
  <rect width="460" height="240" rx="12" fill="#f1f5f9"/>
  <rect width="460" height="240" rx="12" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
  <g clip-path="url(#rA)">
    <rect x="0" y="0" width="220" height="240" fill="${escX(cfg.bg_color)}"/>
  </g>
  <rect x="0" y="0" width="5" height="240" rx="2" fill="url(#aG)"/>
  <g clip-path="url(#lP)">
  <text x="18" y="64" font-family="Arial Black,sans-serif" font-size="24" font-weight="900"
        fill="${escX(cfg.accent_from)}" textLength="196" lengthAdjust="spacingAndGlyphs"
        letter-spacing="0.5">${safeOrg}</text>
  <text x="18" y="80" font-family="Arial,sans-serif" font-size="7.5" fill="#64748b" letter-spacing="2">${tagline}</text>
  <line x1="18" y1="91" x2="204" y2="91" stroke="#1e293b" stroke-width="1"/>
  <text x="18" y="108" font-family="Arial,sans-serif" font-size="7.5" fill="#64748b" letter-spacing="1.8">REWARD AMOUNT</text>
  <text x="18" y="134" font-family="Arial Black,sans-serif" font-size="24" font-weight="900" fill="#ffffff">₹10</text>
  ${cfg.show_badge ? `
  <rect x="14" y="183" width="196" height="34" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <image x="18" y="186" width="188" height="28" href="/upi-logo.png" preserveAspectRatio="xMidYMid meet"/>
  ` : ''}
  </g>
  <!-- Right panel (compact card, centred in 220–460 section) -->
  <rect x="250" y="14" width="196" height="212" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <!-- QR placeholder fills the card -->
  <rect x="252" y="16" width="192" height="182" rx="0" fill="#f8fafc" stroke="none"/>
  <text x="348" y="103" font-family="Arial,sans-serif" font-size="11" fill="#94a3b8"
        text-anchor="middle">QR CODE</text>
  <text x="348" y="118" font-family="Arial,sans-serif" font-size="9" fill="#cbd5e1"
        text-anchor="middle">preview</text>
  <!-- Serial + UUID strip -->
  <rect x="252" y="200" width="192" height="26" rx="0" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="260" y="217" font-family="Courier New,monospace" font-size="9.5" font-weight="bold"
        fill="#64748b" text-anchor="start" letter-spacing="1">#${numStr}</text>
  <text x="438" y="217" font-family="Courier New,monospace" font-size="9.5" font-weight="bold"
        fill="#1e293b" text-anchor="end" letter-spacing="1.5">${shortId}</text>
</svg>`

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[460px] rounded-xl overflow-hidden shadow-2xl"
           style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
           dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-[10px] font-mono text-slate-600 text-center">
        Live preview · QR image appears in downloaded ZIP
      </p>
    </div>
  )
}

function ColorField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0.5" />
        </div>
        <input type="text" value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-[#0c1422] border border-[#1c2d42] text-white rounded-xl px-3 py-2
                     text-sm font-mono input-focus focus:outline-none transition-all" />
      </div>
      {hint && <p className="text-[10px] text-slate-600 font-mono mt-1">{hint}</p>}
    </div>
  )
}

export default function StickerCustomizer() {
  const { user } = useAuth()
  const [config,  setConfig]  = useState(DEFAULT_CONFIG)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.get('/batch/sticker-config')
      .then(cfg => { setConfig(cfg); setFetching(false) })
      .catch(() => setFetching(false))
  }, [])

  function update(key, value) {
    setConfig(c => ({ ...c, [key]: value }))
    setSaved(false)
    setError('')
  }

  function reset() {
    setConfig(DEFAULT_CONFIG)
    setSaved(false)
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await api.patch('/batch/sticker-config', config)
      setConfig(res.config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 float-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Branding</span>
          </div>
          <h1 className="text-3xl font-barlow font-black text-white uppercase tracking-wide">Sticker Design</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">Customise how your QR stickers look when exported</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-400
                       hover:text-white hover:bg-[#1c2d42] transition-all border border-[#1c2d42]">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-barlow font-bold
                       uppercase tracking-wide text-black transition-all disabled:opacity-50"
            style={{ background: saved ? '#22c55e' : 'linear-gradient(135deg,#f59e0b,#ea580c)',
                     boxShadow: saved ? '0 4px 16px rgba(34,197,94,0.3)' : '0 4px 16px rgba(245,158,11,0.3)' }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : saved ? <CheckCircle size={14} /> : <Save size={14} />
            }
            {loading ? 'Saving…' : saved ? 'Saved!' : 'Save Design'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Controls */}
        <div className="space-y-5 float-in-1">

          {/* Left panel */}
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-4">Left Panel</h2>
            <div className="space-y-4">
              <ColorField label="Background Color" value={config.bg_color}
                onChange={v => update('bg_color', v)} hint="Dark background of the left branding area" />
              <ColorField label="Accent Color (top)" value={config.accent_from}
                onChange={v => update('accent_from', v)} hint="Brand color used for org name and accent bar (top)" />
              <ColorField label="Accent Color (bottom)" value={config.accent_to}
                onChange={v => update('accent_to', v)} hint="Gradient end of the accent bar (bottom)" />
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                  Tagline
                </label>
                <input type="text" value={config.tagline} maxLength={24}
                  onChange={e => update('tagline', e.target.value.toUpperCase())}
                  placeholder="LOYALTY REWARDS"
                  className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                             rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest
                             input-focus focus:outline-none transition-all" />
                <p className="text-[10px] text-slate-600 font-mono mt-1">Max 24 chars · auto uppercase</p>
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Payment Badge</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10px] font-mono text-slate-500">
                  {config.show_badge ? 'Visible' : 'Hidden'}
                </span>
                <button type="button"
                  onClick={() => update('show_badge', !config.show_badge)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    config.show_badge ? 'bg-amber-500' : 'bg-[#1c2d42]'
                  }`}>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    config.show_badge ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </label>
            </div>
            {config.show_badge && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                    Badge Label
                  </label>
                  <input type="text" value={config.badge_label} maxLength={8}
                    onChange={e => update('badge_label', e.target.value.toUpperCase())}
                    placeholder="UPI"
                    className="w-full bg-[#0c1422] border border-[#1c2d42] text-white placeholder-slate-600
                               rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest
                               input-focus focus:outline-none transition-all" />
                  <p className="text-[10px] text-slate-600 font-mono mt-1">e.g. UPI · GPay · PhonePe · Paytm</p>
                </div>
                <ColorField label="Badge Color" value={config.badge_color}
                  onChange={v => update('badge_color', v)} hint="Background color of the payment badge pill" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="float-in-2">
          <div className="bg-[#111827] border border-[#1c2d42] rounded-2xl p-6 sticky top-8">
            <div className="flex items-center gap-2 mb-5">
              <Eye size={13} className="text-amber-400" />
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Live Preview</h2>
            </div>
            <StickerPreview orgName={user?.orgName || user?.orgCode || 'YOUR ORG'} config={config} />

            <div className="mt-5 bg-[#0c1422] rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Config summary</p>
              {[
                ['BG',      config.bg_color],
                ['Accent',  `${config.accent_from} → ${config.accent_to}`],
                ['Tagline', config.tagline],
                ['Badge',   config.show_badge ? `${config.badge_label} (${config.badge_color})` : 'Hidden'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-300 truncate max-w-[180px] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
