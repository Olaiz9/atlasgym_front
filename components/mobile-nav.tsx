'use client'

import React, { useState } from 'react'
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
  Menu,
} from 'lucide-react'
import { ModalCentroAyuda } from '@/components/modal-centro-ayuda'
import { useEscapeKey } from '@/lib/use-escape-key'

type ItemNav = { label: string; href: string; icon: typeof Users }

// En el celular entran 4 accesos + "Más" sin que se pisen (más de 5 íconos en una barra de 360px se superponen).
// En la barra van las tareas de todos los días; el resto vive en el menú "Más".
const principalesAdmin: ItemNav[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Alumnos', href: '/alumnos', icon: Users },
  { label: 'Asistencias', href: '/asistencias', icon: UserCheck },
  { label: 'Finanzas', href: '/finanzas', icon: WalletCards },
]
const secundariosAdmin: ItemNav[] = [
  { label: 'Rutinas', href: '/rutinas', icon: Dumbbell },
  { label: 'Planes', href: '/planes', icon: Package },
  { label: 'Avisos', href: '/avisos', icon: Bell },
  { label: 'Videoteca', href: '/videoteca', icon: Video },
]
const principalesAlumno: ItemNav[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Mi rutina', href: '/rutinas', icon: Dumbbell },
  { label: 'Mis cuotas', href: '/finanzas', icon: WalletCards },
  { label: 'Avisos', href: '/avisos', icon: Bell },
]
const secundariosAlumno: ItemNav[] = [{ label: 'Videoteca', href: '/videoteca', icon: Video }]

function Pastilla({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  return (
    <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${activo ? 'bg-blue-600' : ''}`}>
      {children}
    </span>
  )
}

function Contador({ cantidad }: { cantidad: number }) {
  return (
    <span className="absolute -top-1 right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border border-slate-950">
      {cantidad}
    </span>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const { usuarioActual, cerrarSesion, getCantidadAvisosNoLeidos } = useAppData()
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const [mostrarConfirmCerrar, setMostrarConfirmCerrar] = useState(false)
  const [mostrarMas, setMostrarMas] = useState(false)
  useEscapeKey(() => setMostrarMas(false), mostrarMas)

  if (!usuarioActual) return null

  const esAlumno = usuarioActual.rol === 'ALUMNO'
  const principales = esAlumno ? principalesAlumno : principalesAdmin
  const secundarios = esAlumno ? secundariosAlumno : secundariosAdmin
  const cantNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)
  const esActivo = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  const masActivo = secundarios.some((i) => esActivo(i.href))
  const avisosEnMas = secundarios.some((i) => i.href === '/avisos') && cantNoLeidos > 0

  const claseItem = (activo: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 transition-colors min-w-0 ${
      activo ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
    }`

  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-stretch border-t border-slate-800/80 bg-slate-950 px-1 pb-1 md:hidden"
      >
        {principales.map(({ label, href, icon: Icon }) => {
          const activo = esActivo(href)
          const esAvisos = href === '/avisos'
          return (
            <Link
              key={label}
              href={href}
              aria-current={activo ? 'page' : undefined}
              aria-label={esAvisos && cantNoLeidos > 0 ? `${label} (${cantNoLeidos} nuevos)` : label}
              className={claseItem(activo)}
            >
              <Pastilla activo={activo}>
                <Icon className={`size-5 ${activo ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {esAvisos && cantNoLeidos > 0 && <Contador cantidad={cantNoLeidos} />}
              </Pastilla>
              <span className="w-full truncate px-0.5 text-center text-xs font-semibold tracking-tight">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMostrarMas(true)}
          aria-haspopup="dialog"
          aria-expanded={mostrarMas}
          aria-label={avisosEnMas ? `Más opciones (${cantNoLeidos} avisos nuevos)` : 'Más opciones'}
          className={`${claseItem(masActivo)} cursor-pointer`}
        >
          <Pastilla activo={masActivo}>
            <Menu className={`size-5 ${masActivo ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {avisosEnMas && <Contador cantidad={cantNoLeidos} />}
          </Pastilla>
          <span className="w-full truncate px-0.5 text-center text-xs font-semibold tracking-tight">Más</span>
        </button>
      </nav>

      {mostrarMas && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMostrarMas(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" />
            <ul className="grid gap-1">
              {secundarios.map(({ label, href, icon: Icon }) => {
                const activo = esActivo(href)
                const esAvisos = href === '/avisos'
                return (
                  <li key={label}>
                    <Link
                      href={href}
                      onClick={() => setMostrarMas(false)}
                      aria-current={activo ? 'page' : undefined}
                      className={`flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                        activo ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="size-5" />
                      <span className="flex-1">{label}</span>
                      {esAvisos && cantNoLeidos > 0 && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{cantNoLeidos} nuevos</span>
                      )}
                    </Link>
                  </li>
                )
              })}
              <li className="mt-1 border-t border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarMas(false)
                    setMostrarAyuda(true)
                  }}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <HelpCircle className="size-5 text-amber-400" />
                  {esAlumno ? 'Consultar al profesor' : 'Centro de ayuda'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarMas(false)
                    setMostrarConfirmCerrar(true)
                  }}
                  className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="size-5" />
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

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

