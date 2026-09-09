'use client'

import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export function AccesoRestringido({
  titulo = 'Acceso Restringido',
  mensaje = 'Esta sección es exclusiva para entrenadores y administradores de ATLAS Gym.',
}: {
  titulo?: string
  mensaje?: string
}) {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-[600px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-400 shadow-xl shadow-rose-950/20">
        <ShieldAlert className="size-10" />
      </div>

      <span className="mb-2 rounded-full border border-rose-500/30 bg-rose-950/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
        Permisos Insuficientes
      </span>

      <h1 className="text-2xl font-black text-white sm:text-3xl">
        {titulo}
      </h1>

      <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
        {mensaje}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-[color,background-color,transform] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95"
        >
          <ArrowLeft className="size-4" />
          Volver a mi panel
        </Link>
      </div>
    </div>
  )
}
