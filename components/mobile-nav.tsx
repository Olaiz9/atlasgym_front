'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppData } from '@/lib/store'
import {
  Users,
  WalletCards,
  Dumbbell,
  Package,
  LayoutDashboard,
  Video,
  LogOut,
  Bell,
  UserCheck,
  HelpCircle,
} from 'lucide-react'
import { ModalCentroAyuda } from '@/components/modal-centro-ayuda'

const navItemsAdmin = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Alumnos', href: '/alumnos', icon: Users },
  { label: 'Asistencias', href: '/asistencias', icon: UserCheck },
  { label: 'Finanzas', href: '/finanzas', icon: WalletCards },
  { label: 'Rutinas', href: '/rutinas', icon: Dumbbell },
  { label: 'Planes', href: '/planes', icon: Package },
  { label: 'Avisos', href: '/avisos', icon: Bell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
]

const navItemsAlumno = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Mi rutina', href: '/rutinas', icon: Dumbbell },
  { label: 'Mis cuotas', href: '/finanzas', icon: WalletCards },
  { label: 'Avisos', href: '/avisos', icon: Bell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
]

export function MobileNav() {
  const pathname = usePathname()
  const { usuarioActual, cerrarSesion, getCantidadAvisosNoLeidos } = useAppData()
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const [mostrarConfirmCerrar, setMostrarConfirmCerrar] = useState(false)

  if (!usuarioActual) return null

  const esAlumno = usuarioActual.rol === 'ALUMNO'
  const navItems = esAlumno ? navItemsAlumno : navItemsAdmin
  const cantNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-center justify-around border-t border-slate-800/80 bg-slate-950/95 px-1 pb-1 backdrop-blur-lg md:hidden"
      >
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const esAvisos = href === '/avisos'
          return (
            <Link
              key={label}
              href={href}
              aria-label={esAvisos && cantNoLeidos > 0 ? `${label} (${cantNoLeidos} nuevos)` : label}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 sm:px-1.5 py-1 transition-colors min-w-0 ${
                active
                  ? 'text-blue-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`size-[22px] ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {esAvisos && cantNoLeidos > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border border-slate-950">
                    {cantNoLeidos}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight truncate max-w-[55px] text-center">
                {label}
              </span>
            </Link>
          )
        })}

        {/* Botón Consultar al profesor / Centro de ayuda en móvil */}
        <button
          type="button"
          onClick={() => setMostrarAyuda(true)}
          aria-label={esAlumno ? 'Consultar al profesor' : 'Centro de ayuda'}
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 sm:px-1.5 py-1 text-slate-400 hover:text-amber-400 transition-colors active:scale-95 cursor-pointer min-w-0"
        >
          <HelpCircle className="size-[22px] stroke-2 text-amber-500/90" />
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight truncate max-w-[55px] text-center">
            {esAlumno ? 'Profesor' : 'Ayuda'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMostrarConfirmCerrar(true)}
          aria-label="Cerrar sesión"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 sm:px-1.5 py-1 text-slate-400 hover:text-rose-400 transition-colors active:scale-95 min-w-0 cursor-pointer"
        >
          <LogOut className="size-[22px] stroke-2" />
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight truncate max-w-[50px] text-center">
            Salir
          </span>
        </button>
      </nav>

      <ModalCentroAyuda
        abierto={mostrarAyuda}
        onCerrar={() => setMostrarAyuda(false)}
      />

      {mostrarConfirmCerrar && (
        <div
          onClick={() => setMostrarConfirmCerrar(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 transition-opacity duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4">
              <LogOut className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-white">¿Cerrar sesión?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Vas a salir de tu cuenta en ATLAS Gym. Podrás volver a iniciar sesión en cualquier momento.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMostrarConfirmCerrar(false)}
                className="h-10 rounded-xl border border-slate-700 px-5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarConfirmCerrar(false)
                  cerrarSesion()
                  window.location.href = '/login'
                }}
                className="h-10 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-colors active:scale-95"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

