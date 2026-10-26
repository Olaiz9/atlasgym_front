// app/totem/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppData } from '@/lib/store'
import { PIN_TERMINAL_TOTEM_DEFAULT } from '@/lib/constants'
import { normalizarDni, reproducirSonidoFeedback } from '@/lib/asistencia-utils'
import { apiCheckInTotem, isApiRuntimeEnabled } from '@/lib/api-client'
import { fechaLocalHoy } from '@/lib/date-utils'
import { Alumno, EstadoCuenta, RegistroAsistencia } from '@/lib/types'
import { CheckCircle2, AlertTriangle, XCircle, Delete, Check, RotateCcw, Clock, ShieldCheck, Lock, Unlock } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

type EstadoTotem = 'IDLE' | 'EXITO' | 'ALERTA' | 'ERROR'

interface ResultadoFeedback {
  alumno?: Alumno
  estadoCuenta?: EstadoCuenta
  motivo?: string
  esDuplicado?: boolean
}

export default function TotemPage() {
  const router = useRouter()
  const { registrarAsistenciaPorDni, usuarioActual } = useAppData()
  const [terminalAutorizada, setTerminalAutorizada] = useState<boolean>(false)
  const [pinInput, setPinInput] = useState('')
  const [errorPin, setErrorPin] = useState(false)
  const [mensajeErrorPin, setMensajeErrorPin] = useState('')
  const [mostrarConfirmDesvincular, setMostrarConfirmDesvincular] = useState(false)
  const [dni, setDni] = useState('')
  const [estado, setEstado] = useState<EstadoTotem>('IDLE')
  const [resultado, setResultado] = useState<ResultadoFeedback | null>(null)
  const [tiempoRestante, setTiempoRestante] = useState(3.5)
  const [horaActual, setHoraActual] = useState('')
  const [fechaActual, setFechaActual] = useState('')
  const [procesando, setProcesando] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar estado de autorización del dispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('atlas_totem_terminal_autorizada') === 'true'
      setTerminalAutorizada(auth)
      window.history.replaceState(null, '', '/totem')
    }
  }, [])

  const esAutorizada = terminalAutorizada || (usuarioActual && usuarioActual.rol === 'ADMIN')

  const manejarDigitoPin = useCallback((digito: string) => {
    setPinInput((prev) => {
      if (prev.length >= 4) return prev
      const nuevo = prev + digito
      setErrorPin(false)

      if (nuevo.length === 4) {
        const pinEsperado = process.env.NEXT_PUBLIC_TOTEM_PIN || PIN_TERMINAL_TOTEM_DEFAULT
        if (nuevo === pinEsperado) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('atlas_totem_terminal_autorizada', 'true')
          }
          setTerminalAutorizada(true)
          return ''
        } else {
          setErrorPin(true)
          setMensajeErrorPin('PIN incorrecto. Consulte al administrador.')
          setTimeout(() => {
            setPinInput('')
          }, 600)
        }
      }
      return nuevo
    })
  }, [])

  const desvincularTerminal = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('atlas_totem_terminal_autorizada')
    }
    setTerminalAutorizada(false)
    setMostrarConfirmDesvincular(false)
    setPinInput('')
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
      const res = registrarAsistenciaPorDni(valorDni)

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

      // Si el socio no estaba en la memoria local (ej: Tótem abierto sin sesión de Admin),
      // consultar directamente al endpoint público del Backend (/api/asistencias/totem)
      if (!res.alumno && isApiRuntimeEnabled()) {
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
                }),
              timestamp: Date.now(),
              estadoCuenta: estadoRemoto,
              planNombre: alumnoRemoto.plan,
              metodo: 'DNI_TOTEM',
            }

            try {
              const raw = localStorage.getItem('atlas_asistencias_v2')
              const prev: RegistroAsistencia[] = raw ? JSON.parse(raw) : []
              const actualizadas = [nuevaAsistencia, ...prev]
              localStorage.setItem('atlas_asistencias_v2', JSON.stringify(actualizadas))
              if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('atlas_asistencias_channel')
                bc.postMessage({ tipo: 'NUEVA_ASISTENCIA', asistencias: actualizadas })
                bc.close()
              }
            } catch {}

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

          if (backRes.motivo) {
            setEstado('ERROR')
            reproducirSonidoFeedback('ERROR')
            setResultado({
              alumno: alumnoRemoto,
              motivo: backRes.motivo,
            })
            iniciarAutoReset()
            return
          }
        } catch {}
      }

      setEstado('ERROR')
      reproducirSonidoFeedback('ERROR')
      setResultado({
        alumno: res.alumno,
        motivo: res.motivo || 'DNI no encontrado en la base de socios.',
      })
      iniciarAutoReset()
    },
    [dni, procesando, registrarAsistenciaPorDni, iniciarAutoReset]
  )

  // Manejo de teclado físico y lectores de DNI / códigos de barra por hardware
  useEffect(() => {
    if (!esAutorizada) {
      const manejarKeyPin = (e: KeyboardEvent) => {
        if (e.key >= '0' && e.key <= '9') {
          manejarDigitoPin(e.key)
        } else if (e.key === 'Backspace') {
          setPinInput((prev) => prev.slice(0, -1))
          setErrorPin(false)
        } else if (e.key === 'Escape') {
          setPinInput('')
          setErrorPin(false)
        }
      }
      window.addEventListener('keydown', manejarKeyPin)
      return () => window.removeEventListener('keydown', manejarKeyPin)
    }

    const manejarKeyDown = (e: KeyboardEvent) => {
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
  }, [estado, manejarEnvio, reiniciarAIdle, esAutorizada, manejarDigitoPin])

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

  if (!esAutorizada) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 select-none">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-blue-600/15 blur-[140px] z-0" />
        <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-slate-800 bg-slate-900/90 p-7 text-slate-100 shadow-2xl backdrop-blur-md">
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
            <h1 className="text-xl font-black text-white">Terminal de Recepción</h1>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-3 py-0.5 rounded-full border border-slate-700">
              Modo Kiosco Protegido
            </span>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Esta pantalla es exclusiva para las estaciones fijas de recepción. Para autorizar este dispositivo, ingresá el PIN de terminal.
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const lleno = pinInput.length > idx
              return (
                <div
                  key={idx}
                  className={`size-4 rounded-full border-2 transition-all duration-200 ${
                    lleno
                      ? 'border-blue-400 bg-blue-500 shadow-md shadow-blue-500/50 scale-110'
                      : errorPin
                      ? 'border-rose-500 bg-rose-500/20'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                />
              )
            })}
          </div>

          {errorPin && (
            <p className="mt-3 text-center text-xs font-bold text-rose-400 animate-in fade-in duration-150">
              {mensajeErrorPin || 'PIN de terminal incorrecto'}
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => manejarDigitoPin(n)}
                className="h-14 rounded-2xl border border-slate-800 bg-slate-800/60 text-xl font-bold text-white shadow-sm hover:bg-slate-700/80 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPinInput(''); setErrorPin(false); }}
              className="h-14 rounded-2xl border border-slate-800/80 bg-slate-900 text-xs font-black uppercase text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => manejarDigitoPin('0')}
              className="h-14 rounded-2xl border border-slate-800 bg-slate-800/60 text-xl font-bold text-white shadow-sm hover:bg-slate-700/80 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => { setPinInput((prev) => prev.slice(0, -1)); setErrorPin(false); }}
              className="h-14 rounded-2xl border border-slate-800/80 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
              aria-label="Retroceso"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 shadow-sm">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-300">Terminal activa</span>
            </div>
            <button
              type="button"
              onClick={() => setMostrarConfirmDesvincular(true)}
              title="Desvincular terminal"
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
            >
              <Lock className="size-4" />
            </button>
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
              <span>Registrar entrada</span>
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

        {/* ESTADO 4: ERROR (DNI NO ENCONTRADO O INACTIVO) */}
        {estado === 'ERROR' && (
          <div className="w-full rounded-2xl sm:rounded-3xl border-2 border-rose-500/70 bg-gradient-to-b from-rose-950/70 to-slate-950 p-5 sm:p-7 text-center shadow-2xl shadow-rose-950/40 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center size-14 sm:size-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mb-3 shadow-lg shadow-rose-500/20">
              <XCircle className="size-8 sm:size-10" />
            </div>

            <p className="text-[11px] font-black uppercase tracking-widest text-rose-400">Acceso no registrado</p>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">No identificamos tu DNI</h2>
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
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-blue-500" />
          <span>Terminal kiosco protegida por ATLAS GYM</span>
        </p>
        <p className="text-[10px] sm:text-[11px] hidden sm:block">Soporte táctil y teclado físico habilitados</p>
      </footer>
    </main>
  )
}
