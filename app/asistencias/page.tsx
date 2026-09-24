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
  DURACION_SESION_MINUTOS,
} from '@/lib/asistencia-utils'
import { fechaLocalHoy } from '@/lib/date-utils'
import {
  Users,
  Clock,
  TrendingUp,
  Download,
  Search,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Sparkles,
  Timer,
  Activity,
  Flame,
  Trash2,
} from 'lucide-react'

export default function AsistenciasPage() {
  const { asistencias, eliminarAsistencia } = useAppData()
  const [filtroFecha, setFiltroFecha] = useState<'HOY' | 'TODOS'>('HOY')
  const [busqueda, setBusqueda] = useState('')
  const [ahoraMs, setAhoraMs] = useState(Date.now())

  // Ticker en vivo cada 30 segundos para refrescar tiempos relativos en sala y aforo
  useEffect(() => {
    const intv = setInterval(() => {
      setAhoraMs(Date.now())
    }, 30000)
    return () => clearInterval(intv)
  }, [])

  const hoyFechaStr = fechaLocalHoy()

  // 1. Asistencias del día de hoy
  const asistenciasHoy = useMemo(() => {
    return asistencias.filter((a) => a.fecha === hoyFechaStr)
  }, [asistencias, hoyFechaStr])

  // 2. Socios activamente entrenando en sala (< 1h 40m = 100 min)
  const sociosEnSala = useMemo(() => {
    return filtrarAsistenciasActivas(asistenciasHoy, ahoraMs)
  }, [asistenciasHoy, ahoraMs])

  // 3. Distribución horaria y semanal
  const distribucionHoraria = useMemo(() => {
    return calcularDistribucionHoraria(asistencias)
  }, [asistencias])

  const distribucionSemanal = useMemo(() => {
    return calcularDistribucionSemanal(asistencias)
  }, [asistencias])

  // Hora pico detectada
  const horaPico = useMemo(() => {
    if (distribucionHoraria.length === 0) return 'Sin datos'
    const ordenada = [...distribucionHoraria].sort((a, b) => b.cantidad - a.cantidad)
    const top = ordenada[0]
    if (!top || top.cantidad === 0) return '18:00 - 20:00'
    const fin = (top.hora + 1).toString().padStart(2, '0') + ':00'
    return `${top.etiqueta} - ${fin}`
  }, [distribucionHoraria])

  // Tasa de socios al día hoy
  const porcentajeAlDiaHoy = useMemo(() => {
    if (asistenciasHoy.length === 0) return 100
    const alDia = asistenciasHoy.filter((a) => a.estadoCuenta === 'AL_DIA').length
    return Math.round((alDia / asistenciasHoy.length) * 100)
  }, [asistenciasHoy])

  // Lista filtrada para la tabla de historial
  const listaFiltrada = useMemo(() => {
    const base = filtroFecha === 'HOY' ? asistenciasHoy : asistencias
    const q = busqueda.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (a) =>
        a.alumnoNombre.toLowerCase().includes(q) ||
        a.alumnoDni.toLowerCase().includes(q) ||
        a.planNombre.toLowerCase().includes(q)
    )
  }, [filtroFecha, asistenciasHoy, asistencias, busqueda])

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
            Monitoreo en Tiempo Real
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Control de Asistencias & Aforo
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registro instantáneo de ingresos por DNI, socios en sala y analítica de horarios pico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportarCSV}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <Download className="size-4" />
            Exportar CSV
          </button>

          <Link
            href="/totem"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
          >
            <ExternalLink className="size-4" />
            Abrir Pantalla Tótem
          </Link>
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
            <span className="text-2xl font-black tracking-tight text-amber-400">{horaPico}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Franja horaria con mayor concurrencia.</p>
        </div>
      </section>

      {/* SECCIÓN ANALÍTICA: HORARIOS PICO Y DÍAS */}
      <section className="grid gap-6 lg:grid-cols-3 mb-10">
        {/* GRÁFICO DE HORAS PICO */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="size-4 text-blue-400" />
                Distribución por Franja Horaria (07:00 a 22:00 hs)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualizá las horas con mayor y menor afluencia para organizar profesores en sala.
              </p>
            </div>
            <span className="text-xs font-bold bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full">
              Pico: {horaPico}
            </span>
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
              Concurrencia por Día
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

      {/* SECCIÓN: SOCIOS ENTRENANDO EN SALA AHORA */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Timer className="size-5 text-emerald-400" />
              Socios en Sala Ahora ({sociosEnSala.length})
            </h2>
            <p className="text-xs text-slate-400">
              Alumnos con check-in activo. La sesión caduca automáticamente a los {DURACION_SESION_MINUTOS} minutos (1h 40m).
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Límite de sesión: 1h 40m
          </span>
        </div>

        {sociosEnSala.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            <Users className="size-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No hay alumnos entrenando en sala en este momento.</p>
            <p className="text-xs mt-1">Los socios aparecerán aquí cuando marquen su DNI en el tótem.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sociosEnSala.map((s) => {
              const minutosTranscurridos = calcularMinutosTranscurridos(s.timestamp, ahoraMs)
              const minutosRestantes = Math.max(0, DURACION_SESION_MINUTOS - minutosTranscurridos)
              const esAlDia = s.estadoCuenta === 'AL_DIA'

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
                          {esAlDia ? 'Al día ✓' : 'Vencida'}
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

      {/* SECCIÓN: HISTORIAL DE INGRESOS (FEED AUDITABLE) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white">Registro Histórico de Accesos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Auditoría completa de asistencias registradas.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtros fecha */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setFiltroFecha('HOY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filtroFecha === 'HOY' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoy ({asistenciasHoy.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroFecha('TODOS')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  filtroFecha === 'TODOS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({asistencias.length})
              </button>
            </div>

            {/* Buscador */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por alumno o DNI..."
                aria-label="Buscar por alumno o DNI"
                className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Alumno</th>
                <th className="py-3 px-3">DNI</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Estado Cuota</th>
                <th className="py-3 px-3">Tiempo en Sala</th>
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
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            asist.estadoCuenta === 'AL_DIA'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {asist.estadoCuenta === 'AL_DIA' ? 'Al día ✓' : 'Vencida'}
                        </span>
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
                        <button
                          type="button"
                          onClick={() => eliminarAsistencia(asist.id)}
                          title="Eliminar registro"
                          className="size-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
