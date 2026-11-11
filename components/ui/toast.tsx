'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  mensaje: string
  tipo: ToastType
}

interface ToastContextValue {
  toast: (mensaje: string, tipo?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((mensaje: string, tipo: ToastType = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removerToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
              t.tipo === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                : t.tipo === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                : 'bg-blue-950/90 border-blue-500/30 text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.tipo === 'success' && <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
              {t.tipo === 'error' && <AlertCircle className="size-5 shrink-0 text-rose-400" />}
              {t.tipo === 'info' && <Info className="size-5 shrink-0 text-blue-400" />}
              <p className="text-xs font-bold truncate">{t.mensaje}</p>
            </div>
            <button
              onClick={() => removerToast(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback silencioso si no está envuelto
    return {
      toast: (msg: string) => console.log(msg),
    }
  }
  return ctx
}
