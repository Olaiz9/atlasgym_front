'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PaginaError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-slate-200 leading-relaxed">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-6">
        <h1 className="text-2xl font-black text-white">Algo salió mal</h1>
        <p className="mt-2 text-sm text-slate-300">
          Probá de nuevo. Si sigue pasando, avisale a los titulares del gimnasio.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
