'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { Users, WalletCards, Dumbbell, Package, LayoutDashboard, Settings, HelpCircle, ChevronLeft, LogOut, Video, Bell } from 'lucide-react'
import { ModalCentroAyuda } from '@/components/modal-centro-ayuda'

const navItemsAdmin = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Alumnos', href: '/alumnos', icon: Users },
  { label: 'Finanzas', href: '/finanzas', icon: WalletCards },
  { label: 'Rutinas', href: '/rutinas', icon: Dumbbell },
  { label: 'Avisos', href: '/avisos', icon: Bell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
  { label: 'Planes', href: '/planes', icon: Package },
]

const navItemsAlumno = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Mi Rutina', href: '/rutinas', icon: Dumbbell },
  { label: 'Mis Cuotas', href: '/finanzas', icon: WalletCards },
  { label: 'Avisos', href: '/avisos', icon: Bell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
]

function SidebarUserCard({
  usuario,
  collapsed,
  onCerrarSesion,
}: {
  usuario: { nombre: string; rol: string }
  collapsed: boolean
  onCerrarSesion: () => void
}) {
  const iniciales = usuario.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const rolLabel = usuario.rol === 'ALUMNO' ? 'Alumno/a' : 'Coach / Admin'

  return (
    <div
      className={`mt-4 flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-slate-800/60 ${collapsed ? 'justify-center' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400">
          {iniciales}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-200">{usuario.nombre}</p>
            <p className="text-[11px] font-medium text-slate-500">{rolLabel}</p>
          </div>
        )}
      </div>
      <Link
        href="/login"
        onClick={onCerrarSesion}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className={`flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-90 ${collapsed ? 'mt-2' : 'ml-1'}`}
      >
        <LogOut className="size-4 shrink-0" />
      </Link>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const { usuarioActual, cerrarSesion, getCantidadAvisosNoLeidos } = useAppData()
  if (!usuarioActual) return null

  const esAlumno = usuarioActual.rol === 'ALUMNO'
  const navItems = esAlumno ? navItemsAlumno : navItemsAdmin
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const cantNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-slate-800/50 bg-slate-950 md:flex transition-[width] duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Botón de colapso */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-24 flex size-6 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 shadow-md transition-[color,border-color,transform] duration-200 hover:text-white hover:border-blue-600 active:scale-90"
        >
          <ChevronLeft className={`size-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className={`flex h-20 items-center border-b border-slate-800/50 ${collapsed ? 'justify-center px-2' : 'px-7'}`}>
          <Link href="/" className="flex items-center gap-3 group">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-base font-black text-white shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105">A</span>
            {!collapsed && <span className="text-2xl font-black tracking-[0.2em] text-white">ATLAS</span>}
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-between px-4 py-6">
          <nav className="flex flex-col gap-1.5" aria-label="Navegación principal">
            {!collapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {esAlumno ? 'Portal del Alumno' : 'Panel principal'}
              </p>
            )}
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              const esAvisos = href === '/avisos'
              return (
                <Link
                  key={label}
                  href={href}
                  title={collapsed ? (esAvisos && cantNoLeidos > 0 ? `${label} (${cantNoLeidos} nuevos)` : label) : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-[color,background-color,transform] duration-200 ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1'
                  }`}
                >
                  <div className="relative">
                    <Icon className="size-5 shrink-0" />
                    {esAvisos && cantNoLeidos > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-rose-500 border border-slate-950" />
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {esAvisos && cantNoLeidos > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                          {cantNoLeidos}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex flex-col gap-1.5 border-t border-slate-800/50 pt-5">
            <button
              onClick={() => setMostrarAyuda(true)}
              title={collapsed ? 'Centro de ayuda' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 transition-[color,background-color,transform] duration-200 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1 ${collapsed ? 'justify-center' : ''}`}
            >
              <HelpCircle className="size-5 shrink-0 text-amber-500" />
              {!collapsed && 'Centro de ayuda'}
            </button>
            <SidebarUserCard
              usuario={usuarioActual}
              collapsed={collapsed}
              onCerrarSesion={cerrarSesion}
            />
          </div>
        </div>
      </aside>

      <ModalCentroAyuda
        abierto={mostrarAyuda}
        onCerrar={() => setMostrarAyuda(false)}
      />
    </>
  )
}