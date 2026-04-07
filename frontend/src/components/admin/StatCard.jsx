// Stat card with shimmer loading, gradient border on accent, hover lift
import React, { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)

  useEffect(() => {
    // Only animate numeric values
    const num = parseFloat(String(target).replace(/[^0-9.]/g, ''))
    if (isNaN(num)) { setDisplay(target); return }

    const prefix = String(target).match(/^[₹$€£]/) ? String(target)[0] : ''
    const suffix = String(target).replace(/^[₹$€£]?[\d,. ]+/, '')

    let start = null
    const from = 0

    function step(ts) {
      if (!start) start = ts
      const prog = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 3)
      const cur  = from + (num - from) * ease

      if (prefix === '₹') {
        setDisplay(`${prefix}${cur.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`)
      } else {
        setDisplay(`${prefix}${Math.round(cur).toLocaleString('en-IN')}${suffix}`)
      }

      if (prog < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return display
}

export default function StatCard({ label, value, sub, icon: Icon, accent = false, loading = false, delay = 0 }) {
  const animated = useCountUp(loading ? 0 : (value || 0))

  if (loading) {
    return (
      <div className="rounded-xl p-5 border border-[#1c2d42] bg-[#111827] overflow-hidden">
        <div className="shimmer-bg h-3 w-20 rounded mb-4" />
        <div className="shimmer-bg h-7 w-28 rounded mb-2" />
        <div className="shimmer-bg h-2.5 w-16 rounded" />
      </div>
    )
  }

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl p-5 border
        transition-all duration-300 cursor-default
        hover:-translate-y-0.5 hover:border-amber-500/30
        ${accent ? 'stat-card-accent border-transparent' : 'bg-[#111827] border-[#1c2d42]'}
      `}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: accent ? '0 4px 20px rgba(245,158,11,0.08)' : undefined,
      }}
    >
      {/* Accent bg glow */}
      {accent && (
        <>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
        </>
      )}

      {/* Hover glow shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
           style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.03) 0%, transparent 60%)' }} />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-2.5">{label}</p>
          <p className={`text-2xl font-barlow font-black count-up leading-none ${accent ? 'text-amber-400' : 'text-white'}`}>
            {animated}
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
        </div>

        {Icon && (
          <div className={`
            p-2.5 rounded-xl transition-all duration-300
            group-hover:scale-110
            ${accent
              ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30'
              : 'bg-[#1c2d42] text-slate-400 group-hover:bg-[#263448] group-hover:text-slate-200'
            }
          `}>
            <Icon size={17} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
