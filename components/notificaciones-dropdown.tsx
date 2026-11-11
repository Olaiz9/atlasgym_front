'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronRight, Inbox, AlertCircle, Info, Clock } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { CATEGORIA_AVISO_STYLES, CategoriaAviso, Aviso } from '@/lib/types'

function DropdownCategoriaBadge({ categoria }: { categoria: CategoriaAviso }) {
  const estilo = CATEGORIA_AVISO_STYLES[categoria]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${estilo.badge}`}>
      {categoria === 'IMPORTANTE' && <AlertCircle className="size-2.5 text-rose-600" />}
      {categoria === 'NOVEDAD' && <Info className="size-2.5 text-blue-600" />}
      {categoria === 'HORARIO' && <Clock className="size-2.5 text-emerald-600" />}
      {estilo.label}
    </span>
  )
}

function DropdownItem({
  aviso,
  esLeido,
  onClick,
}: {
  aviso: Aviso
  esLeido: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-[background-color,transform] duration-150 flex flex-col gap-1.5 ${
        esLeido
          ? 'hover:bg-slate-900/60 opacity-80'
          : 'bg-blue-950/20 border border-blue-500/20 hover:bg-blue-950/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {!esLeido && <span className="size-2 rounded-full bg-rose-500 shrink-0" />}
          <DropdownCategoriaBadge categoria={aviso.categoria} />
        </div>
        <span className="text-[10px] font-medium text-slate-500">{aviso.fecha}</span>
      </div>
      <p className="text-xs font-bold text-white line-clamp-1">{aviso.titulo}</p>
      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{aviso.mensaje}</p>
    </button>
  )
}

export function NotificacionesDropdown() {
  const [abierto, setAbierto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const {
    usuarioActual,
    getAvisosParaUsuario,
    getCantidadAvisosNoLeidos,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
  } = useAppData()

  const avisos = getAvisosParaUsuario(usuarioActual)
  const cantNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)
  const ultimosAvisos = avisos.slice(0, 4)

  useEffect(() => {
    function handleClickAfuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }

    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [abierto])

  function handleVerAviso(aviso: Aviso) {
    if (!usuarioActual) return
    if (!aviso.leidoPor.includes(usuarioActual.id)) {
      marcarAvisoLeido(aviso.id, usuarioActual.id)
    }
    setAbierto(false)
    router.push('/avisos')
  }

  function handleMarcarTodasLeidas() {
    if (!usuarioActual) return
    marcarTodosAvisosLeidos(usuarioActual.id)
  }

  if (!usuarioActual) return null

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Botón de la campanita */}
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-label={cantNoLeidos > 0 ? `Tenés ${cantNoLeidos} notificaciones no leídas` : 'Notificaciones'}
        title={cantNoLeidos > 0 ? `Tenés ${cantNoLeidos} avisos sin leer` : 'Notificaciones'}
        className="relative p-1 text-slate-400 transition-[color,transform] duration-200 hover:text-white hover:scale-110 active:scale-95"
      >
        <Bell className="size-5" />
        {cantNoLeidos > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white border-2 border-slate-950">
            {cantNoLeidos}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {abierto && (
        <div
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-3 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl z-50 backdrop-blur-xl"
        >
          {/* Cabecera del desplegable */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Notificaciones</h3>
              {cantNoLeidos > 0 ? (
                <span className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black">
                  {cantNoLeidos} nuevas
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-[10px] font-bold">
                  Al día
                </span>
              )}
            </div>

            {cantNoLeidos > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <CheckCheck className="size-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Listado de avisos recientes */}
          <div className="mt-3 flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5">
            {ultimosAvisos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-slate-500">
                  <Inbox className="size-5" />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-300">No hay notificaciones</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Todo está al día en el gimnasio.</p>
              </div>
            ) : (
              ultimosAvisos.map((aviso) => (
                <DropdownItem
                  key={aviso.id}
                  aviso={aviso}
                  esLeido={usuarioActual ? aviso.leidoPor.includes(usuarioActual.id) : false}
                  onClick={() => handleVerAviso(aviso)}
                />
              ))
            )}
          </div>

          {/* Pie del desplegable */}
          <div className="mt-3 border-t border-slate-800/80 pt-3">
            <Link
              href="/avisos"
              onClick={() => setAbierto(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-800/80 transition-colors"
            >
              Ver todos los comunicados ({avisos.length}) <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
