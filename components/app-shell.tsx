'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { useAppData } from '@/lib/store'
import { puedeAccederRuta } from '@/lib/auth-utils'
import { useToast } from '@/components/ui/toast'
import { AvisoTotemSinSenal } from '@/components/aviso-totem'
import { KeyRound, ShieldAlert } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const {
    usuarioActual,
    ultimoErrorSync,
    datosListos,
    limpiarErrorSync,
    guardarPerfilUsuario,
    cerrarSesion,
  } = useAppData()
  const { toast } = useToast()

  const [passwordActual, setPasswordActual] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [errorCambioClave, setErrorCambioClave] = useState<string | null>(null)
  const [guardandoClave, setGuardandoClave] = useState(false)
  // La sesión vive en localStorage (solo existe en el navegador): hasta montar, renderizamos lo mismo
  // que el servidor (el spinner) para evitar el error de hidratación de React.
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (ultimoErrorSync) {
      toast(ultimoErrorSync.mensaje, 'error')
      limpiarErrorSync()
    }
  }, [ultimoErrorSync, limpiarErrorSync, toast])

  // Rutas que se ven sin iniciar sesión y sin el menú: el tótem (usa su propia clave de
  // terminal) y la política de privacidad (la ley exige que se pueda leer libremente).
  const rutaPublica = pathname === '/totem' || pathname === '/privacidad'

  useEffect(() => {
    if (rutaPublica) {
      return
    }
    if (!usuarioActual && pathname !== '/login') {
      router.replace('/login')
    } else if (usuarioActual && !puedeAccederRuta(pathname, usuarioActual.rol)) {
      router.replace('/')
    }
  }, [usuarioActual, pathname, router, rutaPublica])

  if (pathname === '/login' || rutaPublica) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
        {children}
      </div>
    )
  }

  if (montado && usuarioActual && !datosListos) {
    // Los datos no se guardan en el teléfono: hasta que responde el servidor no hay nada que mostrar
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Cargando datos del gimnasio...</p>
        </div>
      </div>
    )
  }

  if (!montado || !usuarioActual) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
          <p className="text-xs text-slate-400 font-medium">{montado ? 'Redirigiendo al inicio de sesión...' : 'Cargando...'}</p>
        </div>
      </div>
    )
  }

  const manejarCambioClaveObligatorio = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorCambioClave(null)
    if (!passwordActual.trim()) {
      setErrorCambioClave('Ingresá la contraseña provisoria que te pasó el gimnasio.')
      return
    }
    if (nuevaPassword.trim().length < 6) {
      setErrorCambioClave('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (nuevaPassword.trim() === passwordActual.trim()) {
      setErrorCambioClave('Elegí una contraseña personal distinta a la provisoria.')
      return
    }
    if (nuevaPassword.trim() !== confirmarPassword.trim()) {
      setErrorCambioClave('Las contraseñas nuevas no coinciden.')
      return
    }

    setGuardandoClave(true)
    try {
      const res = await guardarPerfilUsuario({
        passwordActual: passwordActual.trim(),
        password: nuevaPassword.trim(),
      })
      if (!res.ok) {
        setErrorCambioClave(res.error || 'No se pudo actualizar la contraseña.')
        return
      }
      setPasswordActual('')
      setNuevaPassword('')
      setConfirmarPassword('')
      toast('Contraseña personal actualizada correctamente.', 'success')
    } finally {
      setGuardandoClave(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 pb-24 md:pb-0">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className={`min-w-0 w-full overflow-x-hidden transition-[padding-left] duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {usuarioActual.rol === 'ADMIN' && <AvisoTotemSinSenal />}
        {children}
      </main>
      <MobileNav />

      {usuarioActual.requiereCambioPassword && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={manejarCambioClaveObligatorio}
            className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2.5 text-amber-400 font-black text-base mb-1.5">
              <ShieldAlert className="size-5 shrink-0" />
              <span>Actualizá tu contraseña inicial</span>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {usuarioActual.rol === 'ADMIN'
                ? 'Estás ingresando con la contraseña provisoria de la instalación. Definí una clave personal antes de continuar.'
                : 'Estás ingresando con tu contraseña provisoria (la que te pasó el gimnasio, o tu DNI si te cargaron desde la planilla). Por privacidad de tu cuenta y tus rutinas, definí una clave personal antes de continuar.'}
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Contraseña provisoria actual
                </label>
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Clave provisoria..."
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Nueva contraseña personal (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Nueva contraseña..."
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Repetí la nueva contraseña..."
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {errorCambioClave && (
              <p className="text-xs text-rose-400 font-semibold mb-3">{errorCambioClave}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={cerrarSesion}
                className="h-9 px-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cerrar sesión
              </button>
              <button
                type="submit"
                disabled={guardandoClave}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                <span>{guardandoClave ? 'Guardando...' : 'Guardar nueva clave'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
