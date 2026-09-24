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

        <Link
          href="/login"
          onClick={cerrarSesion}
          aria-label="Cerrar sesión"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 sm:px-1.5 py-1 text-slate-400 hover:text-rose-400 transition-colors active:scale-95 min-w-0"
        >
          <LogOut className="size-[22px] stroke-2" />
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight truncate max-w-[50px] text-center">
            Salir
          </span>
        </Link>
      </nav>

      <ModalCentroAyuda
        abierto={mostrarAyuda}
        onCerrar={() => setMostrarAyuda(false)}
      />
    </>
  )
}

