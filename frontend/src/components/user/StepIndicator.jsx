// Step indicator — numbered dots with labels, amber active state
import React from 'react'
import { Check } from 'lucide-react'

const LABELS = ['Verify QR', 'Confirm', 'Your Name', 'Reward', 'Done']

export default function StepIndicator({ current, total = 5 }) {
  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {Array.from({ length: total }, (_, i) => {
        const step   = i + 1
        const done   = step < current
        const active = step === current
        return (
          <React.Fragment key={step}>
            {/* Step node */}
            <div className="flex flex-col items-center gap-1">
              <div className={`
                flex items-center justify-center rounded-full transition-all duration-400 font-barlow font-black
                ${done   ? 'w-7 h-7 text-black text-[11px]' : ''}
                ${active ? 'w-8 h-8 text-black text-[13px] shadow-lg' : ''}
                ${!done && !active ? 'w-6 h-6 text-[11px]' : ''}
              `} style={{
                background: done
                  ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
                  : active
                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                  : 'rgba(255,255,255,0.08)',
                color: done || active ? '#000' : 'rgba(255,255,255,0.3)',
                boxShadow: active ? '0 0 14px rgba(245,158,11,0.5)' : 'none',
              }}>
                {done
                  ? <Check size={11} strokeWidth={3.5} />
                  : <span>{step}</span>
                }
              </div>
              {active && (
                <span className="text-[9px] font-nunito font-bold text-amber-400 uppercase tracking-wider whitespace-nowrap">
                  {LABELS[i]}
                </span>
              )}
            </div>

            {/* Connector */}
            {step < total && (
              <div className={`
                h-0.5 w-8 mx-1 rounded-full transition-all duration-500
                ${done ? '' : 'bg-white/10'}
              `} style={done ? {
                background: 'linear-gradient(90deg, #f59e0b, #ea580c)',
              } : {}} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
