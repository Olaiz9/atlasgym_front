'use client'

import { UserX } from 'lucide-react'
import { Alumno } from '@/lib/types'

export function ModalConfirmarBaja({
  alumno,
  onCancel,
  onConfirm,
}: {
  alumno: Alumno
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm transition-opacity duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-baja"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
          <UserX className="size-6" />
        </div>
        <h2 id="titulo-baja" className="text-xl font-semibold text-white">
          {`¿Dar de baja a ${alumno.nombre}?`}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          El socio pasará a la pestaña de Inactivos. Si vuelve, lo reactivás desde ahí y conserva su ficha, su historial y sus pagos.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 transition-[color,background-color] duration-200 hover:bg-slate-800 hover:text-white active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-lg shadow-amber-600/20 transition-[color,background-color] duration-200 hover:bg-amber-500 active:scale-95"
          >
            Dar de baja
          </button>
        </div>
      </div>
    </div>
  )
}
