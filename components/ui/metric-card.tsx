import React from 'react'

export interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tint: { bg: string; text: string; bar: string }
}

export function MetricCard({
  icon,
  label,
  value,
  sub,
  tint,
}: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl bg-slate-900/60 p-6 shadow-sm backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl text-slate-100 border border-slate-800 cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-400">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-white">{value}</p>
          {sub && <p className="mt-3 text-xs font-bold text-slate-400">{sub}</p>}
        </div>
        <div className={`flex size-12 items-center justify-center rounded-2xl ${tint.bg} ${tint.text} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1.5 w-full ${tint.bar}`} />
    </article>
  )
}
