// Colored status badge with dot indicator
import React from 'react'

const CONFIG = {
  draft:           { label: 'Draft',      dot: '#64748b', cls: 'bg-slate-800/80 text-slate-300 border-slate-700/50'       },
  funded:          { label: 'Funded',     dot: '#60a5fa', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20'          },
  paused:          { label: 'Paused',     dot: '#facc15', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'    },
  exhausted:       { label: 'Exhausted',  dot: '#34d399', cls: 'bg-green-500/10 text-green-400 border-green-500/20'       },
  expired:         { label: 'Expired',    dot: '#f87171', cls: 'bg-red-500/10 text-red-400 border-red-500/20'             },
  generated:       { label: 'Generated',  dot: '#94a3b8', cls: 'bg-slate-700/50 text-slate-400 border-slate-600/30'       },
  scanning:        { label: 'Scanning',   dot: '#a78bfa', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20'    },
  redeemed:        { label: 'Redeemed',   dot: '#34d399', cls: 'bg-green-500/10 text-green-400 border-green-500/20'       },
  wallet_credited: { label: 'In Wallet',  dot: '#22d3ee', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'          },
  pending_reason:  { label: 'Pending',    dot: '#fb923c', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20'    },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || { label: status || '—', dot: '#64748b', cls: 'bg-slate-700/50 text-slate-400 border-slate-600/30' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border uppercase tracking-wider ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}
