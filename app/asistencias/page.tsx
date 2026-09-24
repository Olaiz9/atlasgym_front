// app/asistencias/page.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import {
  filtrarAsistenciasActivas,
  calcularDistribucionHoraria,
  calcularDistribucionSemanal,
  formatearTiempoEnSala,
  calcularMinutosTranscurridos,
  obtenerUltimos7Dias,
  DURACION_SESION_MINUTOS,
} from '@/lib/asistencia-utils'
import { fechaLocalHoy } from '@/lib/date-utils'
import {
  Users,
  Clock,
  Download,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  Timer,
  Activity,
  Flame,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export default function AsistenciasPage() {
  const { asistencias, eliminarAsistencia, getEstadoCuenta } = useAppData()
  const hoyFechaStr = fechaLocalHoy()
  const ultimos7Dias = useMemo(() => obtenerUltimos7Dias(hoyFechaStr), [hoyFechaStr])

  // Estados de filtros y controles
  const [diaGrafico, setDiaGrafico] = useState<string>(hoyFechaStr) // 'YYYY-MM-DD' o 'SEMANA_COMPLETA'
  const [busquedaSala, setBusquedaSala] = useState('')
  const [paginaSala, setPaginaSala] = useState(0)

  // Filtros de registro histórico
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState<string>('HOY') // 'HOY' | 'TODOS' | 'YYYY-MM-DD'
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<'TODOS' | 'AL_DIA' | 'VENCIDO'>('TODOS')
  const [busquedaHistorial, setBusquedaHistorial] = useState('')

  const [ahoraMs, setAhoraMs] = useState(Date.now())

  // Ticker en vivo cada 3 segundos para refrescar tiempos relativos y aforo
  useEffect(() => {
    const refrescar = () => setAhoraMs(Date.now())
    const intv = setInterval(refrescar, 3000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refrescar()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(intv)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Refrescar cálculo de sala inmediatamente cuando cambie el array de asistencias
  useEffect(() => {
    setAhoraMs(Date.now())
  }, [asistencias])

  // 1. Asistencias del día de hoy
  const asistenciasHoy = useMemo(() => {
    return asistencias.filter((a) => a.fecha === hoyFechaStr)
  }, [asistencias, hoyFechaStr])

  // 2. Socios activamente entrenando en sala (< 1h 40m = 100 min)
  const sociosEnSala = useMemo(() => {
    return filtrarAsistenciasActivas(asistenciasHoy, ahoraMs)
  }, [asistenciasHoy, ahoraMs])

  // Filtrado y paginación de socios en sala
  const sociosEnSalaFiltrados = useMemo(() => {
    const q = busquedaSala.trim().toLowerCase()
    if (!q) return sociosEnSala
    return sociosEnSala.filter(
      (s) =>
        s.alumnoNombre.toLowerCase().includes(q) ||
        s.alumnoDni.toLowerCase().includes(q) ||
        s.planNombre.toLowerCase().includes(q)
    )
  }, [sociosEnSala, busquedaSala])

  const totalPaginasSala = Math.max(1, Math.ceil(sociosEnSalaFiltrados.length / 3))
  const paginaSalaActual = Math.min(paginaSala, totalPaginasSala - 1)

  const sociosEnSalaVisibles = useMemo(() => {
    const inicio = paginaSalaActual * 3
    return sociosEnSalaFiltrados.slice(inicio, inicio + 3)
  }, [sociosEnSalaFiltrados, paginaSalaActual])

  // 3. Distribución horaria y semanal adaptable al día seleccionado
  const asistenciasParaGrafico = useMemo(() => {
    if (diaGrafico === 'SEMANA_COMPLETA') {
      const fechasSet = new Set(ultimos7Dias.map((d) => d.fecha))
      return asistencias.filter((a) => fechasSet.has(a.fecha))
    }
    return asistencias.filter((a) => a.fecha === diaGrafico)
  }, [asistencias, diaGrafico, ultimos7Dias])

  const distribucionHoraria = useMemo(() => {
    return calcularDistribucionHoraria(asistenciasParaGrafico)
  }, [asistenciasParaGrafico])

  const distribucionSemanal = useMemo(() => {
    return calcularDistribucionSemanal(asistencias)
  }, [asistencias])

  // Etiqueta legible del día del gráfico seleccionado
  const etiquetaDiaGrafico = useMemo(() => {
    if (diaGrafico === 'SEMANA_COMPLETA') return 'Últimos 7 días'
    const encontrado = ultimos7Dias.find((d) => d.fecha === diaGrafico)
    return encontrado ? encontrado.etiqueta : diaGrafico
  }, [diaGrafico, ultimos7Dias])

  // Hora pico detectada
  const horaPico = useMemo(() => {
    if (distribucionHoraria.length === 0) return 'Sin datos'
    const ordenada = [...distribucionHoraria].sort((a, b) => b.cantidad - a.cantidad)
    const top = ordenada[0]
    if (!top || top.cantidad === 0) return 'Sin ingresos'
    const fin = (top.hora + 1).toString().padStart(2, '0') + ':00'
    return `${top.etiqueta} - ${fin}`
  }, [distribucionHoraria])

  // Tasa de socios al día hoy
  const porcentajeAlDiaHoy = useMemo(() => {
    if (asistenciasHoy.length === 0) return 100
    const alDia = asistenciasHoy.filter((a) => (getEstadoCuenta ? getEstadoCuenta(a.alumnoId) === 'AL_DIA' : a.estadoCuenta === 'AL_DIA')).length
    return Math.round((alDia / asistenciasHoy.length) * 100)
  }, [asistenciasHoy, getEstadoCuenta])

  // Lista filtrada para la tabla de historial (con filtro de fecha y estado de cuota en vivo para hoy)
  const listaFiltrada = useMemo(() => {
    let base = asistencias
    if (filtroFechaHistorial === 'HOY') {
      base = base.filter((a) => a.fecha === hoyFechaStr)
    } else if (filtroFechaHistorial !== 'TODOS') {
      base = base.filter((a) => a.fecha === filtroFechaHistorial)
    }

    const obtenerEstado = (a: (typeof asistencias)[number]) =>
      a.fecha === hoyFechaStr && getEstadoCuenta ? getEstadoCuenta(a.alumnoId) : a.estadoCuenta

    if (filtroEstadoHistorial === 'AL_DIA') {
      base = base.filter((a) => obtenerEstado(a) === 'AL_DIA')
    } else if (filtroEstadoHistorial === 'VENCIDO') {
      base = base.filter((a) => obtenerEstado(a) !== 'AL_DIA')
    }

    const q = busquedaHistorial.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (a) =>
        a.alumnoNombre.toLowerCase().includes(q) ||
        a.alumnoDni.toLowerCase().includes(q) ||
        a.planNombre.toLowerCase().includes(q)
    )
  }, [asistencias, filtroFechaHistorial, filtroEstadoHistorial, busquedaHistorial, hoyFechaStr])

  const exportarCSV = () => {
    if (listaFiltrada.length === 0) return
    const headers = ['Fecha', 'Hora', 'Alumno', 'DNI', 'Plan', 'Estado Cuota', 'Metodo']
    const rows = listaFiltrada.map((a) => [
      a.fecha,
      a.hora,
      `"${a.alumnoNombre}"`,
      a.alumnoDni,
      `"${a.planNombre}"`,
      a.estadoCuenta,
      a.metodo,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `asistencias_atlasgym_${hoyFechaStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 text-slate-100">
      {/* ENCABEZADO */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            <Activity className="size-4" />
            Monitoreo en tiempo real
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Control de asistencias y aforo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registro instantáneo de ingresos por DNI, socios en sala y analítica de horarios pico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="Descargar historial de ingresos en archivo CSV compatible con Excel">
            <button
              type="button"
              onClick={exportarCSV}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
            >
              <Download className="size-4" />
              Exportar CSV
            </button>
          </Tooltip>

          <Tooltip content="Abrir pantalla táctil de autoservicio para el ingreso de socios">
            <Link
              href="/totem"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
            >
              <ExternalLink className="size-4" />
              Abrir terminal tótem
            </Link>
          </Tooltip>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* KPI 1: Aforo en Sala Ahora */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En sala ahora</span>
            <span className="flex size-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-white">{sociosEnSala.length}</span>
            <span className="text-xs font-semibold text-slate-400">socios activos</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Sesión activa menor a {DURACION_SESION_MINUTOS} min (1h 40m).
          </p>
        </div>

        {/* KPI 2: Total Ingresos Hoy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos hoy</span>
            <Users className="size-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-white">{asistenciasHoy.length}</span>
            <span className="text-xs font-semibold text-slate-400">check-ins</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Total acumulado durante la jornada.</p>
        </div>

        {/* KPI 3: Tasa al Día */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuotas al día</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-emerald-400">{porcentajeAlDiaHoy}%</span>
            <span className="text-xs font-semibold text-slate-400">de concurrencia</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Socios que ingresaron con cuota paga.</p>
        </div>

        {/* KPI 4: Horario Pico */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horario pico</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-400">{horaPico}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Franja con mayor concurrencia ({etiquetaDiaGrafico}).</p>
        </div>
      </section>

      {/* SECCIÓN ANALÍTICA: HORARIOS PICO Y DÍAS */}
      <section className="grid gap-6 lg:grid-cols-3 mb-10">
        {/* GRÁFICO DE HORAS PICO CON SELECTOR DE DÍAS ANTERIORES */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="size-4 text-blue-400" />
                Distribución por franja horaria (07:00 a 22:00 hs)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualizá las horas con mayor y menor afluencia para organizar profesores en sala.
              </p>
            </div>
            <span className="text-xs font-bold bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
              Pico: {horaPico}
            </span>
          </div>

          {/* Selector de días anteriores (hasta 1 semana atrás) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="size-3.5" /> Día:
            </span>
            {ultimos7Dias.map((opc) => {
              const seleccionado = diaGrafico === opc.fecha
              return (
                <button
                  key={opc.fecha}
                  type="button"
                  onClick={() => setDiaGrafico(opc.fecha)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    seleccionado
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title={opc.diaNombre}
                >
                  {opc.etiqueta}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setDiaGrafico('SEMANA_COMPLETA')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                diaGrafico === 'SEMANA_COMPLETA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              Semana completa
            </button>
          </div>

          {/* Gráfico de barras */}
          <div className="mt-6 flex items-end gap-1.5 sm:gap-2 h-44 border-b border-slate-800 pb-2 px-1">
            {distribucionHoraria.map((item) => {
              const esPico = item.cantidad > 0 && item.porcentaje >= 90
              return (
                <div key={item.hora} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip hover */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg pointer-events-none z-10 whitespace-nowrap border border-slate-700">
                    {item.etiqueta}: {item.cantidad} {item.cantidad === 1 ? 'persona' : 'personas'}
                  </div>

                  <div className="w-full flex items-end justify-center h-32">
                    <div
                      className={`w-full max-w-[20px] rounded-t-md transition-all duration-500 ease-out ${
                        esPico
                          ? 'bg-amber-500 shadow-md shadow-amber-500/20 group-hover:bg-amber-400'
                          : item.cantidad > 0
                          ? 'bg-blue-600 group-hover:bg-blue-500'
                          : 'bg-slate-800/40'
                      }`}
                      style={{ height: `${Math.max(item.porcentaje, item.cantidad > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300">
                    {item.hora}h
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1">
            <span>Apertura (07:00 hs)</span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> Hora pico destacada
            </span>
            <span>Cierre (22:00 hs)</span>
          </div>
        </div>

        {/* AFLUENCIA POR DÍA DE LA SEMANA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Calendar className="size-4 text-emerald-400" />
              Concurrencia por día
            </h2>
            <p className="text-xs text-slate-400 mb-5">Promedio semanal de lunes a sábado.</p>

            <div className="flex flex-col gap-3">
              {distribucionSemanal.map((d) => (
                <div key={d.diaIndex}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-300">{d.dia}</span>
                    <span className="font-mono text-slate-400">{d.cantidad} accesos</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700"
                      style={{ width: `${Math.max(d.porcentaje, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-950/30 border border-blue-500/20 p-3 text-[11px] text-blue-300 flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-blue-400" />
            <span>Datos calculados automáticamente a partir de los ingresos registrados en el tótem.</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN: SOCIOS ENTRENANDO EN SALA AHORA (CON CARRUSEL DE 3 Y BUSCADOR POR LUPA) */}
      <section className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Timer className="size-5 text-emerald-400" />
                Socios en sala ahora ({sociosEnSala.length})
              </h2>
              {sociosEnSalaFiltrados.length > 3 && (
                <span className="text-xs font-semibold text-slate-400 bg-slate-800/90 border border-slate-700 px-2 py-0.5 rounded-full">
                  Pág. {paginaSalaActual + 1} de {totalPaginasSala}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Alumnos con check-in activo. La sesión caduca automáticamente a los {DURACION_SESION_MINUTOS} minutos (1h 40m).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador por lupa dentro de los socios en sala */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={busquedaSala}
                onChange={(e) => {
                  setBusquedaSala(e.target.value)
                  setPaginaSala(0)
                }}
                placeholder="Buscar en sala..."
                aria-label="Buscar socio en sala"
                className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* Flechas de navegación para inspeccionar más de 3 socios */}
            {sociosEnSalaFiltrados.length > 3 && (
              <div className="flex items-center gap-1.5">
                <Tooltip content="Socios anteriores">
                  <button
                    type="button"
                    onClick={() => setPaginaSala((prev) => Math.max(0, prev - 1))}
                    disabled={paginaSalaActual === 0}
                    className={`size-9 rounded-xl border border-slate-800 flex items-center justify-center transition-all ${
                      paginaSalaActual === 0
                        ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Socios siguientes">
                  <button
                    type="button"
                    onClick={() => setPaginaSala((prev) => Math.min(totalPaginasSala - 1, prev + 1))}
                    disabled={paginaSalaActual >= totalPaginasSala - 1}
                    className={`size-9 rounded-xl border border-slate-800 flex items-center justify-center transition-all ${
                      paginaSalaActual >= totalPaginasSala - 1
                        ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {sociosEnSala.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            <Users className="size-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No hay alumnos entrenando en sala en este momento.</p>
            <p className="text-xs mt-1">Los socios aparecerán aquí cuando marquen su DNI en el tótem.</p>
          </div>
        ) : sociosEnSalaFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            <Search className="size-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No se encontraron socios en sala con ese criterio.</p>
            <button
              type="button"
              onClick={() => setBusquedaSala('')}
              className="text-xs text-blue-400 hover:underline mt-2 cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sociosEnSalaVisibles.map((s) => {
              const minutosTranscurridos = calcularMinutosTranscurridos(s.timestamp, ahoraMs)
              const minutosRestantes = Math.max(0, DURACION_SESION_MINUTOS - minutosTranscurridos)
              const esAlDia = (getEstadoCuenta ? getEstadoCuenta(s.alumnoId) : s.estadoCuenta) === 'AL_DIA'

              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 text-sm font-black border border-blue-500/20">
                      {s.alumnoNombre
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{s.alumnoNombre}</p>
                      <p className="text-xs text-slate-400 font-medium">DNI: {s.alumnoDni}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {s.planNombre}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            esAlDia
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {esAlDia ? 'Al día' : 'Vencida'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                      <Clock className="size-3" />
                      {formatearTiempoEnSala(s.timestamp, ahoraMs)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Resta: ~{minutosRestantes} min</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECCIÓN: HISTORIAL DE INGRESOS (FEED AUDITABLE CON FILTRO POR DÍA Y ESTADO DE CUOTA) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white">Registro histórico de accesos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoría completa filtrable por día (última semana) y estado de cuota.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap overflow-x-auto pb-1 max-w-full">
            {/* Filtro de Días (Hoy, Ayer, Últimos 7 días, Todos) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Calendar className="size-3.5" />
              </span>
              <select
                value={filtroFechaHistorial}
                onChange={(e) => setFiltroFechaHistorial(e.target.value)}
                aria-label="Filtrar por fecha"
                className="h-9 rounded-xl bg-slate-950 border border-slate-800 px-2.5 text-xs font-semibold text-slate-200 outline-none focus:border-blue-500 cursor-pointer shrink-0"
              >
                <option value="HOY">Hoy ({asistenciasHoy.length})</option>
                {ultimos7Dias.slice(1).map((d) => (
                  <option key={d.fecha} value={d.fecha}>
                    {d.etiqueta} - {d.diaNombre}
                  </option>
                ))}
                <option value="TODOS">Todos ({asistencias.length})</option>
              </select>
            </div>

            {/* Filtro de Estado de Cuota (Todos, Al día, Vencida) */}
            <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setFiltroEstadoHistorial('TODOS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filtroEstadoHistorial === 'TODOS'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstadoHistorial('AL_DIA')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filtroEstadoHistorial === 'AL_DIA'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Al día
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstadoHistorial('VENCIDO')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filtroEstadoHistorial === 'VENCIDO'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cuota vencida
              </button>
            </div>

            {/* Buscador por nombre o DNI */}
            <div className="relative w-44 sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar alumno o DNI..."
                aria-label="Buscar en historial"
                className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-3">Fecha y hora</th>
                <th className="py-3 px-3">Alumno</th>
                <th className="py-3 px-3">DNI</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Estado cuota</th>
                <th className="py-3 px-3">Tiempo en sala</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500 font-medium">
                    No se encontraron registros de asistencia para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((asist) => {
                  const activa = filtrarAsistenciasActivas([asist], ahoraMs).length > 0
                  return (
                    <tr key={asist.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-300">
                        {asist.fecha} · <span className="font-bold text-white">{asist.hora} hs</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-white">{asist.alumnoNombre}</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-400">
                        {asist.alumnoDni}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-300">
                        {asist.planNombre}
                      </td>
                      <td className="py-3.5 px-3">
                        {(() => {
                          const estadoFila = (asist.fecha === hoyFechaStr && getEstadoCuenta) ? getEstadoCuenta(asist.alumnoId) : asist.estadoCuenta
                          const esFilaAlDia = estadoFila === 'AL_DIA'
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                esFilaAlDia
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {esFilaAlDia ? 'Al día' : 'Vencida'}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        {activa ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {formatearTiempoEnSala(asist.timestamp, ahoraMs)}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            Sesión completada
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Tooltip content="Eliminar registro de asistencia" side="left">
                          <button
                            type="button"
                            onClick={() => eliminarAsistencia(asist.id)}
                            className="size-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
