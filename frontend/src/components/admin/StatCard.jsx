// Stat card with shimmer loading, gradient border on accent, count-up animation
import React, { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const num = parseFloat(String(target).replace(/[^0-9.]/g, ''))
    if (isNaN(num)) { setDisplay(target); return }

    const prefix = String(target).match(/^[₹$€£]/) ? String(target)[0] : ''
    const suffix = String(target).replace(/^[₹$€£]?[\d,.% ]+/, '')
    const from = 0

    let start = null
    function step(ts) {
      if (!start) start = ts
      const prog = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 4)
      const cur  = from + (num - from) * ease
      if (prefix === '₹') {
        setDisplay(`${prefix}${cur.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`)
      } else if (suffix === '%') {
        setDisplay(`${prefix}${cur.toFixed(1)}${suffix}`)
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
      <div className="rounded-2xl p-5 border border-[#1c2d42] bg-[#111827] overflow-hidden">
        <div className="shimmer-bg h-2.5 w-20 rounded mb-4" />
        <div className="shimmer-bg h-8 w-28 rounded mb-2.5" />
        <div className="shimmer-bg h-2 w-16 rounded" />
      </div>
    )
  }

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl p-5 border
        transition-all duration-300 cursor-default
        hover:-translate-y-1 hover:shadow-xl
        ${accent
          ? 'stat-card-accent border-transparent'
          : 'bg-[#111827] border-[#1c2d42] hover:border-[#2a3f5a]'
        }
      `}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: accent ? '0 4px 24px rgba(245,158,11,0.1)' : undefined,
        ...(accent ? {} : {}),
      }}
    >
      {/* Accent bg orbs */}
      {accent && (
        <>
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full orb-pulse pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)' }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.07), transparent 70%)' }} />
        </>
      )}

      {/* Non-accent hover glow */}
      {!accent && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at top right, rgba(245,158,11,0.04), transparent 60%)' }} />
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-2.5 leading-none">{label}</p>
          <p className={`text-2xl font-barlow font-black count-up leading-none mb-1 ${
            accent ? 'gradient-text' : 'text-white'
          }`}>
            {animated}
          </p>
          {sub && <p className="text-[11px] text-slate-500 mt-1.5 font-mono">{sub}</p>}
        </div>

        {Icon && (
          <div className={`
            p-2.5 rounded-xl transition-all duration-300
            group-hover:scale-110 flex-shrink-0
            ${accent
              ? 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25'
              : 'bg-[#1c2d42] text-slate-500 group-hover:bg-[#263448] group-hover:text-slate-300'
            }
          `}>
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
