// app/totem/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useAppData } from '@/lib/store'
import {
  normalizarDni,
  recortarAsistenciasParaCacheLocal,
  reproducirSonidoFeedback,
} from '@/lib/asistencia-utils'
import {
  apiCheckInTotem,
  apiGetTotemPadronCache,
  apiSyncTotemOutbox,
  esErrorDeRed,
  esFallbackOfflineDemoPermitido,
  getStoredJwtToken,
  getStoredTotemSecret,
  isApiRuntimeEnabled,
  setStoredTotemSecret,
} from '@/lib/api-client'
import {
  encolarEventoOutboxTotem,
  guardarPadronCacheTotem,
  leerOutboxTotem,
  leerPadronCacheTotem,
  removerEventosSincronizadosOutbox,
  resolverCheckInOfflineConPadron,
} from '@/lib/totem-offline'
import { fechaLocalHoy } from '@/lib/date-utils'
import { Alumno, EstadoCuenta, RegistroAsistencia } from '@/lib/types'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Delete,
  Check,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  CloudUpload,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

type EstadoTotem = 'IDLE' | 'EXITO' | 'ALERTA' | 'ERROR'

interface ResultadoFeedback {
  alumno?: Alumno
  estadoCuenta?: EstadoCuenta
  motivo?: string
  esDuplicado?: boolean
  tituloError?: string
}

export default function TotemPage() {
  const { registrarAsistenciaPorDni } = useAppData()
  const [dni, setDni] = useState('')
  const [estado, setEstado] = useState<EstadoTotem>('IDLE')
  const [resultado, setResultado] = useState<ResultadoFeedback | null>(null)
  const [tiempoRestante, setTiempoRestante] = useState(3.5)
  const [horaActual, setHoraActual] = useState('')
  const [fechaActual, setFechaActual] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [pendientesOutbox, setPendientesOutbox] = useState(0)
  const [padronSincronizadoCount, setPadronSincronizadoCount] = useState(0)
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false)
  const [claveTerminalInput, setClaveTerminalInput] = useState('')
  const [mensajeVinculacion, setMensajeVinculacion] = useState<string | null>(null)
  const sincronizandoOutboxRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sincronizarPadronCache = useCallback(async () => {
    if (!isApiRuntimeEnabled()) return false
    if (!getStoredTotemSecret() && !getStoredJwtToken()) return false
    try {
      const items = await apiGetTotemPadronCache()
      if (Array.isArray(items)) {
        guardarPadronCacheTotem(items)
        setPadronSincronizadoCount(items.length)
        return true
      }
    } catch {}
    return false
  }, [])

  const vaciarColaOutbox = useCallback(async () => {
    if (!isApiRuntimeEnabled() || sincronizandoOutboxRef.current) return
    const cola = leerOutboxTotem()
    setPendientesOutbox(cola.length)
    if (cola.length === 0) return

    sincronizandoOutboxRef.current = true
    try {
      const res = await apiSyncTotemOutbox(
        cola.map((e) => ({
          clientEventId: e.clientEventId,
          dni: e.dni,
          fecha: e.fecha,
          hora: e.hora,
        }))
      )
      if (Array.isArray(res?.clientEventIdsProcesados)) {
        const restantes = removerEventosSincronizadosOutbox(res.clientEventIdsProcesados)
        setPendientesOutbox(restantes.length)
      }
    } catch {
      // Sigue offline; reintentará automáticamente al recuperar conectividad
    } finally {
      sincronizandoOutboxRef.current = false
    }
  }, [])

  useEffect(() => {
    const cacheExistente = leerPadronCacheTotem()
    if (cacheExistente) setPadronSincronizadoCount(cacheExistente.length)
    setPendientesOutbox(leerOutboxTotem().length)
    setClaveTerminalInput(getStoredTotemSecret())

    sincronizarPadronCache()
    vaciarColaOutbox()

    const onOnline = () => {
      vaciarColaOutbox()
      sincronizarPadronCache()
    }
    window.addEventListener('online', onOnline)

    const intvOutbox = setInterval(vaciarColaOutbox, 15000)
    const intvPadron = setInterval(sincronizarPadronCache, 300000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(intvOutbox)
      clearInterval(intvPadron)
    }
  }, [sincronizarPadronCache, vaciarColaOutbox])

  // Reemplazar historial del navegador para prevenir volver atrás con botón del navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/totem')
    }
  }, [])

  // Reloj digital en vivo
  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date()
      setHoraActual(
        ahora.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      )
      setFechaActual(
        ahora.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      )
    }

    actualizarReloj()
    const intv = setInterval(actualizarReloj, 1000)
    return () => clearInterval(intv)
  }, [])

  const reiniciarAIdle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDni('')
    setEstado('IDLE')
    setResultado(null)
    setTiempoRestante(3.5)
    setProcesando(false)
  }, [])

  const iniciarAutoReset = useCallback(() => {
    setTiempoRestante(3.5)
    const inicio = Date.now()
    const duracionMs = 3500

    intervalRef.current = setInterval(() => {
      const transcurrido = Date.now() - inicio
      const restante = Math.max(0, (duracionMs - transcurrido) / 1000)
      setTiempoRestante(parseFloat(restante.toFixed(1)))
      if (restante <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 100)

    timerRef.current = setTimeout(() => {
      reiniciarAIdle()
    }, duracionMs)
  }, [reiniciarAIdle])

  const manejarEnvio = useCallback(
    async (dniAEnviar?: string) => {
      const valorDni = normalizarDni(dniAEnviar || dni)
      if (!valorDni || procesando) return

      setProcesando(true)

      // 1. Fuente primaria de verdad: Backend Spring Boot / MySQL (/api/asistencias/totem).
      // Garantiza que una tablet dedicada de Tótem consulte siempre el estado real de cuota
      // y registre el ingreso en la base central sin depender de sesiones locales.
      if (isApiRuntimeEnabled()) {
        try {
          const backRes = await apiCheckInTotem(valorDni)
          const alumnoRemoto: Alumno | undefined = backRes.nombreAlumno
            ? {
                id: String(backRes.alumnoId ?? valorDni),
                nombre: backRes.nombreAlumno,
                dni: backRes.alumnoDni || valorDni,
                plan: backRes.planNombre || 'Pase Libre',
                fechaAlta: fechaLocalHoy(),
                activo: true,
                tieneRutina: false,
              }
            : undefined

          if (backRes.ok && alumnoRemoto) {
            const estadoRemoto = backRes.estadoCuenta || 'AL_DIA'
            const nuevaAsistencia: RegistroAsistencia = {
              id: String(backRes.asistenciaId ?? `asist-${Date.now()}`),
              alumnoId: alumnoRemoto.id,
              alumnoNombre: alumnoRemoto.nombre,
              alumnoDni: alumnoRemoto.dni || valorDni,
              fecha: fechaLocalHoy(),
              hora:
                backRes.horaIngreso?.slice(0, 5) ||
                new Date().toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'America/Argentina/Buenos_Aires',
                }),
              timestamp: Date.now(),
              estadoCuenta: estadoRemoto,
              planNombre: alumnoRemoto.plan,
              metodo: 'DNI_TOTEM',
              asistenciasSemana: backRes.asistenciasSemana ?? undefined,
              limiteDiasSemana:
                backRes.limiteDiasSemana !== undefined ? backRes.limiteDiasSemana : undefined,
              excedeLimiteSemanal: backRes.excedeLimiteSemanal ?? undefined,
            }

            try {
              const raw = localStorage.getItem('atlas_asistencias_v2')
              const prev: RegistroAsistencia[] = raw ? JSON.parse(raw) : []
              const sinDuplicado = prev.filter((item) => item.id !== nuevaAsistencia.id)
              const actualizadas = recortarAsistenciasParaCacheLocal(
                [nuevaAsistencia, ...sinDuplicado],
                fechaLocalHoy(),
                7,
                500
              )
              localStorage.setItem('atlas_asistencias_v2', JSON.stringify(actualizadas))
              if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('atlas_asistencias_channel')
                bc.postMessage({ tipo: 'NUEVA_ASISTENCIA', asistencias: actualizadas })
                bc.close()
              }
            } catch {}

            vaciarColaOutbox()

            if (estadoRemoto === 'AL_DIA') {
              setEstado('EXITO')
              reproducirSonidoFeedback('EXITO')
            } else {
              setEstado('ALERTA')
              reproducirSonidoFeedback('ALERTA')
            }
            setResultado({
              alumno: alumnoRemoto,
              estadoCuenta: estadoRemoto,
            })
            iniciarAutoReset()
            return
          }

          if (backRes.yaRegistrado && alumnoRemoto) {
            setEstado('ALERTA')
            reproducirSonidoFeedback('ALERTA')
            setResultado({
              alumno: alumnoRemoto,
              estadoCuenta: backRes.estadoCuenta || 'AL_DIA',
              motivo: backRes.motivo || 'Tu sesión de entrenamiento continúa activa.',
              esDuplicado: true,
            })
            iniciarAutoReset()
            return
          }

          setEstado('ERROR')
          reproducirSonidoFeedback('ERROR')
          setResultado({
            alumno: alumnoRemoto,
            motivo: backRes.motivo || 'DNI no encontrado en la base de socios.',
          })
          iniciarAutoReset()
          return
        } catch (err: unknown) {
          // Si el servidor respondió con un error HTTP explícito (ej: 403 clave de tótem o 429 límite),
          // mostrar el motivo real en lugar de simular falsamente "DNI no encontrado".
          if (!esErrorDeRed(err)) {
            const detalle =
              err instanceof Error && err.message
                ? err.message
                : 'No se pudo procesar el ingreso en este momento.'
            if (detalle.includes('no autorizado') || detalle.includes('HTTP 403')) {
              setModalVinculacionAbierto(true)
            }
            setEstado('ERROR')
            reproducirSonidoFeedback('ERROR')
            setResultado({
              tituloError: 'Terminal pendiente de autorización',
              motivo: detalle,
            })
            iniciarAutoReset()
            return
          }
          // Solo si hay corte de red / backend apagado, caemos al padrón offline real + cola Outbox
        }
      }

      // 2. Respaldo offline real usando el padrón mínimo sincronizado desde MySQL + cola Outbox idempotente
      const padronCache = leerPadronCacheTotem()
      if (padronCache !== null) {
        let asistenciasLocales: RegistroAsistencia[] = []
        try {
          const raw = localStorage.getItem('atlas_asistencias_v2')
          if (raw) asistenciasLocales = JSON.parse(raw)
        } catch {}

        const resOffline = resolverCheckInOfflineConPadron(
          valorDni,
          padronCache,
          asistenciasLocales,
          Date.now(),
          fechaLocalHoy()
        )

        if (resOffline.ok && resOffline.alumno && resOffline.asistenciaLocal && resOffline.eventoOutbox) {
          const colaActualizada = encolarEventoOutboxTotem(resOffline.eventoOutbox)
          setPendientesOutbox(colaActualizada.length)

          try {
            const actualizadas = recortarAsistenciasParaCacheLocal(
              [resOffline.asistenciaLocal, ...asistenciasLocales],
              fechaLocalHoy(),
              7,
              500
            )
            localStorage.setItem('atlas_asistencias_v2', JSON.stringify(actualizadas))
            if (typeof BroadcastChannel !== 'undefined') {
              const bc = new BroadcastChannel('atlas_asistencias_channel')
              bc.postMessage({ tipo: 'NUEVA_ASISTENCIA', asistencias: actualizadas })
              bc.close()
            }
          } catch {}

          if (resOffline.estadoCuenta === 'AL_DIA') {
            setEstado('EXITO')
            reproducirSonidoFeedback('EXITO')
          } else {
            setEstado('ALERTA')
            reproducirSonidoFeedback('ALERTA')
          }
          setResultado({
            alumno: resOffline.alumno,
            estadoCuenta: resOffline.estadoCuenta,
          })
          iniciarAutoReset()
          return
        }

        if (resOffline.yaRegistrado && resOffline.alumno) {
          setEstado('ALERTA')
          reproducirSonidoFeedback('ALERTA')
          setResultado({
            alumno: resOffline.alumno,
            estadoCuenta: resOffline.estadoCuenta,
            motivo: resOffline.motivo,
            esDuplicado: true,
          })
          iniciarAutoReset()
          return
        }

        setEstado('ERROR')
        reproducirSonidoFeedback('ERROR')
        setResultado({
          alumno: resOffline.alumno,
          motivo: resOffline.motivo || 'DNI no encontrado en el padrón sincronizado.',
        })
        iniciarAutoReset()
        return
      }

      if (!esFallbackOfflineDemoPermitido({ yaSincronizadoConBackend: false })) {
        setEstado('ERROR')
        reproducirSonidoFeedback('ERROR')
        setResultado({
          tituloError: 'Sin conexión con el servidor central',
          motivo:
            'No hay conexión de red y esta terminal aún no sincronizó el padrón offline. Vinculá la clave de terminal cuando vuelva la red.',
        })
        iniciarAutoReset()
        return
      }

      // 3. Respaldo exclusivamente para entorno de desarrollo local sin backend / Vitest
      const res = registrarAsistenciaPorDni(valorDni, { omitirApiRemota: true })

      if (res.ok && res.alumno) {
        if (res.estadoCuenta === 'AL_DIA') {
          setEstado('EXITO')
          reproducirSonidoFeedback('EXITO')
        } else {
          setEstado('ALERTA')
          reproducirSonidoFeedback('ALERTA')
        }
        setResultado({
          alumno: res.alumno,
          estadoCuenta: res.estadoCuenta,
        })
        iniciarAutoReset()
        return
      }

      if (res.yaRegistrado && res.alumno) {
        setEstado('ALERTA')
        reproducirSonidoFeedback('ALERTA')
        setResultado({
          alumno: res.alumno,
          estadoCuenta: res.estadoCuenta,
          motivo: res.motivo,
          esDuplicado: true,
        })
        iniciarAutoReset()
        return
      }

      setEstado('ERROR')
      reproducirSonidoFeedback('ERROR')
      setResultado({
        alumno: res.alumno,
        motivo: res.motivo || 'DNI no encontrado en la base de socios.',
      })
      iniciarAutoReset()
    },
    [dni, procesando, registrarAsistenciaPorDni, iniciarAutoReset, vaciarColaOutbox]
  )

  // Manejo de teclado físico y lectores de DNI / códigos de barra por hardware
  useEffect(() => {
    const manejarKeyDown = (e: KeyboardEvent) => {
      if (modalVinculacionAbierto) return
      if (estado !== 'IDLE') {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          reiniciarAIdle()
        }
        return
      }

      if (/^[0-9]$/.test(e.key)) {
        setDni((prev) => (prev.length < 9 ? prev + e.key : prev))
      } else if (e.key === 'Backspace') {
        setDni((prev) => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        manejarEnvio()
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        setDni('')
      }
    }

    window.addEventListener('keydown', manejarKeyDown)
    return () => window.removeEventListener('keydown', manejarKeyDown)
  }, [estado, manejarEnvio, reiniciarAIdle, modalVinculacionAbierto])

  const agregarDigito = (d: string) => {
    if (estado !== 'IDLE') return
    setDni((prev) => (prev.length < 9 ? prev + d : prev))
  }

  const borrarUltimo = () => {
    if (estado !== 'IDLE') return
    setDni((prev) => prev.slice(0, -1))
  }

  const limpiar = () => {
    if (estado !== 'IDLE') return
    setDni('')
  }

  const formatearDniVisual = (raw: string) => {
    if (!raw) return ''
    if (raw.length <= 8) {
      return raw.replace(/(\d{1,2})(\d{3})?(\d{3})?/, (match, p1, p2, p3) => {
        let res = p1
        if (p2) res += '.' + p2
        if (p3) res += '.' + p3
        return res
      })
    }
    return raw
  }

  return (
    <main className="h-dvh max-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden">
      {/* CABECERA KIOSCO */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 max-w-4xl w-full mx-auto shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-atlas-blanco.png"
            alt="ATLAS GYM"
            width={140}
            height={60}
            className="h-7 sm:h-9 w-auto object-contain drop-shadow"
            priority
          />
          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
            Terminal de asistencias
          </span>
        </div>

        {/* Reloj y Estado */}
        <div className="flex items-center gap-3 sm:gap-4 text-right">
          <div className="hidden sm:block">
            <p className="text-xl sm:text-2xl font-black tracking-tight font-mono text-white">{horaActual || '--:--:--'}</p>
            <p className="text-[11px] font-medium text-slate-400 capitalize">{fechaActual}</p>
          </div>
          {pendientesOutbox > 0 && (
            <button
              type="button"
              onClick={() => vaciarColaOutbox()}
              title="Reintentar sincronización de ingresos registrados sin Internet"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-amber-300 text-[11px] font-bold cursor-pointer"
            >
              <CloudUpload className="size-3.5 shrink-0" />
              <span>{pendientesOutbox} pend. sync</span>
            </button>
          )}
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 shadow-sm">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-300">Terminal activa</span>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <section className="flex-1 flex items-center justify-center py-2 w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto overflow-hidden">
        {/* ESTADO 1: EN ESPERA / DIGITANDO DNI */}
        {estado === 'IDLE' && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-2 sm:mb-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">Marcá tu ingreso</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Ingresá tu DNI para registrar tu asistencia hoy</p>
            </div>

            {/* VISOR DE DNI */}
            <div className="w-full rounded-2xl border-2 border-slate-800 bg-slate-900/90 py-2.5 sm:py-3.5 md:py-4 px-4 sm:px-6 text-center shadow-lg shadow-blue-950/20 mb-2.5 sm:mb-3.5 transition-all focus-within:border-blue-500">
              <p className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-400 mb-0.5">Documento nacional de identidad</p>
              <div className="h-10 sm:h-12 md:h-14 flex items-center justify-center">
                {dni ? (
                  <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-black tracking-widest text-blue-400 animate-in fade-in zoom-in-95 duration-150">
                    {formatearDniVisual(dni)}
                  </span>
                ) : (
                  <span className="text-xl sm:text-2xl md:text-3xl font-mono font-bold tracking-widest text-slate-600 animate-pulse">
                    _ _ . _ _ _ . _ _ _
                  </span>
                )}
              </div>
            </div>

            {/* TECLADO NUMÉRICO TÁCTIL */}
            <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-2.5 mb-2.5 sm:mb-3.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => agregarDigito(num)}
                  className="h-11 sm:h-13 md:h-15 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-blue-600 text-xl sm:text-2xl md:text-3xl font-black text-white border border-slate-800/90 shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}

              <Tooltip content="Limpiar DNI ingresado">
                <button
                  type="button"
                  onClick={limpiar}
                  className="w-full h-11 sm:h-13 md:h-15 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 active:bg-rose-950/80 text-[11px] sm:text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-800/80 shadow-sm transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw className="size-4 md:size-5 text-slate-400" />
                  <span>Limpiar</span>
                </button>
              </Tooltip>

              <button
                type="button"
                onClick={() => agregarDigito('0')}
                className="h-11 sm:h-13 md:h-15 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-blue-600 text-xl sm:text-2xl md:text-3xl font-black text-white border border-slate-800/90 shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              <Tooltip content="Borrar último dígito">
                <button
                  type="button"
                  onClick={borrarUltimo}
                  className="w-full h-11 sm:h-13 md:h-15 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 active:bg-amber-950/80 text-[11px] sm:text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-800/80 shadow-sm transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Delete className="size-4 md:size-5 text-slate-400" />
                  <span>Borrar</span>
                </button>
              </Tooltip>
            </div>

            {/* BOTÓN REGISTRAR */}
            <button
              type="button"
              disabled={dni.length < 6 || procesando}
              onClick={() => manejarEnvio()}
              className={`w-full h-11 sm:h-13 md:h-14 lg:h-15 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg ${
                dni.length >= 6 && !procesando
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-98'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Check className="size-5 md:size-6" />
              <span>{procesando ? 'Verificando...' : 'Registrar entrada'}</span>
            </button>
          </div>
        )}

        {/* ESTADO 2: ACCESO AUTORIZADO (AL DÍA) */}
        {estado === 'EXITO' && resultado?.alumno && (
          <div className="w-full rounded-2xl sm:rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-b from-emerald-950/70 to-slate-950 p-5 sm:p-7 text-center shadow-2xl shadow-emerald-950/40 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-3 shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="size-8 sm:size-10" />
            </div>

            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Acceso autorizado</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">¡Hola, {resultado.alumno.nombre}!</h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 mt-1">Cuota al día · ¡Que tengas un excelente entrenamiento!</p>

            <div className="my-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-emerald-500/20 p-3 sm:p-4 flex items-center justify-around text-left">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Plan contratado</p>
                <p className="text-sm sm:text-base font-black text-white">{resultado.alumno.plan}</p>
              </div>
              <div className="h-7 w-px bg-slate-800" />
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Estado de cuenta</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Al día
                </span>
              </div>
            </div>

            {/* Temporizador y botón siguiente */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="flex-1 text-left">
                <p className="text-[10px] font-medium text-slate-500">Cierre automático en {tiempoRestante}s...</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${(tiempoRestante / 3.5) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={reiniciarAIdle}
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                Siguiente socio
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: ALERTA (CUOTA PENDIENTE O VENCIDA / MOROSO) */}
        {estado === 'ALERTA' && resultado?.alumno && (
          <div className="w-full rounded-2xl sm:rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-amber-950/70 to-slate-950 p-5 sm:p-7 text-center shadow-2xl shadow-amber-950/40 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-lg shadow-amber-500/20">
              {resultado.esDuplicado ? <Check className="size-8 sm:size-10" /> : <AlertTriangle className="size-8 sm:size-10" />}
            </div>

            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              {resultado.esDuplicado
                ? 'Ingreso ya registrado'
                : resultado.estadoCuenta === 'PENDIENTE'
                ? 'Atención · Cuota pendiente'
                : 'Atención · Cuota vencida'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Hola, {resultado.alumno.nombre}</h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-200/90 mt-1 max-w-sm mx-auto">
              {resultado.motivo ||
                (resultado.estadoCuenta === 'PENDIENTE'
                  ? 'Tu cuota del mes se encuentra pendiente de acreditación. Por favor consultá en recepción para regularizarla.'
                  : 'Tu cuota se encuentra vencida. Por favor regularizá tu situación en recepción antes de entrenar.')}
            </p>

            <div className="my-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-amber-500/20 p-3 sm:p-4 flex items-center justify-around text-left">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Plan</p>
                <p className="text-sm sm:text-base font-black text-white">{resultado.alumno.plan}</p>
              </div>
              <div className="h-7 w-px bg-slate-800" />
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Condición</p>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                    resultado.esDuplicado && resultado.estadoCuenta === 'AL_DIA'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : resultado.estadoCuenta === 'PENDIENTE'
                      ? 'text-amber-300 bg-amber-500/15 border-amber-400/40'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  {resultado.esDuplicado
                    ? 'Sesión activa'
                    : resultado.estadoCuenta === 'PENDIENTE'
                    ? 'Pago pendiente'
                    : 'Renovar cuota'}
                </span>
              </div>
            </div>

            {/* Temporizador y botón siguiente */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="flex-1 text-left">
                <p className="text-[10px] font-medium text-slate-500">Cierre automático en {tiempoRestante}s...</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-amber-500 transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${(tiempoRestante / 3.5) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={reiniciarAIdle}
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                Siguiente socio
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 4: ERROR (DNI NO ENCONTRADO, INACTIVO O ERROR DE TERMINAL) */}
        {estado === 'ERROR' && (
          <div className="w-full rounded-2xl sm:rounded-3xl border-2 border-rose-500/70 bg-gradient-to-b from-rose-950/70 to-slate-950 p-5 sm:p-7 text-center shadow-2xl shadow-rose-950/40 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mb-3 shadow-lg shadow-rose-500/20">
              <XCircle className="size-8 sm:size-10" />
            </div>

            <p className="text-[11px] font-black uppercase tracking-widest text-rose-400">Acceso no registrado</p>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {resultado?.tituloError || 'No identificamos tu DNI'}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1 max-w-sm mx-auto">
              {resultado?.motivo || 'El DNI ingresado no figura en el sistema de socios o el plan está inactivo.'}
            </p>

            <div className="my-4 rounded-xl bg-slate-900/80 border border-rose-500/20 p-3 text-xs font-semibold text-slate-400">
              Acercate a recepción para verificar tus datos de inscripción.
            </div>

            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="flex-1 text-left">
                <p className="text-[10px] font-medium text-slate-500">Cierre automático en {tiempoRestante}s...</p>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-rose-500 transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${(tiempoRestante / 3.5) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={reiniciarAIdle}
                className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PIE DE PÁGINA KIOSCO */}
      <footer className="flex items-center justify-between border-t border-slate-900 pt-2 sm:pt-3 max-w-4xl w-full mx-auto text-[11px] sm:text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-blue-500" />
            <span>Terminal kiosco protegida por ATLAS GYM</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setClaveTerminalInput(getStoredTotemSecret())
              setMensajeVinculacion(null)
              setModalVinculacionAbierto(true)
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Configurar clave local de terminal (solo administradores)"
          >
            <KeyRound className="size-3" />
            <span>
              {padronSincronizadoCount > 0
                ? `Offline listo (${padronSincronizadoCount})`
                : 'Vincular terminal'}
            </span>
          </button>
        </div>
        <p className="text-[10px] sm:text-[11px] hidden sm:block">Soporte táctil y teclado físico habilitados</p>
      </footer>

      {modalVinculacionAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-black text-base mb-1">
              <KeyRound className="size-4 text-blue-400" />
              <span>Vincular tablet física del Tótem</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Guardá localmente en este dispositivo la clave <code className="text-slate-200">ATLAS_TOTEM_SECRET</code> para autorizar fichajes y descargar el padrón mínimo offline sin exponer el secreto en Internet.
            </p>
            <input
              type="password"
              value={claveTerminalInput}
              onChange={(e) => setClaveTerminalInput(e.target.value)}
              placeholder="Clave secreta de terminal..."
              className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500 mb-3"
            />
            {mensajeVinculacion && (
              <p className="text-xs text-emerald-400 font-semibold mb-3">{mensajeVinculacion}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalVinculacionAbierto(false)}
                className="h-9 px-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setStoredTotemSecret(claveTerminalInput)
                  const ok = await sincronizarPadronCache()
                  await vaciarColaOutbox()
                  setMensajeVinculacion(
                    ok
                      ? 'Terminal vinculada y padrón offline sincronizado.'
                      : 'Clave guardada localmente en este dispositivo.'
                  )
                  setTimeout(() => setModalVinculacionAbierto(false), 900)
                }}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer"
              >
                Guardar y sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
