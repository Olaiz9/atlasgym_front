'use client'

import { useCallback, useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { apiGetTotemEstado, isApiRuntimeEnabled } from '@/lib/api-client'
import { avisoTotemSinSenal, INTERVALO_CONSULTA_ESTADO_MS, type AvisoTotem } from '@/lib/totem-estado'

const CLAVE_OCULTO = 'atlas_aviso_totem_oculto'

function leerOculto(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_OCULTO)
  } catch {
    return null
  }
}

/**
 * Cartel para los titulares cuando la tablet del mostrador deja de dar señales en horario de apertura.
 * Pregunta cada minuto y al volver a la pestaña (el celular estuvo bloqueado). Si el titular lo oculta,
 * vuelve a salir solo si se corta de nuevo.
 */
export function AvisoTotemSinSenal() {
  const [aviso, setAviso] = useState<AvisoTotem | null>(null)
  const [oculto, setOculto] = useState<string | null>(null)

  const consultar = useCallback(async () => {
    try {
      setAviso(avisoTotemSinSenal(await apiGetTotemEstado()))
    } catch {
      // Sin conexión del lado del titular: no sabemos nada del tótem, no inventamos un aviso
    }
  }, [])

  useEffect(() => {
    if (!isApiRuntimeEnabled()) return
    setOculto(leerOculto())
    consultar()
    const intervalo = setInterval(consultar, INTERVALO_CONSULTA_ESTADO_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') consultar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [consultar])

  if (!aviso || oculto === aviso.clave) return null

  const ocultar = () => {
    setOculto(aviso.clave)
    try {
      sessionStorage.setItem(CLAVE_OCULTO, aviso.clave)
    } catch {
      // sin almacenamiento: se oculta solo hasta recargar
    }
  }

  return (
    <div role="alert" className="mx-4 mt-4 md:mx-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
      <WifiOff className="size-5 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-amber-300">{aviso.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-200">{aviso.detalle}</p>
      </div>
      <button
        type="button"
        onClick={ocultar}
        aria-label="Ocultar aviso del tótem"
        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
