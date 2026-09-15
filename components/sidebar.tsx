'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { Users, WalletCards, Dumbbell, Package, LayoutDashboard, Settings, HelpCircle, ChevronLeft, LogOut, Video, Bell } from 'lucide-react'
import { ModalCentroAyuda } from '@/components/modal-centro-ayuda'
import { ModalPerfil } from '@/components/modal-perfil'

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
  onAbrirPerfil,
}: {
  usuario: { nombre: string; rol: string; fotoUrl?: string }
  collapsed: boolean
  onCerrarSesion: () => void
  onAbrirPerfil: () => void
}) {
  const iniciales = usuario.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const rolLabel = usuario.rol === 'ALUMNO' ? 'Alumno/a' : 'Coach / Admin'

  if (collapsed) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-slate-900/80 p-2 border border-slate-800/80 shadow-sm shrink-0">
        <button
          type="button"
          onClick={onAbrirPerfil}
          title={`Mi Perfil: ${usuario.nombre} (${rolLabel})`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 hover:ring-2 hover:ring-blue-500/60 transition-all cursor-pointer overflow-hidden active:scale-95"
        >
          {usuario.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={usuario.fotoUrl} alt={usuario.nombre} className="size-full object-cover" />
          ) : (
            iniciales
          )}
        </button>
        <Link
          href="/login"
          onClick={onCerrarSesion}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-90"
        >
          <LogOut className="size-4 shrink-0" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-slate-800/60 shadow-sm shrink-0">
      <button
        type="button"
        onClick={onAbrirPerfil}
        className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer flex-1"
        title="Ver y editar mi perfil"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 overflow-hidden">
          {usuario.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={usuario.fotoUrl} alt={usuario.nombre} className="size-full object-cover" />
          ) : (
            iniciales
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-200">{usuario.nombre}</p>
          <p className="text-[11px] font-medium text-slate-500">{rolLabel}</p>
        </div>
      </button>
      <Link
        href="/login"
        onClick={onCerrarSesion}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-90 ml-1 shrink-0"
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
  const [mostrarPerfil, setMostrarPerfil] = useState(false)
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

        <div className="flex h-20 items-center justify-center border-b border-slate-800/50 px-4 shrink-0">
          <Link href="/" className="flex items-center justify-center group py-2" title="ATLAS GYM">
            {collapsed ? (
              <Image
                src="/logo-a-blanco.png"
                alt="ATLAS"
                width={36}
                height={64}
                className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            ) : (
              <Image
                src="/logo-atlas-blanco.png"
                alt="ATLAS GYM"
                width={160}
                height={90}
                className="h-11 w-auto max-w-[170px] object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            )}
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-between px-3.5 py-6 overflow-y-auto overflow-x-hidden min-h-0">
          <nav className="flex flex-col gap-2.5 pb-5 shrink-0" aria-label="Navegación principal">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
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
                  className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-[color,background-color,transform] duration-200 ${
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

          <div className="mt-auto shrink-0 flex flex-col gap-2.5 border-t border-slate-800/50 pt-5">
            <button
              onClick={() => setMostrarAyuda(true)}
              title={collapsed ? 'Centro de ayuda' : undefined}
              className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-400 transition-[color,background-color,transform] duration-200 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1 ${collapsed ? 'justify-center' : ''}`}
            >
              <HelpCircle className="size-5 shrink-0 text-amber-500" />
              {!collapsed && 'Centro de ayuda'}
            </button>
            <SidebarUserCard
              usuario={usuarioActual}
              collapsed={collapsed}
              onCerrarSesion={cerrarSesion}
              onAbrirPerfil={() => setMostrarPerfil(true)}
            />
          </div>
        </div>
      </aside>

      <ModalCentroAyuda
        abierto={mostrarAyuda}
        onCerrar={() => setMostrarAyuda(false)}
      />

      <ModalPerfil
        abierto={mostrarPerfil}
        onCerrar={() => setMostrarPerfil(false)}
      />
    </>
  )
}