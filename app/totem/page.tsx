// app/totem/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
// Dos llaves con trabajos distintos (decidido para la v1.0.0):
// - PIN de 4 dígitos (ATLAS_TOTEM_PIN, marcado "PIN" abajo): traba de pantalla para que un socio no
//   salga del modo tótem. Se valida en el navegador, así que NO es seguridad.
// - Clave X-Totem-Secret (ATLAS_TOTEM_SECRET): la que el servidor exige para fichar. Esta es la protección real.
import { PIN_TERMINAL_TOTEM_DEFAULT } from '@/lib/constants'
import {
  normalizarDni,
  recortarAsistenciasParaCacheLocal,
  reproducirSonidoFeedback,
} from '@/lib/asistencia-utils'
import {
  API_BASE_URL,
  apiCheckInTotem,
  apiSyncTotemOutbox,
  apiTotemLatido,
  esErrorDeRed,
  esFallbackOfflineDemoPermitido,
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
  verificarClaveTerminal,
} from '@/lib/totem-offline'
import { fechaLocalHoy } from '@/lib/date-utils'
import { INTERVALO_LATIDO_MS } from '@/lib/totem-estado'
import { useEscapeKey } from '@/lib/use-escape-key'
import { Alumno, EstadoCuenta, RegistroAsistencia } from '@/lib/types'
import {
  AlertTriangle,
  XCircle,
  Delete,
  Check,
  Clock,
  ShieldCheck,
  Lock,
  Unlock,
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
  const router = useRouter()
  const { registrarAsistenciaPorDni, usuarioActual, cerrarSesion } = useAppData()
  const [montado, setMontado] = useState(false)
  const [terminalAutorizada, setTerminalAutorizada] = useState(false)
  const [bloqueadaManualmente, setBloqueadaManualmente] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [errorPin, setErrorPin] = useState(false)
  const [mensajeErrorPin, setMensajeErrorPin] = useState('')
  const pinInputRef = useRef(pinInput)

  useEffect(() => {
    pinInputRef.current = pinInput
  }, [pinInput])

  const [mostrarConfirmDesvincular, setMostrarConfirmDesvincular] = useState(false)
  const [pinSalidaInput, setPinSalidaInput] = useState('')
  const [errorPinSalida, setErrorPinSalida] = useState(false)
  const [pinSalidaVerificado, setPinSalidaVerificado] = useState(false)
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
  useEscapeKey(() => setModalVinculacionAbierto(false), modalVinculacionAbierto)
  const [claveTerminalInput, setClaveTerminalInput] = useState('')
  const [mensajeVinculacion, setMensajeVinculacion] = useState<string | null>(null)
  const [errorVinculacion, setErrorVinculacion] = useState<string | null>(null)
  const [verificandoClave, setVerificandoClave] = useState(false)
  // Estado REAL de la terminal (antes decía "Terminal activa" siempre, aunque la clave fuera incorrecta)
  const [estadoTerminal, setEstadoTerminal] = useState<
    'VERIFICANDO' | 'VINCULADA' | 'CLAVE_INVALIDA' | 'SIN_CONEXION' | 'SIN_VINCULAR'
  >('VERIFICANDO')
  const sincronizandoOutboxRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputPinRef = useRef<HTMLInputElement | null>(null)
  const inputDniRef = useRef<HTMLInputElement | null>(null)

  const sincronizarPadronCache = useCallback(async () => {
    if (!isApiRuntimeEnabled()) return false
    const secreto = getStoredTotemSecret()
    if (!secreto) {
      setEstadoTerminal('SIN_VINCULAR')
      return false
    }
    const res = await verificarClaveTerminal(secreto, API_BASE_URL)
    if (res.estado === 'VALIDA') {
      guardarPadronCacheTotem(res.padron)
      setPadronSincronizadoCount(res.padron.length)
      setEstadoTerminal('VINCULADA')
      return true
    }
    setEstadoTerminal(res.estado === 'INVALIDA' ? 'CLAVE_INVALIDA' : 'SIN_CONEXION')
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
        // El servidor aceptó la cola con nuestra clave: hay conexión y la terminal es válida
        setEstadoTerminal('VINCULADA')
      }
    } catch (err: unknown) {
      // Sigue offline (reintenta solo) o el servidor rechazó la clave
      if (esErrorDeRed(err)) {
        setEstadoTerminal('SIN_CONEXION')
      } else if (err instanceof Error && (err.message.includes('no autorizado') || err.message.includes('HTTP 403'))) {
        setEstadoTerminal('CLAVE_INVALIDA')
      }
    } finally {
      sincronizandoOutboxRef.current = false
    }
  }, [])

  // Señal de vida: si deja de llegar en horario de apertura, los titulares ven "El tótem no tiene señal"
  const enviarLatido = useCallback(async () => {
    if (!isApiRuntimeEnabled() || !getStoredTotemSecret()) return
    try {
      await apiTotemLatido(leerOutboxTotem().length)
    } catch {
      // Sin conexión: justamente eso es lo que el servidor va a notar
    }
  }, [])

  useEffect(() => {
    enviarLatido()
    const intvLatido = setInterval(enviarLatido, INTERVALO_LATIDO_MS)
    return () => clearInterval(intvLatido)
  }, [enviarLatido])

  useEffect(() => {
    const cacheExistente = leerPadronCacheTotem()
    if (cacheExistente) setPadronSincronizadoCount(cacheExistente.length)
    setPendientesOutbox(leerOutboxTotem().length)
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

  // PIN: cargar estado de autorización de pantalla del dispositivo al montar en cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('atlas_totem_terminal_autorizada') === 'true'
      setTerminalAutorizada(auth)
    }
    setMontado(true)
  }, [])

  const esAutorizada = montado && !bloqueadaManualmente && (terminalAutorizada || (usuarioActual && usuarioActual.rol === 'ADMIN'))

  // Trampa de historial en modo kiosco: evita que el botón "Atrás" de la tablet Android
  // saque al socio de /totem y lo devuelva al panel administrativo.
  useEffect(() => {
    if (!montado || !esAutorizada || typeof window === 'undefined') return
    try {
      window.history.pushState({ totemKiosco: true }, '', '/totem')
    } catch {}
    const bloquearBotonAtras = () => {
      try {
        window.history.pushState({ totemKiosco: true }, '', '/totem')
      } catch {}
    }
    window.addEventListener('popstate', bloquearBotonAtras)
    return () => window.removeEventListener('popstate', bloquearBotonAtras)
  }, [montado, esAutorizada])

  // Auto-enfoque de inputs según pantalla activa (solo en dispositivos con puntero fino / PC,
  // para que en tablets/celulares no se abra solo el teclado virtual nativo de Android/iOS).
  useEffect(() => {
    if (!montado) return
    const esPantallaTactil =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    if (esPantallaTactil) return
    if (!esAutorizada) {
      inputPinRef.current?.focus()
    } else if (estado === 'IDLE') {
      inputDniRef.current?.focus()
    }
  }, [montado, esAutorizada, estado])

  const procesarNuevoPin = useCallback((nuevoPin: string) => {
    if (nuevoPin.length === 4) {
      const pinEsperado = process.env.NEXT_PUBLIC_TOTEM_PIN || PIN_TERMINAL_TOTEM_DEFAULT
      if (nuevoPin === pinEsperado) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('atlas_totem_terminal_autorizada', 'true')
        }
        if (usuarioActual) {
          cerrarSesion()
        }
        setBloqueadaManualmente(false)
        setTerminalAutorizada(true)
        setPinInput('')
        setErrorPin(false)
        setMensajeErrorPin('')
      } else {
        setErrorPin(true)
        setMensajeErrorPin('PIN incorrecto. Consulte al administrador.')
        setTimeout(() => {
          setPinInput('')
          setErrorPin(false)
          setMensajeErrorPin('')
        }, 900)
      }
    }
  }, [usuarioActual, cerrarSesion])

  const manejarDigitoPin = useCallback((digito: string) => {
    const actual = pinInputRef.current
    if (actual.length >= 4) return
    const nuevo = actual + digito
    setPinInput(nuevo)
    setErrorPin(false)
    setMensajeErrorPin('')
    procesarNuevoPin(nuevo)
  }, [procesarNuevoPin])

  const manejarBorrarPin = useCallback(() => {
    setPinInput((prev) => prev.slice(0, -1))
    setErrorPin(false)
    setMensajeErrorPin('')
  }, [])

  const manejarLimpiarPin = useCallback(() => {
    setPinInput('')
    setErrorPin(false)
    setMensajeErrorPin('')
  }, [])

  const volverAlInicio = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    } else {
      router.push('/')
    }
  }, [router])

  const desvincularTerminal = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('atlas_totem_terminal_autorizada')
    }
    setTerminalAutorizada(false)
    setBloqueadaManualmente(true)
    setMostrarConfirmDesvincular(false)
    setPinInput('')
    setDni('')
    setEstado('IDLE')
  }

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
              setEstadoTerminal('CLAVE_INVALIDA')
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
          setEstadoTerminal('SIN_CONEXION')
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
    if (!montado) return

    if (!esAutorizada) {
      const manejarKeyPin = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return
        if (e.target instanceof HTMLInputElement) return

        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault()
          manejarDigitoPin(e.key)
        } else if (e.key === 'Backspace') {
          e.preventDefault()
          manejarBorrarPin()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          manejarLimpiarPin()
        }
      }
      window.addEventListener('keydown', manejarKeyPin)
      return () => window.removeEventListener('keydown', manejarKeyPin)
    }

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (modalVinculacionAbierto) return
      if (e.target instanceof HTMLInputElement && e.key !== 'Enter' && e.key !== 'Escape') {
        return
      }

      if (estado !== 'IDLE') {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
          e.preventDefault()
          reiniciarAIdle()
        }
        return
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        setDni((prev) => (prev.length < 9 ? prev + e.key : prev))
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setDni((prev) => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        manejarEnvio()
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault()
        setDni('')
      }
    }

    window.addEventListener('keydown', manejarKeyDown)
    return () => window.removeEventListener('keydown', manejarKeyDown)
  }, [montado, estado, manejarEnvio, reiniciarAIdle, esAutorizada, manejarDigitoPin, manejarBorrarPin, manejarLimpiarPin, modalVinculacionAbierto])

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

  if (!montado) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
          <p className="text-xs text-slate-400 font-medium">Iniciando terminal ATLAS...</p>
        </div>
      </main>
    )
  }

  if (!esAutorizada) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 select-none">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-blue-600/15 blur-[140px] z-0" />
        <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-slate-800 bg-slate-900/95 p-7 text-slate-100 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo-atlas-blanco.png"
              alt="ATLAS GYM"
              width={160}
              height={70}
              className="h-10 w-auto object-contain mb-4 drop-shadow"
              priority
            />
            <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-4xl font-black text-white">Terminal de Recepción</h1>
            <span className="mt-1 text-xs font-bold bg-slate-800 text-slate-300 px-3 py-0.5 rounded-full border border-slate-700">
              Modo Kiosco Protegido
            </span>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Esta pantalla es exclusiva para las estaciones fijas de recepción. Para autorizar este dispositivo, ingresá el PIN de terminal.
            </p>
          </div>

          {/* Input oculto accesible para teclado físico y lectores */}
          <input
            ref={inputPinRef}
            type="password"
            inputMode="none"
            pattern="[0-9]*"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4)
              if (val.length > pinInputRef.current.length) {
                const nuevoChar = val[val.length - 1]
                manejarDigitoPin(nuevoChar)
              } else if (val.length < pinInputRef.current.length) {
                setPinInput(val)
                setErrorPin(false)
                setMensajeErrorPin('')
              }
            }}
            className="sr-only"
            aria-label="PIN de terminal"
          />

          {/* Casilleros visibles de 4 dígitos */}
          <div
            className="mt-6 flex justify-center gap-3"
          >
            {[0, 1, 2, 3].map((idx) => {
              const tieneValor = pinInput.length > idx
              return (
                <div
                  key={idx}
                  className={`flex size-14 items-center justify-center rounded-2xl border-2 text-2xl font-black transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 select-none ${
                    errorPin
                      ? 'border-rose-500 bg-rose-500/15 text-rose-400 scale-95'
                      : tieneValor
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/25 scale-105'
                      : 'border-slate-800 bg-slate-950/70 text-slate-500'
                  }`}
                >
                  {tieneValor ? '●' : ''}
                </div>
              )
            })}
          </div>

          {errorPin ? (
            <p className="mt-3 text-center text-xs font-bold text-rose-400 animate-in fade-in duration-150">
              {mensajeErrorPin || 'PIN de terminal incorrecto'}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-slate-500">
              Ingresá el código de autorización de 4 dígitos
            </p>
          )}

          {/* Teclado numérico en pantalla */}
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => manejarDigitoPin(n)}
                className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-2xl font-bold text-white shadow-sm hover:bg-slate-700 active:scale-95 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer select-none"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={manejarLimpiarPin}
              className="h-14 rounded-2xl border border-slate-800/80 bg-slate-950/80 text-xs font-black text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer select-none"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => manejarDigitoPin('0')}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/80 text-2xl font-bold text-white shadow-sm hover:bg-slate-700 active:scale-95 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={manejarBorrarPin}
              className="h-14 rounded-2xl border border-slate-800/80 bg-slate-950/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer select-none"
              aria-label="Retroceso"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={volverAlInicio}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-2 px-4 rounded-xl hover:bg-slate-800/60"
            >
              ← Volver al inicio de ATLAS
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="h-dvh max-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden">
      {/* CABECERA KIOSCO */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 max-w-6xl w-full mx-auto shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-atlas-blanco.png"
            alt="ATLAS GYM"
            width={140}
            height={60}
            className="h-7 sm:h-9 w-auto object-contain drop-shadow"
            priority
          />
          <span className="text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
            Terminal de asistencias
          </span>
        </div>

        {/* Reloj y Estado */}
        <div className="flex items-center gap-3 sm:gap-4 text-right">
          <div className="hidden sm:block">
            <p className="text-xl sm:text-2xl font-black tracking-tight font-mono text-white">{horaActual || '--:--:--'}</p>
            <p className="text-xs font-medium text-slate-400 capitalize">{fechaActual}</p>
          </div>
          <div className="flex items-center gap-2">
            {pendientesOutbox > 0 && (
              <button
                type="button"
                onClick={() => vaciarColaOutbox()}
                title="Reintentar sincronización de ingresos registrados sin Internet"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-amber-300 text-xs font-bold cursor-pointer"
              >
                <CloudUpload className="size-3.5 shrink-0" />
                <span>{pendientesOutbox} pend. sync</span>
              </button>
            )}
            {(() => {
              const badge = {
                VERIFICANDO: { texto: 'Verificando…', punto: 'bg-slate-400', ping: false, borde: 'border-slate-800' },
                VINCULADA: { texto: 'Terminal vinculada', punto: 'bg-emerald-500', ping: true, borde: 'border-slate-800' },
                SIN_CONEXION: { texto: 'Sin conexión · modo offline', punto: 'bg-amber-400', ping: false, borde: 'border-amber-500/40' },
                CLAVE_INVALIDA: { texto: 'Clave de terminal inválida', punto: 'bg-rose-500', ping: false, borde: 'border-rose-500/50' },
                SIN_VINCULAR: { texto: 'Terminal sin vincular', punto: 'bg-rose-500', ping: false, borde: 'border-rose-500/50' },
              }[estadoTerminal]
              return (
                <div
                  role="status"
                  className={`flex items-center gap-2 rounded-xl bg-slate-900/90 border ${badge.borde} px-3 py-1.5 shadow-sm`}
                >
                  <span className="relative flex size-2.5">
                    {badge.ping && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full size-2.5 ${badge.punto}`}></span>
                  </span>
                  <span className="text-xs font-bold text-slate-300">{badge.texto}</span>
                </div>
              )
            })()}
            {/* PIN: bloquear la pantalla del tótem */}
            <button
              type="button"
              onClick={() => {
                setPinSalidaInput('')
                setErrorPinSalida(false)
                setPinSalidaVerificado(false)
                setMostrarConfirmDesvincular(true)
              }}
              title="Bloquear pantalla del tótem"
              aria-label="Bloquear pantalla del tótem"
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
            >
              <Lock className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Sin señal: los ingresos se guardan en la tablet y se envían solos */}
      {estadoTerminal === 'SIN_CONEXION' && (
        <div
          role="status"
          className="max-w-6xl w-full mx-auto mt-3 rounded-xl bg-amber-300 text-amber-950 px-4 py-2.5 text-sm md:text-base font-bold flex items-center justify-center gap-2 shrink-0"
        >
          <CloudUpload className="size-5 shrink-0" />
          <span>
            Sin conexión: los ingresos se guardan y se envían solos al volver el Wi-Fi
            {pendientesOutbox > 0 ? ` (${pendientesOutbox} en espera)` : ''}
          </span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: dos mitades en tablet (mensaje a la izquierda, teclado a la derecha) */}
      <section className="flex-1 min-h-0 w-full max-w-6xl mx-auto py-4 md:py-8 flex flex-col md:flex-row gap-5 md:gap-12 overflow-hidden">
        <div className="md:flex-[1.15] min-w-0 flex flex-col justify-center gap-5 md:gap-7">
          {/* ESTADO 1: EN ESPERA / DIGITANDO DNI */}
          {estado === 'IDLE' && (
            <>
              <div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold uppercase leading-[0.9] text-[#FF7A8E]">
                  Marcá tu
                  <br />
                  ingreso
                </h1>
                <p className="text-base md:text-xl text-slate-300 mt-3 md:mt-5">Escribí tu DNI, sin puntos.</p>
              </div>

              {/* VISOR DE DNI CON ENFOQUE ACTIVO */}
              <div
                className="w-full h-20 md:h-26 rounded-2xl md:rounded-[20px] border-2 border-blue-600 bg-slate-900 px-5 md:px-7 flex items-center"
              >
                <input
                  ref={inputDniRef}
                  type="tel"
                  inputMode="none"
                  pattern="[0-9]*"
                  maxLength={9}
                  value={dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setDni(val)
                  }}
                  className="sr-only"
                  tabIndex={0}
                  aria-label="Ingresar DNI"
                />
                {dni ? (
                  <span className="font-display text-4xl md:text-6xl font-bold tracking-[0.08em] tabular-nums text-white">
                    {formatearDniVisual(dni)}
                  </span>
                ) : (
                  <span className="font-display text-4xl md:text-6xl font-bold tracking-[0.08em] text-slate-500">— — —</span>
                )}
              </div>
            </>
          )}

          {/* ESTADO 2: ACCESO AUTORIZADO (AL DÍA) */}
          {estado === 'EXITO' && resultado?.alumno && (
            <div
              role="status"
              className="md:flex-1 rounded-3xl md:rounded-[28px] border-2 border-emerald-400 bg-[#0F3B2B] p-6 md:p-10 flex flex-col justify-center gap-4 md:gap-5 animate-in zoom-in-95 duration-200"
            >
              <span className="flex size-16 md:size-22 items-center justify-center rounded-full bg-emerald-400 text-emerald-950">
                <Check className="size-9 md:size-12" strokeWidth={3} />
              </span>
              <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold uppercase leading-[0.9] text-white">
                ¡Buen entreno,
                <br />
                {resultado.alumno.nombre.split(' ')[0]}!
              </h2>
              <p className="text-base md:text-xl text-emerald-100">
                Cuota al día <span aria-hidden="true" className="text-slate-500">|</span> {resultado.alumno.plan}
              </p>
              <TemporizadorCierre tiempoRestante={tiempoRestante} color="bg-emerald-400" />
            </div>
          )}

          {/* ESTADO 3: ALERTA (CUOTA PENDIENTE O VENCIDA / MOROSO / YA REGISTRADO) */}
          {estado === 'ALERTA' && resultado?.alumno && (
            <div
              role="status"
              className="md:flex-1 rounded-3xl md:rounded-[28px] border-2 border-rose-300 bg-[#3A1714] p-6 md:p-10 flex flex-col justify-center gap-4 md:gap-5 animate-in zoom-in-95 duration-200"
            >
              <span className="flex size-16 md:size-22 items-center justify-center rounded-full bg-amber-300 text-amber-950">
                {resultado.esDuplicado ? <Check className="size-9 md:size-12" strokeWidth={3} /> : <AlertTriangle className="size-8 md:size-11" />}
              </span>
              <p className="text-sm md:text-base font-bold text-amber-300">
                {resultado.esDuplicado
                  ? 'Ingreso ya registrado'
                  : resultado.estadoCuenta === 'PENDIENTE'
                  ? 'Cuota pendiente'
                  : 'Cuota vencida'}
              </p>
              <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold uppercase leading-[0.9] text-white">
                Pasá, {resultado.alumno.nombre.split(' ')[0]}
              </h2>
              <p className="text-base md:text-xl text-rose-100">
                {resultado.motivo ||
                  (resultado.estadoCuenta === 'PENDIENTE'
                    ? 'Tu cuota del mes está pendiente. Acercate al mostrador cuando puedas.'
                    : 'Tu cuota está vencida. Acercate al mostrador cuando puedas.')}
              </p>
              <p className="text-sm md:text-base text-slate-300">Plan: {resultado.alumno.plan}</p>
              <TemporizadorCierre tiempoRestante={tiempoRestante} color="bg-amber-300" />
            </div>
          )}

          {/* ESTADO 4: ERROR (DNI NO ENCONTRADO, INACTIVO O ERROR DE TERMINAL) */}
          {estado === 'ERROR' && (
            <div
              role="status"
              className="md:flex-1 rounded-3xl md:rounded-[28px] border-2 border-slate-600 bg-slate-900 p-6 md:p-10 flex flex-col justify-center gap-4 md:gap-5 animate-in zoom-in-95 duration-200"
            >
              <span className="flex size-16 md:size-22 items-center justify-center rounded-full bg-slate-700 text-white">
                <XCircle className="size-9 md:size-12" />
              </span>
              <p className="text-sm md:text-base font-bold text-slate-300">Acceso no registrado</p>
              <h2 className="font-display text-4xl md:text-6xl font-extrabold uppercase leading-[0.95] text-white">
                {resultado?.tituloError || 'No identificamos tu DNI'}
              </h2>
              <p className="text-base md:text-xl text-slate-300">
                {resultado?.motivo || 'El DNI ingresado no figura en el sistema de socios o el plan está inactivo.'}
              </p>
              <p className="text-sm md:text-base text-slate-400">Acercate a recepción para verificar tus datos de inscripción.</p>
              <TemporizadorCierre tiempoRestante={tiempoRestante} color="bg-slate-400" />
            </div>
          )}
        </div>

        {/* TECLADO NUMÉRICO TÁCTIL + BOTÓN PRINCIPAL */}
        <div className={`md:flex-1 min-w-0 flex flex-col gap-3 md:gap-4 ${estado === 'IDLE' ? '' : 'hidden md:flex'}`}>
          <div className="flex-1 grid grid-cols-3 grid-rows-4 gap-2.5 md:gap-3.5" role="group" aria-label="Teclado numérico">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => agregarDigito(num)}
                disabled={estado !== 'IDLE'}
                className="min-h-14 rounded-2xl md:rounded-[20px] bg-slate-900 hover:bg-slate-800 active:bg-blue-600 font-display text-4xl md:text-5xl font-bold text-white transition-[background-color,transform] active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}

            <Tooltip content="Limpiar DNI ingresado">
              <button
                type="button"
                onClick={limpiar}
                disabled={estado !== 'IDLE'}
                className="w-full h-full min-h-14 rounded-2xl md:rounded-[20px] border-2 border-slate-700 bg-transparent hover:bg-slate-900 text-lg md:text-2xl font-semibold text-slate-300 transition-[background-color,transform] active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer"
              >
                Limpiar
              </button>
            </Tooltip>

            <button
              type="button"
              onClick={() => agregarDigito('0')}
              disabled={estado !== 'IDLE'}
              className="min-h-14 rounded-2xl md:rounded-[20px] bg-slate-900 hover:bg-slate-800 active:bg-blue-600 font-display text-4xl md:text-5xl font-bold text-white transition-[background-color,transform] active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            <Tooltip content="Borrar último dígito">
              <button
                type="button"
                onClick={borrarUltimo}
                disabled={estado !== 'IDLE'}
                aria-label="Borrar último número"
                className="w-full h-full min-h-14 rounded-2xl md:rounded-[20px] border-2 border-slate-700 bg-transparent hover:bg-slate-900 text-lg md:text-2xl font-semibold text-slate-300 transition-[background-color,transform] active:scale-95 disabled:opacity-40 flex items-center justify-center cursor-pointer"
              >
                Borrar
              </button>
            </Tooltip>
          </div>

          {estado === 'IDLE' ? (
            <button
              type="button"
              disabled={dni.length < 6 || procesando}
              onClick={() => manejarEnvio()}
              className="h-18 md:h-24 rounded-2xl md:rounded-[20px] bg-blue-600 hover:bg-blue-500 text-white font-display text-3xl md:text-4xl font-extrabold uppercase tracking-wide transition-[background-color,transform,opacity] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {procesando ? 'Verificando…' : 'Marcar ingreso'}
            </button>
          ) : (
            <button
              type="button"
              onClick={reiniciarAIdle}
              className="h-18 md:h-24 rounded-2xl md:rounded-[20px] bg-blue-600 hover:bg-blue-500 text-white font-display text-3xl md:text-4xl font-extrabold uppercase tracking-wide transition-[background-color,transform] active:scale-98 cursor-pointer"
            >
              {estado === 'ERROR' ? 'Reintentar' : 'Siguiente socio'}
            </button>
          )}
        </div>

        {/* En celular el teclado se oculta con el resultado: el botón para seguir queda abajo del mensaje */}
        {estado !== 'IDLE' && (
          <button
            type="button"
            onClick={reiniciarAIdle}
            className="md:hidden h-16 rounded-2xl bg-blue-600 text-white font-display text-2xl font-extrabold uppercase cursor-pointer"
          >
            {estado === 'ERROR' ? 'Reintentar' : 'Siguiente socio'}
          </button>
        )}
      </section>

      {/* PIE DE PÁGINA KIOSCO */}
      <footer className="flex items-center justify-between border-t border-slate-900 pt-2 sm:pt-3 max-w-6xl w-full mx-auto text-xs sm:text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-blue-400" />
            <span>Terminal kiosco protegida por ATLAS GYM</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setClaveTerminalInput('')
              setMensajeVinculacion(null)
              setErrorVinculacion(null)
              setModalVinculacionAbierto(true)
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
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
        <p className="text-xs sm:text-xs hidden sm:block">Soporte táctil y teclado físico habilitados</p>
      </footer>

      {/* MODAL CONFIRMACIÓN BLOQUEO / DESVINCULAR (PROTEGIDO POR PIN DE 4 DÍGITOS) */}
      {mostrarConfirmDesvincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                <Lock className="size-6" />
              </div>
              <h3 className="text-lg font-black text-white">Bloquear Terminal</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {pinSalidaVerificado
                  ? 'PIN verificado. Elegí si querés bloquear la pantalla o salir del modo tótem.'
                  : 'Ingresá el PIN de 4 dígitos de la terminal para bloquear la pantalla o salir del modo tótem.'}
              </p>
            </div>

            {!pinSalidaVerificado ? (
              <div className="mt-5">
                <div className="flex justify-center gap-2.5">
                  {[0, 1, 2, 3].map((idx) => {
                    const tieneValor = pinSalidaInput.length > idx
                    return (
                      <div
                        key={idx}
                        className={`flex size-12 items-center justify-center rounded-xl border-2 text-xl font-black select-none ${
                          errorPinSalida
                            ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                            : tieneValor
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-slate-800 bg-slate-950/70 text-slate-500'
                        }`}
                      >
                        {tieneValor ? '●' : ''}
                      </div>
                    )
                  })}
                </div>
                {errorPinSalida && (
                  <p className="mt-2 text-center text-xs font-bold text-rose-400">
                    PIN incorrecto.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (pinSalidaInput.length >= 4) return
                        const nuevo = pinSalidaInput + n
                        setPinSalidaInput(nuevo)
                        setErrorPinSalida(false)
                        if (nuevo.length === 4) {
                          const pinEsperado = process.env.NEXT_PUBLIC_TOTEM_PIN || PIN_TERMINAL_TOTEM_DEFAULT
                          if (nuevo === pinEsperado) {
                            setPinSalidaVerificado(true)
                          } else {
                            setErrorPinSalida(true)
                            setTimeout(() => {
                              setPinSalidaInput('')
                              setErrorPinSalida(false)
                            }, 700)
                          }
                        }
                      }}
                      className="h-12 rounded-xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-white hover:bg-slate-700 active:scale-95 cursor-pointer select-none"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPinSalidaInput('')
                      setErrorPinSalida(false)
                    }}
                    className="h-12 rounded-xl border border-slate-800/80 bg-slate-950/80 text-xs font-black text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer select-none"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pinSalidaInput.length >= 4) return
                      const nuevo = pinSalidaInput + '0'
                      setPinSalidaInput(nuevo)
                      setErrorPinSalida(false)
                      if (nuevo.length === 4) {
                        const pinEsperado = process.env.NEXT_PUBLIC_TOTEM_PIN || PIN_TERMINAL_TOTEM_DEFAULT
                        if (nuevo === pinEsperado) {
                          setPinSalidaVerificado(true)
                        } else {
                          setErrorPinSalida(true)
                          setTimeout(() => {
                            setPinSalidaInput('')
                            setErrorPinSalida(false)
                          }, 700)
                        }
                      }
                    }}
                    className="h-12 rounded-xl border border-slate-800 bg-slate-800/80 text-xl font-bold text-white hover:bg-slate-700 active:scale-95 cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinSalidaInput((prev) => prev.slice(0, -1))
                      setErrorPinSalida(false)
                    }}
                    aria-label="Retroceso PIN salida"
                    className="h-12 rounded-xl border border-slate-800/80 bg-slate-950/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer select-none"
                  >
                    <Delete className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmDesvincular(false)}
                  className="mt-4 w-full h-10 rounded-xl bg-transparent hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar y seguir en tótem
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={desvincularTerminal}
                  className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-xs font-black text-white shadow-lg shadow-rose-600/20 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer"
                >
                  Bloquear terminal ahora
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('atlas_totem_terminal_autorizada')
                    }
                    setTerminalAutorizada(false)
                    setMostrarConfirmDesvincular(false)
                    router.push('/login')
                  }}
                  className="w-full h-11 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer"
                >
                  Salir del modo tótem e ir al login
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmDesvincular(false)}
                  className="w-full h-10 rounded-xl bg-transparent hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer"
                >
                  Cancelar y seguir en tótem
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalVinculacionAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-white font-black text-base mb-1">
              <KeyRound className="size-4 text-blue-400" />
              <span>Vincular tablet física del Tótem</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Solo para los titulares: ingresá la clave <code className="text-slate-200">ATLAS_TOTEM_SECRET</code>. Se verifica con el servidor antes de guardarla; una clave incorrecta nunca reemplaza a la que ya funciona.
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
            {errorVinculacion && (
              <p role="alert" className="text-xs text-rose-400 font-semibold mb-3">{errorVinculacion}</p>
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
                disabled={verificandoClave || !claveTerminalInput.trim()}
                onClick={async () => {
                  setMensajeVinculacion(null)
                  setErrorVinculacion(null)
                  setVerificandoClave(true)
                  const res = await verificarClaveTerminal(claveTerminalInput, API_BASE_URL)
                  setVerificandoClave(false)
                  if (res.estado === 'INVALIDA') {
                    setErrorVinculacion('Clave incorrecta. No se modificó la configuración del tótem.')
                    return
                  }
                  if (res.estado === 'SIN_CONEXION') {
                    setErrorVinculacion(
                      'Sin conexión con el servidor: no se puede verificar la clave. Probá de nuevo cuando vuelva Internet.'
                    )
                    return
                  }
                  setStoredTotemSecret(claveTerminalInput)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('atlas_totem_terminal_autorizada', 'true')
                  }
                  setTerminalAutorizada(true)
                  if (usuarioActual) {
                    cerrarSesion()
                  }
                  setClaveTerminalInput('')
                  guardarPadronCacheTotem(res.padron)
                  setPadronSincronizadoCount(res.padron.length)
                  setEstadoTerminal('VINCULADA')
                  await vaciarColaOutbox()
                  setMensajeVinculacion('Terminal vinculada y padrón offline sincronizado.')
                  setTimeout(() => setModalVinculacionAbierto(false), 900)
                }}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verificandoClave ? 'Verificando…' : 'Verificar y vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function TemporizadorCierre({ tiempoRestante, color }: { tiempoRestante: number; color: string }) {
  return (
    <div>
      <p className="text-sm text-slate-400">Cierre automático en {tiempoRestante}s...</p>
      <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mt-1.5">
        <div
          className={`h-full ${color} transition-[width] duration-100 ease-linear rounded-full`}
          style={{ width: `${(tiempoRestante / 3.5) * 100}%` }}
        />
      </div>
    </div>
  )
}
