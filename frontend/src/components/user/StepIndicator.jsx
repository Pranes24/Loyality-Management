// Step indicator — numbered dots with labels, amber active state, smooth connectors
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
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex items-center justify-center rounded-full transition-all duration-400 font-nunito font-black
                  ${done   ? 'w-7 h-7 text-[11px]' : ''}
                  ${active ? 'w-9 h-9 text-[13px]' : ''}
                  ${!done && !active ? 'w-6 h-6 text-[10px]' : ''}
                `}
                style={{
                  background: done
                    ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
                    : active
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'rgba(255,255,255,0.08)',
                  color: done || active ? '#000' : 'rgba(255,255,255,0.25)',
                  boxShadow: active
                    ? '0 0 0 3px rgba(245,158,11,0.2), 0 0 16px rgba(245,158,11,0.5)'
                    : done
                    ? '0 2px 8px rgba(245,158,11,0.3)'
                    : 'none',
                }}
              >
                {done ? <Check size={11} strokeWidth={3.5} /> : <span>{step}</span>}
              </div>
              {active && (
                <span className="text-[9px] font-nunito font-black text-amber-300 uppercase tracking-wider whitespace-nowrap fade-in">
                  {LABELS[i]}
                </span>
              )}
              {!active && <span className="h-4" />}
            </div>

            {/* Connector line */}
            {step < total && (
              <div className="h-0.5 w-8 mx-1 rounded-full transition-all duration-500 flex-shrink-0"
                   style={{
                     background: done
                       ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                       : 'rgba(255,255,255,0.1)',
                   }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
