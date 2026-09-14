'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/store'
import {
  X,
  User,
  Phone,
  Lock,
  Camera,
  CheckCircle2,
  Shield,
  CreditCard,
  Calendar,
  AlertCircle,
  Save,
} from 'lucide-react'
import { ESTADO_CUENTA_LABEL, ESTADO_CUENTA_STYLES } from '@/lib/types'

interface ModalPerfilProps {
  abierto: boolean
  onCerrar: () => void
}

export function ModalPerfil({ abierto, onCerrar }: ModalPerfilProps) {
  const {
    usuarioActual,
    alumnos,
    actualizarAlumno,
    actualizarUsuarioActual,
    getEstadoCuenta,
  } = useAppData()

  const esAlumno = usuarioActual.rol === 'ALUMNO'
  const alumnoDatos = esAlumno && usuarioActual.alumnoId
    ? alumnos.find((a) => a.id === usuarioActual.alumnoId)
    : undefined

  // Estados de edición de celular
  const [celular, setCelular] = useState(
    alumnoDatos?.celular || usuarioActual.celular || '+54 9 261 555-1234'
  )
  const [guardandoCelular, setGuardandoCelular] = useState(false)
  const [celularGuardado, setCelularGuardado] = useState(false)

  // Estados de cambio de contraseña
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorPassword, setErrorPassword] = useState('')
  const [passwordGuardada, setPasswordGuardada] = useState(false)

  // Estados de foto de perfil
  const [fotoUrl, setFotoUrl] = useState(usuarioActual.fotoUrl || '')
  const [editandoFoto, setEditandoFoto] = useState(false)

  if (!abierto) return null

  const iniciales = usuarioActual.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  const handleGuardarCelular = (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoCelular(true)

    // Si es alumno, actualizamos el registro de alumno en el store (se refleja en el panel del profesor)
    if (esAlumno && usuarioActual.alumnoId) {
      actualizarAlumno(usuarioActual.alumnoId, { celular })
    }

    // Actualizamos la sesión del usuario
    if (actualizarUsuarioActual) {
      actualizarUsuarioActual({ celular })
    }

    setTimeout(() => {
      setGuardandoCelular(false)
      setCelularGuardado(true)
      setTimeout(() => setCelularGuardado(false), 3000)
    }, 400)
  }

  const handleGuardarPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPassword('')

    if (passwordNueva.length < 6) {
      setErrorPassword('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (passwordNueva !== passwordConfirm) {
      setErrorPassword('Las contraseñas ingresadas no coinciden.')
      return
    }

    if (actualizarUsuarioActual) {
      actualizarUsuarioActual({ password: passwordNueva } as any)
    }

    setPasswordGuardada(true)
    setPasswordNueva('')
    setPasswordConfirm('')
    setTimeout(() => setPasswordGuardada(false), 3000)
  }

  const handleGuardarFoto = (nuevaUrl: string) => {
    setFotoUrl(nuevaUrl)
    if (actualizarUsuarioActual) {
      actualizarUsuarioActual({ fotoUrl: nuevaUrl })
    }
    setEditandoFoto(false)
  }

  const estadoCuenta = alumnoDatos ? getEstadoCuenta(alumnoDatos.id) : 'AL_DIA'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de Perfil */}
        <div className="relative p-6 pb-5 bg-gradient-to-b from-slate-800/80 to-slate-900 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt={usuarioActual.nombre}
                  className="size-16 rounded-full object-cover border-2 border-blue-500 shadow-md"
                />
              ) : (
                <div className="size-16 rounded-full bg-blue-600/20 text-blue-400 border-2 border-blue-500/40 flex items-center justify-center text-xl font-extrabold shadow-md">
                  {iniciales}
                </div>
              )}
              <button
                type="button"
                onClick={() => setEditandoFoto(!editandoFoto)}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow transition-transform active:scale-90"
                title="Cambiar avatar o foto"
              >
                <Camera className="size-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{usuarioActual.nombre}</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {esAlumno ? 'Socio' : 'Coach / Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{usuarioActual.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar perfil"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Selector de Foto / Avatar */}
        {editandoFoto && (
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-2 text-xs">
            <p className="font-bold text-slate-300">Seleccioná un avatar o pegá el enlace de tu foto:</p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-foto.jpg"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleGuardarFoto(fotoUrl)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Cuerpo del Perfil */}
        <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
          {/* Membresía (Solo alumnos) */}
          {esAlumno && alumnoDatos && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <CreditCard className="size-3.5 text-blue-400" />
                  Membresía y Plan
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ESTADO_CUENTA_STYLES[estadoCuenta]}`}>
                  {ESTADO_CUENTA_LABEL[estadoCuenta]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold">Plan Actual</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{alumnoDatos.plan}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" />
                    Vencimiento
                  </span>
                  <span className="text-xs font-bold text-white mt-0.5 block">Día 10 del mes</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                * Para solicitar un cambio de plan o consultas sobre aranceles, comunicate directamente con recepción o tu profesor.
              </p>
            </div>
          )}

          {/* Formulario 1: Editar Celular (WhatsApp) */}
          <form onSubmit={handleGuardarCelular} className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="perfil-celular" className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Phone className="size-3.5 text-blue-400" />
                Celular / WhatsApp
              </label>
              {celularGuardado && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] animate-in fade-in">
                  <CheckCircle2 className="size-3.5" />
                  ¡Actualizado en todo el sistema!
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                id="perfil-celular"
                type="tel"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="+54 9 261 123-4567"
                required
                className="flex-1 bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
              />
              <button
                type="submit"
                disabled={guardandoCelular}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="size-3.5" />
                {guardandoCelular ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              {esAlumno
                ? 'Tu profesor y administración verán este número actualizado inmediatamente para avisos y comprobantes.'
                : 'Número de contacto oficial del profesor para comunicación interna.'}
            </p>
          </form>

          {/* Formulario 2: Cambiar Contraseña */}
          <form onSubmit={handleGuardarPassword} className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Lock className="size-3.5 text-blue-400" />
                Seguridad & Contraseña
              </span>
              {passwordGuardada && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] animate-in fade-in">
                  <CheckCircle2 className="size-3.5" />
                  Contraseña cambiada
                </span>
              )}
            </div>

            {errorPassword && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorPassword}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Nueva contraseña (mín. 6)"
                className="bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repetir nueva contraseña"
                className="bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!passwordNueva}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Actualizar contraseña
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
          >
            Listo, cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
