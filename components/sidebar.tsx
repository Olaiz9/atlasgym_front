'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { Users, WalletCards, Dumbbell, Package, LayoutDashboard, Settings, HelpCircle, ChevronLeft, LogOut, Video, Mail, Phone, X, ExternalLink } from 'lucide-react'

const navItemsAdmin = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Alumnos', href: '/alumnos', icon: Users },
  { label: 'Finanzas', href: '/finanzas', icon: WalletCards },
  { label: 'Rutinas', href: '/rutinas', icon: Dumbbell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
  { label: 'Planes', href: '/planes', icon: Package },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const { usuarioActual, cerrarSesion } = useAppData()

  const esAlumno = usuarioActual.rol === 'ALUMNO'

  const navItems = esAlumno
    ? [
        { label: 'Inicio', href: '/', icon: LayoutDashboard },
        { label: 'Mi Rutina', href: '/rutinas', icon: Dumbbell },
        { label: 'Mis Cuotas', href: '/finanzas', icon: WalletCards },
        { label: 'Videoteca', href: '/videoteca', icon: Video },
      ]
    : navItemsAdmin

  const iniciales = usuarioActual.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-slate-800/50 bg-slate-950 md:flex transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Botón de colapso */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="absolute -right-3 top-24 flex size-6 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 shadow-md transition-all duration-300 hover:text-white hover:border-blue-600 active:scale-90"
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
              const active = pathname === href
              return (
                <Link
                  key={label}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1'
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && label}
                </Link>
              )
            })}
          </nav>

          <div className="flex flex-col gap-1.5 border-t border-slate-800/50 pt-5">
            <button
              onClick={() => setMostrarAyuda(true)}
              title={collapsed ? 'Centro de ayuda' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1 ${collapsed ? 'justify-center' : ''}`}
            >
              <HelpCircle className="size-5 shrink-0 text-amber-500" />
              {!collapsed && 'Centro de ayuda'}
            </button>
            <Link
              href="/login"
              onClick={() => cerrarSesion()}
              title={collapsed ? "Cerrar sesión" : undefined}
              className={`mt-4 flex items-center justify-between rounded-xl bg-slate-900/50 p-3 border border-slate-800/50 transition-all hover:bg-slate-900 hover:border-slate-700 group cursor-pointer ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {iniciales}
                </span>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-200">{usuarioActual.nombre}</p>
                    <p className="text-xs font-medium text-slate-500">
                      {esAlumno ? 'Alumna' : 'Coach / Admin'} · Salir
                    </p>
                  </div>
                )}
              </div>
              {!collapsed && (
                <LogOut className="size-4 text-slate-500 group-hover:text-rose-400 transition-colors shrink-0 ml-2" />
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* Modal de Centro de Ayuda */}
      {mostrarAyuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Centro de Ayuda</h3>
                  <p className="text-xs text-slate-400">Canales de atención de ATLAS Gym</p>
                </div>
              </div>
              <button
                onClick={() => setMostrarAyuda(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Canales de contacto en orden: Gmail, Teléfono, Instagram */}
            <div className="mt-5 flex flex-col gap-3">
              {/* 1. Gmail */}
              <a
                href="mailto:gonzalo5jesus@gmail.com"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-blue-500/50 hover:bg-slate-800/40 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400 group-hover:scale-105 transition-transform">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gmail / Correo</span>
                    <p className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                      gonzalo5jesus@gmail.com
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </a>

              {/* 2. Teléfono / WhatsApp */}
              <a
                href="https://wa.me/5492615665067"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-800/40 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Teléfono / WhatsApp</span>
                    <p className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      +54 9 261 566-5067
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </a>

              {/* 3. Instagram */}
              <a
                href="https://www.instagram.com/atlasgymoficial_/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-pink-500/50 hover:bg-slate-800/40 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Instagram</span>
                    <p className="text-sm font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
                      @atlasgymoficial_
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </a>
            </div>

            {/* Footer */}
            <div className="mt-5 border-t border-slate-800/60 pt-3 text-center">
              <p className="text-xs text-slate-500">
                Horario de atención: Lunes a Sábados 08:00 a 22:00 hs
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}