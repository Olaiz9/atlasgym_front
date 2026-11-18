'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/store'
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { ESTADO_CUENTA_STYLES, ESTADO_CUENTA_LABEL } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { ModalCentroAyuda } from '@/components/modal-centro-ayuda'
import { useEscapeKey } from '@/lib/use-escape-key'
import { inicialesDe } from '@/lib/utils'

interface ModalPerfilProps {
  abierto: boolean
  onCerrar: () => void
}

const claseCampo =
  'h-[52px] rounded-xl border border-[#2A4677] bg-[#13254A] px-3.5 text-base text-slate-100 outline-none focus:border-blue-400'
const claseEtiqueta = 'flex flex-col gap-1.5 text-sm text-slate-300'
const claseTitulo = 'text-[13px] font-semibold uppercase tracking-[.06em] text-[#8296BB]'

export function ModalPerfil({ abierto, onCerrar }: ModalPerfilProps) {
  const { toast } = useToast()
  useEscapeKey(onCerrar, abierto)
  const {
    usuarioActual,
    alumnos,
    guardarPerfilUsuario,
    actualizarUsuarioActual,
    getEstadoCuenta,
    cerrarSesion,
  } = useAppData()

  const esAlumno = usuarioActual?.rol === 'ALUMNO'
  const alumnoDatos = esAlumno && usuarioActual?.alumnoId
    ? alumnos.find((a) => a.id === usuarioActual.alumnoId)
    : undefined
  const celularInicial = alumnoDatos?.celular || usuarioActual?.celular || ''

  const [celular, setCelular] = useState(celularInicial)
  const [celularGuardado, setCelularGuardado] = useState(celularInicial)
  const [guardando, setGuardando] = useState(false)

  const [claveAbierta, setClaveAbierta] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorPassword, setErrorPassword] = useState('')

  const [fotoUrl, setFotoUrl] = useState(usuarioActual?.fotoUrl || '')
  const [errorFoto, setErrorFoto] = useState('')
  const [editandoFoto, setEditandoFoto] = useState(false)

  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

  if (!abierto || !usuarioActual) return null

  const iniciales = inicialesDe(usuarioActual.nombre)
  const quiereCambiarClave = claveAbierta && !!(passwordActual || passwordNueva || passwordConfirm)

  const validarPassword = () => {
    if (!passwordActual.trim()) return 'Por seguridad, debés ingresar tu contraseña actual.'
    if (passwordNueva.length < 6) return 'La nueva contraseña debe tener al menos 6 caracteres.'
    if (passwordNueva !== passwordConfirm) return 'Las contraseñas nuevas ingresadas no coinciden.'
    return ''
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorPassword('')
    const cambioCelular = celular.trim() !== celularGuardado.trim()

    if (cambioCelular && !celular.trim()) {
      toast('Ingresá un celular de contacto', 'error')
      return
    }
    if (quiereCambiarClave) {
      const error = validarPassword()
      if (error) {
        setErrorPassword(error)
        return
      }
    }
    if (!cambioCelular && !quiereCambiarClave) {
      toast('No hay cambios para guardar', 'info')
      return
    }

    setGuardando(true)
    try {
      if (cambioCelular) {
        if (guardarPerfilUsuario) {
          const res = await guardarPerfilUsuario({ celular })
          if (!res.ok) {
            toast(res.error || 'No se pudo actualizar el teléfono de contacto', 'error')
            return
          }
        } else {
          actualizarUsuarioActual?.({ celular })
        }
        setCelularGuardado(celular)
        toast('Teléfono de contacto actualizado correctamente', 'success')
      }

      if (quiereCambiarClave) {
        if (guardarPerfilUsuario) {
          const res = await guardarPerfilUsuario({
            password: passwordNueva,
            passwordActual: passwordActual.trim(),
          })
          if (!res.ok) {
            const msg = res.error || 'La contraseña actual ingresada es incorrecta.'
            setErrorPassword(msg)
            toast(msg, 'error')
            return
          }
        } else {
          actualizarUsuarioActual?.({ password: passwordNueva, passwordActual: passwordActual.trim() })
        }
        toast('Contraseña modificada exitosamente', 'success')
        setPasswordActual('')
        setPasswordNueva('')
        setPasswordConfirm('')
        setClaveAbierta(false)
      }
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardarFoto = async (nuevaUrl: string) => {
    setErrorFoto('')
    const limpia = nuevaUrl.trim()
    if (
      limpia &&
      !limpia.toLowerCase().startsWith('https://') &&
      !limpia.toLowerCase().startsWith('http://') &&
      !limpia.startsWith('/')
    ) {
      setErrorFoto('La URL de la foto debe comenzar con https://, http:// o /')
      return
    }

    if (guardarPerfilUsuario) {
      const res = await guardarPerfilUsuario({ fotoUrl: limpia })
      if (!res.ok) {
        setErrorFoto(res.error || 'No se pudo actualizar la foto de perfil.')
        toast(res.error || 'No se pudo actualizar la foto de perfil.', 'error')
        return
      }
    } else {
      actualizarUsuarioActual?.({ fotoUrl: limpia })
    }

    setFotoUrl(limpia)
    toast('Foto de perfil actualizada', 'success')
    setEditandoFoto(false)
  }

  const estadoCuenta = alumnoDatos ? getEstadoCuenta(alumnoDatos.id) : 'AL_DIA'

  return (
    <div
      className="fixed inset-0 z-50 flex bg-[#0E1B36] md:items-center md:justify-center md:bg-slate-950/80 md:p-4 md:backdrop-blur-sm"
      onClick={onCerrar}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-perfil"
        onSubmit={handleGuardar}
        onClick={(e) => e.stopPropagation()}
        className="flex h-dvh w-full flex-col bg-[#0E1B36] text-slate-100 md:h-auto md:max-h-[90vh] md:max-w-lg md:overflow-hidden md:rounded-3xl md:border md:border-slate-800 md:shadow-2xl"
      >
        <header className="flex items-center gap-1 px-3 pb-1 pt-3">
          <button type="button" onClick={onCerrar} aria-label="Volver" className="flex size-12 items-center justify-center rounded-xl hover:bg-slate-900">
            <ChevronLeft className="size-[22px]" />
          </button>
          <h2 id="titulo-perfil" className="text-lg font-semibold">Mi perfil</h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 pb-6 pt-3">
          <div className="flex items-center gap-4">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt={`Foto de perfil de ${usuarioActual.nombre}`} className="size-[72px] shrink-0 rounded-full border border-slate-700 object-cover" />
            ) : (
              <span role="img" aria-label={`Foto de perfil: iniciales ${iniciales}`} className="flex size-[72px] shrink-0 items-center justify-center rounded-full border border-slate-700 bg-[#1E3663] text-[22px] font-semibold text-blue-200">
                {iniciales}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-lg font-semibold">{usuarioActual.nombre}</p>
              <p className="text-sm text-[#8296BB]">{esAlumno ? 'Socio' : 'Titular'}</p>
              <button type="button" onClick={() => setEditandoFoto(!editandoFoto)} aria-expanded={editandoFoto} className="h-11 self-start text-sm text-blue-400">
                Cambiar foto
              </button>
            </div>
          </div>

          {editandoFoto && (
            <div className="-mt-3 flex flex-col gap-2">
              <label className={claseEtiqueta}>
                Enlace seguro de tu foto
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  className={claseCampo}
                />
              </label>
              {errorFoto && <p className="text-[13px] font-semibold text-rose-400">{errorFoto}</p>}
              <button type="button" onClick={() => handleGuardarFoto(fotoUrl)} className="h-11 rounded-xl border border-[#2A4677] text-sm font-semibold hover:bg-slate-900">
                Guardar foto
              </button>
            </div>
          )}

          {esAlumno && alumnoDatos && (
            <section aria-labelledby="titulo-membresia" className="flex flex-col gap-1">
              <h3 id="titulo-membresia" className={claseTitulo}>Membresía</h3>
              <div className="flex min-h-12 items-center justify-between border-b border-[#1E3663] text-[15px]">
                <span className="text-[#8296BB]">Plan actual</span>
                <span>{alumnoDatos.plan}</span>
              </div>
              <div className="flex min-h-12 items-center justify-between border-b border-[#1E3663] text-[15px]">
                <span className="text-[#8296BB]">Estado</span>
                <span className={`font-semibold ${ESTADO_CUENTA_STYLES[estadoCuenta]}`}>{ESTADO_CUENTA_LABEL[estadoCuenta]}</span>
              </div>
              <div className="flex min-h-12 items-center justify-between border-b border-[#1E3663] text-[15px]">
                <span className="text-[#8296BB]">Vencimiento</span>
                <span>Día 10 del mes</span>
              </div>
              <p className="mt-2 text-[13px] text-[#8296BB]">
                Para cambiar de plan o consultar aranceles, hablá con recepción o tu profesor.
              </p>
            </section>
          )}

          <section aria-labelledby="titulo-datos" className="flex flex-col gap-3.5">
            <h3 id="titulo-datos" className={claseTitulo}>Mis datos</h3>
            <label className={claseEtiqueta}>
              Celular
              <input
                type="tel"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="+54 9 261 123-4567"
                className={claseCampo}
              />
              <span className="text-[13px] text-[#8296BB]">Lo usamos para los avisos por WhatsApp.</span>
            </label>
            <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#1E3663] text-[15px]">
              <span className="text-[#8296BB]">Usuario</span>
              <span className="truncate">{usuarioActual.email}</span>
            </div>
          </section>

          <section aria-labelledby="titulo-seguridad" className="flex flex-col gap-3">
            <h3 id="titulo-seguridad" className={claseTitulo}>Seguridad</h3>
            <button
              type="button"
              aria-expanded={claveAbierta}
              onClick={() => setClaveAbierta(!claveAbierta)}
              className="flex min-h-[52px] items-center justify-between rounded-xl border border-[#2A4677] bg-[#13254A] px-3.5 text-[15px]"
            >
              Cambiar contraseña
              <ChevronDown className={`size-[18px] transition-transform ${claveAbierta ? 'rotate-180' : ''}`} />
            </button>
            {claveAbierta && (
              <div className="flex flex-col gap-2.5">
                {errorPassword && (
                  <p role="alert" className="flex items-center gap-2 text-[13px] font-semibold text-rose-400">
                    <AlertCircle className="size-4 shrink-0" />
                    {errorPassword}
                  </p>
                )}
                <label className={claseEtiqueta}>
                  Contraseña actual
                  <input type="password" autoComplete="current-password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={claseCampo} />
                </label>
                <label className={claseEtiqueta}>
                  Nueva contraseña
                  <input type="password" autoComplete="new-password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} className={claseCampo} />
                  <span className="text-[13px] text-[#8296BB]">Mínimo 6 caracteres.</span>
                </label>
                <label className={claseEtiqueta}>
                  Repetir nueva contraseña
                  <input type="password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={claseCampo} />
                </label>
              </div>
            )}
          </section>

          {!claveAbierta && (
            <nav aria-label="Otras opciones" className="flex flex-col">
              <button type="button" onClick={() => setMostrarAyuda(true)} className="flex min-h-[52px] items-center justify-between border-b border-[#1E3663] text-left text-[15px]">
                {esAlumno ? 'Consultar al profesor' : 'Centro de ayuda'}
                <ChevronRight className="size-[18px] text-[#8296BB]" />
              </button>
              {confirmandoSalida ? (
                <div className="flex min-h-[52px] items-center justify-between gap-2 border-b border-[#1E3663] py-1 text-[15px]">
                  <span>¿Cerrar sesión?</span>
                  <span className="flex gap-2">
                    <button type="button" onClick={() => setConfirmandoSalida(false)} className="h-11 rounded-xl border border-[#2A4677] px-3 text-sm font-semibold">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        cerrarSesion()
                        window.location.href = '/login'
                      }}
                      className="h-11 rounded-xl bg-[#C4362F] px-3 text-sm font-semibold text-white"
                    >
                      Salir
                    </button>
                  </span>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmandoSalida(true)} className="flex min-h-[52px] items-center border-b border-[#1E3663] text-left text-[15px] text-rose-400">
                  Cerrar sesión
                </button>
              )}
            </nav>
          )}
        </div>

        <div className="border-t border-[#1E3663] px-5 pb-6 pt-3">
          <button type="submit" disabled={guardando} className="h-[54px] w-full rounded-[14px] bg-blue-600 text-base font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <div onClick={(e) => e.stopPropagation()}>
        <ModalCentroAyuda abierto={mostrarAyuda} onCerrar={() => setMostrarAyuda(false)} />
      </div>
    </div>
  )
}

/** Avatar del encabezado en celular: es la entrada a "Mi perfil" (en escritorio está en el menú lateral). */
export function BotonPerfilMovil() {
  const { usuarioActual } = useAppData()
  const [abierto, setAbierto] = useState(false)
  if (!usuarioActual) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Mi perfil: ${usuarioActual.nombre}`}
        className="flex size-12 items-center justify-center rounded-full md:hidden"
      >
        {usuarioActual.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={usuarioActual.fotoUrl} alt="" className="size-10 rounded-full border border-slate-700 object-cover" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full border border-slate-700 bg-[#1E3663] text-[13px] font-semibold text-blue-200">
            {inicialesDe(usuarioActual.nombre)}
          </span>
        )}
      </button>
      <ModalPerfil abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}
