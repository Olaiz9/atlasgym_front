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
  calcularCupoSemanalAsistencia,
  CupoSemanalAsistencia,
  DURACION_SESION_MINUTOS,
} from '@/lib/asistencia-utils'
import { fechaLocalHoy, formatFechaAR, restarDiasFechaLocal } from '@/lib/date-utils'
import {
  Clock,
  Download,
  Search,
  ExternalLink,
  Calendar,
  Sparkles,
  Trash2,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { EstadoCuentaEtiqueta } from '@/components/estado-cuenta-etiqueta'
import { RegistroAsistencia, saldosDeSeniaPorAlumno } from '@/lib/types'
import { coincideBusqueda } from '@/lib/utils'

type VistaSala = 'SALA' | 'EXCEDIDOS' | 'HISTORIAL'

function Separador() {
  return <span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>
}

export default function AsistenciasPage() {
  const {
    asistencias,
    planes,
    alumnos,
    eliminarAsistencia,
    getEstadoCuenta,
    refrescarAsistencias,
    cargarHistorialAsistenciasRango,
    pagos,
  } = useAppData()
  const hoyFechaStr = fechaLocalHoy()
  const ultimos7Dias = useMemo(() => obtenerUltimos7Dias(hoyFechaStr), [hoyFechaStr])

  // Estados de filtros y controles
  const [diaGrafico, setDiaGrafico] = useState<string>(hoyFechaStr) // 'YYYY-MM-DD' o 'SEMANA_COMPLETA'
  const [busquedaSala, setBusquedaSala] = useState('')
  const [vista, setVista] = useState<VistaSala>('SALA')

  // Filtros de registro histórico
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState<string>('HOY') // 'HOY' | 'TODOS' | 'RANGO_PERSONALIZADO' | 'YYYY-MM-DD'
  const [rangoDesde, setRangoDesde] = useState<string>(() => restarDiasFechaLocal(hoyFechaStr, 30))
  const [rangoHasta, setRangoHasta] = useState<string>(hoyFechaStr)
  const [consultandoRango, setConsultandoRango] = useState(false)
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<
    'TODOS' | 'AL_DIA' | 'PENDIENTE' | 'VENCIDO' | 'EXCEDIDOS'
  >('TODOS')
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  const [asistenciaAEliminar, setAsistenciaAEliminar] = useState<RegistroAsistencia | null>(null)

  // Sincronización multi-dispositivo en vivo (tablet Tótem -> celulares/PC de los dueños cada 5s)
  useEffect(() => {
    if (!refrescarAsistencias) return
    refrescarAsistencias()

    const poll = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refrescarAsistencias()
      }
    }, 5000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refrescarAsistencias()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refrescarAsistencias])

  // Mapa precalculado de cupo de días semanales por registro de asistencia
  const cupoPorAsistenciaId = useMemo(() => {
    const mapa = new Map<string, CupoSemanalAsistencia>()
    for (const asist of asistencias) {
      mapa.set(asist.id, calcularCupoSemanalAsistencia(asist, asistencias, planes, alumnos))
    }
    return mapa
  }, [asistencias, planes, alumnos])

  const saldosSenia = useMemo(() => saldosDeSeniaPorAlumno(pagos), [pagos])

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

  // Socios que hoy asistieron superando los días semanales de su plan (deduplicados por alumnoId)
  const alertasExcesoSemanalHoy = useMemo(() => {
    const vistos = new Set<string>()
    const resultado: { asistencia: RegistroAsistencia; cupo: CupoSemanalAsistencia }[] = []
    for (const a of asistenciasHoy) {
      const claveSocio = a.alumnoId || a.alumnoDni || a.id
      if (vistos.has(claveSocio)) continue
      const cupo = cupoPorAsistenciaId.get(a.id)
      if (cupo?.excedeLimiteSemanal) {
        vistos.add(claveSocio)
        resultado.push({ asistencia: a, cupo })
      }
    }
    return resultado
  }, [asistenciasHoy, cupoPorAsistenciaId])

  // 2. Socios activamente entrenando en sala (< 1h 40m = 100 min)
  const sociosEnSala = useMemo(() => {
    return filtrarAsistenciasActivas(asistenciasHoy, ahoraMs)
  }, [asistenciasHoy, ahoraMs])

  // Filtrado y paginación de socios en sala
  const sociosEnSalaFiltrados = useMemo(() => {
    return sociosEnSala.filter((s) =>
      coincideBusqueda(busquedaSala, s.alumnoNombre, s.alumnoDni, s.planNombre)
    )
  }, [sociosEnSala, busquedaSala])


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

  const picoCorto = useMemo(() => {
    const top = [...distribucionHoraria].sort((a, b) => b.cantidad - a.cantidad)[0]
    return top && top.cantidad > 0 ? `${top.hora} a ${top.hora + 1} hs` : 'Sin datos'
  }, [distribucionHoraria])

  // Tasa de socios al día hoy
  const porcentajeAlDiaHoy = useMemo(() => {
    if (asistenciasHoy.length === 0) return 100
    const alDia = asistenciasHoy.filter((a) => (getEstadoCuenta ? getEstadoCuenta(a.alumnoId) === 'AL_DIA' : a.estadoCuenta === 'AL_DIA')).length
    return Math.round((alDia / asistenciasHoy.length) * 100)
  }, [asistenciasHoy, getEstadoCuenta])

  // Lista filtrada para la tabla de historial (con filtro de fecha, estado de cuota y exceso de plan)
  const listaFiltrada = useMemo(() => {
    let base = asistencias
    if (filtroFechaHistorial === 'HOY') {
      base = base.filter((a) => a.fecha === hoyFechaStr)
    } else if (filtroFechaHistorial === 'RANGO_PERSONALIZADO') {
      base = base.filter((a) => a.fecha >= rangoDesde && a.fecha <= rangoHasta)
    } else if (filtroFechaHistorial !== 'TODOS') {
      base = base.filter((a) => a.fecha === filtroFechaHistorial)
    }

    const obtenerEstado = (a: (typeof asistencias)[number]) =>
      a.fecha === hoyFechaStr && getEstadoCuenta ? getEstadoCuenta(a.alumnoId) : a.estadoCuenta

    if (filtroEstadoHistorial === 'AL_DIA') {
      base = base.filter((a) => obtenerEstado(a) === 'AL_DIA')
    } else if (filtroEstadoHistorial === 'PENDIENTE') {
      base = base.filter((a) => obtenerEstado(a) === 'PENDIENTE')
    } else if (filtroEstadoHistorial === 'VENCIDO') {
      base = base.filter((a) => {
        const est = obtenerEstado(a)
        return est !== 'AL_DIA' && est !== 'PENDIENTE'
      })
    } else if (filtroEstadoHistorial === 'EXCEDIDOS') {
      base = base.filter((a) => cupoPorAsistenciaId.get(a.id)?.excedeLimiteSemanal === true)
    }

    return base.filter((a) =>
      coincideBusqueda(busquedaHistorial, a.alumnoNombre, a.alumnoDni, a.planNombre)
    )
  }, [
    asistencias,
    filtroFechaHistorial,
    rangoDesde,
    rangoHasta,
    filtroEstadoHistorial,
    busquedaHistorial,
    hoyFechaStr,
    getEstadoCuenta,
    cupoPorAsistenciaId,
  ])

  const exportarCSV = () => {
    if (listaFiltrada.length === 0) return
    const headers = [
      'Fecha',
      'Hora',
      'Alumno',
      'DNI',
      'Plan',
      'Cupo Semanal',
      'Excede Plan',
      'Estado Cuota',
      'Metodo',
    ]
    const rows = listaFiltrada.map((a) => {
      const cupo = cupoPorAsistenciaId.get(a.id)
      const etiquetaCupo =
        cupo?.limiteDiasSemana != null
          ? `${cupo.asistenciasSemana}/${cupo.limiteDiasSemana}`
          : `Libre (${cupo?.asistenciasSemana ?? 1})`
      return [
        a.fecha,
        a.hora,
        `"${a.alumnoNombre}"`,
        a.alumnoDni,
        `"${a.planNombre}"`,
        `"${etiquetaCupo}"`,
        cupo?.excedeLimiteSemanal ? 'SI' : 'NO',
        a.estadoCuenta,
        a.metodo,
      ]
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `asistencias_atlasgym_${hoyFechaStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderFila = (a: RegistroAsistencia, historial: boolean) => {
    const cupo = cupoPorAsistenciaId.get(a.id)
    const estado = a.fecha === hoyFechaStr && getEstadoCuenta ? getEstadoCuenta(a.alumnoId) : a.estadoCuenta
    const diasExtra =
      cupo?.excedeLimiteSemanal && cupo.limiteDiasSemana != null ? cupo.asistenciasSemana - cupo.limiteDiasSemana : 0
    const activa = filtrarAsistenciasActivas([a], ahoraMs).length > 0
    const minutosRestantes = Math.max(0, DURACION_SESION_MINUTOS - calcularMinutosTranscurridos(a.timestamp, ahoraMs))
    const etiquetaEstado = (
      <EstadoCuentaEtiqueta estado={estado} conSenia={a.fecha === hoyFechaStr && saldosSenia.has(a.alumnoId)} />
    )

    return (
      <li key={a.id} className="flex items-center gap-3 border-b border-slate-800 py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{a.alumnoNombre}</p>
          <p className="mt-0.5 text-[13px] text-slate-400">
            {historial && (
              <>
                {formatFechaAR(a.fecha)}
                <Separador />
              </>
            )}
            Entró {a.hora.slice(0, 5)}
            <Separador />
            {cupo?.limiteDiasSemana != null
              ? `${cupo.asistenciasSemana} de ${cupo.limiteDiasSemana} días`
              : 'plan libre'}
            <span className="hidden md:inline">
              <Separador />
              {a.planNombre}
              <Separador />
              DNI {a.alumnoDni}
              <Separador />
              {activa
                ? `${formatearTiempoEnSala(a.timestamp, ahoraMs)}, resta ~${minutosRestantes} min`
                : 'Sesión completada'}
            </span>
          </p>
        </div>
        {diasExtra > 0 ? (
          <>
            <span className="hidden md:inline-flex">{etiquetaEstado}</span>
            <span
              title={`El plan habilita ${cupo?.limiteDiasSemana} días por semana y ya registró ${cupo?.asistenciasSemana} días distintos`}
              className={`inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold ${
                diasExtra === 1 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              <Plus className="size-3 shrink-0" aria-hidden="true" />
              {diasExtra} {diasExtra === 1 ? 'día extra' : 'días extra'}
            </span>
          </>
        ) : (
          etiquetaEstado
        )}
        {historial && (
          <button
            type="button"
            onClick={() => setAsistenciaAEliminar(a)}
            aria-label={`Eliminar asistencia de ${a.alumnoNombre}`}
            title="Eliminar registro de asistencia"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-900 hover:text-rose-400"
          >
            <Trash2 className="size-[18px]" />
          </button>
        )}
      </li>
    )
  }

  const pestanas: { valor: VistaSala; label: string; cantidad?: number }[] = [
    { valor: 'SALA', label: 'En sala', cantidad: sociosEnSala.length },
    { valor: 'EXCEDIDOS', label: 'Pasados de plan', cantidad: alertasExcesoSemanalHoy.length },
    { valor: 'HISTORIAL', label: 'Historial' },
  ]

  const filtrosEstado: { valor: typeof filtroEstadoHistorial; label: string }[] = [
    { valor: 'TODOS', label: 'Todos' },
    { valor: 'AL_DIA', label: 'Al día' },
    { valor: 'PENDIENTE', label: 'Pendiente' },
    { valor: 'VENCIDO', label: 'Vencido' },
    { valor: 'EXCEDIDOS', label: 'Excedidos' },
  ]

  const claseBuscador =
    'flex h-12 items-center gap-2 rounded-xl border border-[#2A4677] bg-[#162A50] px-3.5 focus-within:border-blue-400 md:h-11 md:w-72'
  const claseInputBuscador =
    'min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500 md:text-sm'
  const claseControl = 'h-11 rounded-xl border border-[#2A4677] bg-[#162A50] px-3 text-sm text-slate-100 outline-none focus:border-blue-400'

  const acciones = (
    <>
      <button
        type="button"
        onClick={exportarCSV}
        title="Descargar historial de ingresos en archivo CSV compatible con Excel"
        className="flex h-11 items-center gap-2 rounded-xl border border-[#2A4677] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-900"
      >
        <Download className="size-4" />
        Exportar CSV
      </button>
      <Link
        href="/totem"
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir pantalla táctil de autoservicio para el ingreso de socios"
        className="flex h-11 items-center gap-2 rounded-xl border border-[#2A4677] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-900"
      >
        <ExternalLink className="size-4" />
        Abrir tótem
      </Link>
    </>
  )

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 pb-28 pt-5 text-slate-100 md:gap-8 md:px-14 md:pb-16 md:pt-12">
      <header className="flex flex-col gap-3.5 md:gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">Sala</h1>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
              <span className="size-2 rounded-full bg-[#5BE3A0]" aria-hidden="true" />
              En vivo
              <Separador />
              hoy
            </span>
            <div className="hidden items-center gap-2 md:flex">{acciones}</div>
          </div>
        </div>

        <section aria-label="Resumen de la sala" className="flex items-center gap-4 rounded-2xl bg-[#162A50] p-4 md:max-w-2xl">
          <div className="flex-1">
            <p className="text-[13px] text-slate-400">Entrenando ahora</p>
            <p className="mt-0.5 font-display text-5xl font-bold leading-none text-white">{sociosEnSala.length}</p>
          </div>
          <dl className="flex flex-[1.3] flex-col gap-2 text-[13px]">
            <div className="flex justify-between gap-2"><dt className="text-slate-400">Ingresos hoy</dt><dd className="font-bold">{asistenciasHoy.length}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-400">Con cuota paga</dt><dd className="font-bold">{porcentajeAlDiaHoy} %</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-400">Pico del día</dt><dd className="font-bold">{picoCorto}</dd></div>
          </dl>
        </section>

        <div role="group" aria-label="Filtrar" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
          {pestanas.map((p) => {
            const activa = vista === p.valor
            return (
              <button
                key={p.valor}
                type="button"
                aria-pressed={activa}
                onClick={() => setVista(p.valor)}
                className={`flex h-11 shrink-0 items-center rounded-full px-3.5 text-sm transition-colors ${
                  activa ? 'bg-slate-100 font-bold text-[#0E1B36]' : 'border border-[#2A4677] font-semibold text-slate-300 hover:bg-slate-900'
                }`}
              >
                {p.label}
                {p.cantidad !== undefined && (
                  <span className="ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-600/30 px-1.5 text-xs font-bold">
                    {p.cantidad}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {vista === 'SALA' && (
        <section aria-label="Socios en sala" className="flex flex-col gap-2">
          <label className={claseBuscador}>
            <Search className="size-[18px] shrink-0 text-slate-500" />
            <input
              type="search"
              value={busquedaSala}
              onChange={(e) => setBusquedaSala(e.target.value)}
              placeholder="Buscar en sala..."
              aria-label="Buscar socio en sala"
              className={claseInputBuscador}
            />
          </label>
          {sociosEnSalaFiltrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {sociosEnSala.length === 0
                ? 'No hay alumnos entrenando en sala. Aparecen acá cuando marcan su DNI en el tótem.'
                : 'No se encontraron socios en sala con ese criterio.'}
            </p>
          ) : (
            <ul>{sociosEnSalaFiltrados.map((s) => renderFila(s, false))}</ul>
          )}
          <p className="text-[13px] text-slate-500">
            La sesión termina sola a los {DURACION_SESION_MINUTOS} minutos (1h 40m).
          </p>
        </section>
      )}

      {vista === 'EXCEDIDOS' && (
        <section aria-label="Avisos de cupo semanal superado">
          {alertasExcesoSemanalHoy.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Hoy nadie superó los días de su plan.</p>
          ) : (
            <ul>{alertasExcesoSemanalHoy.map(({ asistencia }) => renderFila(asistencia, false))}</ul>
          )}
        </section>
      )}

      {vista === 'HISTORIAL' && (
        <section aria-label="Historial de ingresos" className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <label className={claseBuscador}>
              <Search className="size-[18px] shrink-0 text-slate-500" />
              <input
                type="search"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar alumno o DNI..."
                aria-label="Buscar en historial"
                className={claseInputBuscador}
              />
            </label>
            <select
              value={filtroFechaHistorial}
              onChange={(e) => setFiltroFechaHistorial(e.target.value)}
              aria-label="Filtrar por fecha"
              className={claseControl}
            >
              <option value="HOY">Hoy ({asistenciasHoy.length})</option>
              {ultimos7Dias.slice(1).map((d) => (
                <option key={d.fecha} value={d.fecha}>{d.etiqueta} - {d.diaNombre}</option>
              ))}
              <option value="TODOS">Últimos cargados ({asistencias.length})</option>
              <option value="RANGO_PERSONALIZADO">Consultar rango histórico...</option>
            </select>
            {filtroFechaHistorial === 'RANGO_PERSONALIZADO' && (
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={rangoDesde} onChange={(e) => setRangoDesde(e.target.value)} aria-label="Fecha desde" className={claseControl} />
                <span className="text-sm text-slate-500">a</span>
                <input type="date" value={rangoHasta} onChange={(e) => setRangoHasta(e.target.value)} aria-label="Fecha hasta" className={claseControl} />
                <button
                  type="button"
                  disabled={consultandoRango}
                  onClick={async () => {
                    if (!cargarHistorialAsistenciasRango) return
                    setConsultandoRango(true)
                    try {
                      await cargarHistorialAsistenciasRango(rangoDesde, rangoHasta)
                    } finally {
                      setConsultandoRango(false)
                    }
                  }}
                  className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {consultandoRango ? 'Cargando...' : 'Consultar'}
                </button>
              </div>
            )}
          </div>
          <div role="group" aria-label="Filtrar por estado de cuota" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
            {filtrosEstado.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={filtroEstadoHistorial === f.valor}
                onClick={() => setFiltroEstadoHistorial(f.valor)}
                className={`h-11 shrink-0 rounded-full px-3.5 text-sm ${
                  filtroEstadoHistorial === f.valor ? 'bg-[#1E3663] font-bold text-white' : 'font-semibold text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {listaFiltrada.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No se encontraron registros de asistencia para los filtros seleccionados.</p>
          ) : (
            <ul>{listaFiltrada.map((a) => renderFila(a, true))}</ul>
          )}
        </section>
      )}

      <p className="border-t border-slate-800 pt-3 text-[13px] text-slate-500">
        El aviso de días extra no frena el ingreso: es para charlarlo en el mostrador.
      </p>

      <div className="flex flex-wrap gap-2 md:hidden">{acciones}</div>

      <section aria-label="Horarios y días de mayor movimiento" className="grid gap-6 lg:grid-cols-3">
        {/* GRÁFICO DE HORAS PICO CON SELECTOR DE DÍAS ANTERIORES */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
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
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="size-3.5" /> Día:
            </span>
            {ultimos7Dias.map((opc) => {
              const seleccionado = diaGrafico === opc.fecha
              return (
                <button
                  key={opc.fecha}
                  type="button"
                  onClick={() => setDiaGrafico(opc.fecha)}
                  className={`h-11 shrink-0 px-3 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer ${
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
              className={`h-11 shrink-0 px-3 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer ${
                diaGrafico === 'SEMANA_COMPLETA'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              Semana completa
            </button>
          </div>

          {/* Gráfico de barras desplazable horizontalmente en móviles */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
            <div className="min-w-[560px] sm:min-w-0">
              <div className="mt-6 flex items-end gap-1.5 sm:gap-2 h-44 border-b border-slate-800 pb-2 px-1">
                {distribucionHoraria.map((item) => {
                  const esPico = item.cantidad > 0 && item.porcentaje >= 90
                  return (
                    <div key={item.hora} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip hover */}
                      <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg pointer-events-none z-10 whitespace-nowrap border border-slate-700">
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
                      <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300">
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
          </div>
        </div>

        {/* AFLUENCIA POR DÍA DE LA SEMANA */}
        <div className="rounded-2xl border border-slate-800 p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-1">
              <Calendar className="size-4 text-emerald-400" />
              Concurrencia por día
            </h2>
            <p className="text-xs text-slate-400 mb-5">Promedio semanal de lunes a sábado.</p>

            <div className="overflow-x-auto pb-1 scrollbar-thin">
              <div className="min-w-[280px] flex flex-col gap-3">
                {distribucionSemanal.map((d) => (
                  <div key={d.diaIndex}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300">{d.dia}</span>
                      <span className="font-mono text-slate-400">{d.cantidad} accesos</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-700"
                        style={{ width: `${Math.max(d.porcentaje, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-950/30 border border-blue-500/20 p-3 text-xs text-blue-300 flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-blue-400" />
            <span>Datos calculados automáticamente a partir de los ingresos registrados en el tótem.</span>
          </div>
        </div>
      </section>

      {/* Modal de confirmación para eliminar asistencia */}
      {asistenciaAEliminar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-eliminar"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1">
                <h3 id="titulo-modal-eliminar" className="text-base font-bold text-white">
                  ¿Eliminar registro de asistencia?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  ¿Estás seguro de que deseás eliminar la sesión de{' '}
                  <span className="font-bold text-white">{asistenciaAEliminar.alumnoNombre}</span>{' '}
                  del día{' '}
                  <span className="font-semibold text-slate-200">
                    {asistenciaAEliminar.fecha} a las {asistenciaAEliminar.hora} hs
                  </span>
                  ? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAsistenciaAEliminar(null)}
                className="h-11 px-4 text-sm font-bold text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  eliminarAsistencia(asistenciaAEliminar.id)
                  setAsistenciaAEliminar(null)
                }}
                className="h-11 px-4 text-sm font-bold text-white rounded-xl bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] cursor-pointer"
              >
                Eliminar asistencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
