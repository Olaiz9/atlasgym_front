'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAppData } from '@/lib/store'
import { VideoTecnica } from '@/lib/types'
import { CLASICOS_CURADOS, EjercicioCatalogo } from '@/lib/clasicos-curados'
import { useDebounce } from '@/lib/use-debounce'
import { useEscapeKey } from '@/lib/use-escape-key'
import {
  Video,
  Play,
  Search,
  Plus,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Dumbbell,
  Shield,
  Layers,
  Flame,
  Crosshair,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const GRUPOS_MUSCULARES = [
  'TODOS',
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
] as const

type GrupoValido = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Core'

const INFO_GRUPOS: Record<GrupoValido, { icono: LucideIcon; titulo: string; descripcion: string; color: string; iconColor: string }> = {
  Pecho: {
    icono: Shield,
    titulo: 'Pecho y Pectorales',
    descripcion: 'Press de banca, aperturas y variantes para desarrollo y potencia del pectoral.',
    color: 'from-blue-600/15 via-blue-500/5 to-transparent border-blue-500/30 text-blue-400',
    iconColor: 'text-blue-400',
  },
  Espalda: {
    icono: Layers,
    titulo: 'Espalda y Dorsales',
    descripcion: 'Dominadas, remos, jalones y tracciones para amplitud, densidad y salud postural.',
    color: 'from-emerald-600/15 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  Piernas: {
    icono: Flame,
    titulo: 'Piernas y Glúteos',
    descripcion: 'Sentadillas, peso muerto, prensa y ejercicios para tren inferior completo.',
    color: 'from-amber-600/15 via-amber-500/5 to-transparent border-amber-500/30 text-amber-400',
    iconColor: 'text-amber-400',
  },
  Hombros: {
    icono: Crosshair,
    titulo: 'Hombros y Deltoides',
    descripcion: 'Press militar, elevaciones laterales y posteriores para hombros redondos y estables.',
    color: 'from-purple-600/15 via-purple-500/5 to-transparent border-purple-500/30 text-purple-400',
    iconColor: 'text-purple-400',
  },
  Brazos: {
    icono: Dumbbell,
    titulo: 'Brazos (Bíceps y Tríceps)',
    descripcion: 'Curls variados, extensiones, fondos y antebrazos con técnica estricta.',
    color: 'from-rose-600/15 via-rose-500/5 to-transparent border-rose-500/30 text-rose-400',
    iconColor: 'text-rose-400',
  },
  Core: {
    icono: CircleDot,
    titulo: 'Core y Zona Media',
    descripcion: 'Planchas, elevaciones de piernas y estabilidad lumbopélvica profunda.',
    color: 'from-cyan-600/15 via-cyan-500/5 to-transparent border-cyan-500/30 text-cyan-400',
    iconColor: 'text-cyan-400',
  },
}

const TOTALES_INICIALES: Record<GrupoValido, number> = {
  Pecho: 192,
  Espalda: 241,
  Piernas: 351,
  Hombros: 159,
  Brazos: 362,
  Core: 195,
}

function getEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('embed/')) return url
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
  }
  return url
}

export default function VideotecaPage() {
  const { videosTecnica, usuarioActual, agregarVideoTecnica, eliminarVideoTecnica } = useAppData()

  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebounce(busqueda, 250)
  const [videoSeleccionado, setVideoSeleccionado] = useState<VideoTecnica | null>(null)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [videoAEliminar, setVideoAEliminar] = useState<VideoTecnica | null>(null)

  const esAdmin = usuarioActual?.rol === 'ADMIN'

  // Totales por grupo sincronizados con el backend
  const [totalesPorGrupo, setTotalesPorGrupo] = useState<Record<GrupoValido, number>>(TOTALES_INICIALES)

  // Catálogo de ejercicios clasificado por grupo muscular (inicia con los clásicos curados para carga instantánea 0ms)
  const [ejerciciosPorGrupo, setEjerciciosPorGrupo] = useState<Record<GrupoValido, EjercicioCatalogo[]>>(() => {
    const inicial: Record<GrupoValido, EjercicioCatalogo[]> = {
      Pecho: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Pecho'),
      Espalda: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Espalda'),
      Piernas: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Piernas'),
      Hombros: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Hombros'),
      Brazos: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Brazos'),
      Core: CLASICOS_CURADOS.filter((e) => e.grupoMuscular === 'Core'),
    }
    return inicial
  })

  // Estado de carga por grupo al hacer clic en "Cargar más"
  const [cargandoGrupo, setCargandoGrupo] = useState<Record<string, boolean>>({})

  // Resultados de búsqueda global
  const [resultadosBusquedaApi, setResultadosBusquedaApi] = useState<EjercicioCatalogo[]>([])
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false)

  // Tecla Escape para cerrar cualquier modal abierto
  useEscapeKey(() => {
    setVideoSeleccionado(null)
    setModalNuevoAbierto(false)
    setVideoAEliminar(null)
  }, Boolean(videoSeleccionado || modalNuevoAbierto || videoAEliminar))

  // Cargar resumen de totales del backend en background
  useEffect(() => {
    fetch('/api/ejercicios?resumen=true')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totales) {
          setTotalesPorGrupo(data.totales)
        }
      })
      .catch(() => {})
  }, [])

  // Buscar ejercicios en la API cuando el usuario escribe en la barra
  useEffect(() => {
    if (!busquedaDebounced.trim()) {
      setResultadosBusquedaApi([])
      setCargandoBusqueda(false)
      return
    }

    let cancelado = false
    setCargandoBusqueda(true)

    const params = new URLSearchParams()
    params.set('q', busquedaDebounced.trim())
    if (filtroGrupo !== 'TODOS') {
      params.set('grupo', filtroGrupo)
    }
    params.set('limit', '48')

    fetch(`/api/ejercicios?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado) {
          setResultadosBusquedaApi(data.ejercicios || [])
          setCargandoBusqueda(false)
        }
      })
      .catch(() => {
        if (!cancelado) setCargandoBusqueda(false)
      })

    return () => {
      cancelado = true
    }
  }, [busquedaDebounced, filtroGrupo])

  // Cargar más ejercicios de un grupo muscular específico
  const cargarMasDeGrupo = useCallback(
    async (grupo: GrupoValido) => {
      if (cargandoGrupo[grupo]) return

      setCargandoGrupo((prev) => ({ ...prev, [grupo]: true }))
      const actuales = ejerciciosPorGrupo[grupo] || []
      const offset = actuales.length
      const limit = 12

      try {
        const res = await fetch(`/api/ejercicios?grupo=${encodeURIComponent(grupo)}&offset=${offset}&limit=${limit}`)
        const data = await res.json()

        if (data && Array.isArray(data.ejercicios)) {
          setEjerciciosPorGrupo((prev) => {
            const existentes = prev[grupo] || []
            const idsExistentes = new Set(existentes.map((e) => e.id))
            const nuevos = (data.ejercicios as EjercicioCatalogo[]).filter((e) => !idsExistentes.has(e.id))
            return {
              ...prev,
              [grupo]: [...existentes, ...nuevos],
            }
          })
          if (data.total) {
            setTotalesPorGrupo((prev) => ({ ...prev, [grupo]: data.total }))
          }
        }
      } catch (err) {
        console.error('Error al cargar ejercicios de ' + grupo, err)
      } finally {
        setCargandoGrupo((prev) => ({ ...prev, [grupo]: false }))
      }
    },
    [cargandoGrupo, ejerciciosPorGrupo]
  )

  // Videos tutoriales subidos por el gimnasio (excluyendo IDs de catálogo para cero duplicados)
  const videosGymPorGrupo = useMemo(() => {
    const mapa: Record<GrupoValido, VideoTecnica[]> = {
      Pecho: [],
      Espalda: [],
      Piernas: [],
      Hombros: [],
      Brazos: [],
      Core: [],
    }

    videosTecnica.forEach((v) => {
      if (v.id.startsWith('cat-') || v.id.startsWith('ex-')) return
      const g = v.grupoMuscular as GrupoValido
      if (mapa[g]) {
        mapa[g].push(v)
      }
    })

    return mapa
  }, [videosTecnica])

  // Resultados combinados si hay búsqueda activa
  const resultadosBusqueda = useMemo(() => {
    if (!busquedaDebounced.trim()) return null

    const termino = busquedaDebounced.toLowerCase()

    // 1. Filtrar videos propios del gimnasio
    const videosGymCoincidentes = videosTecnica.filter((v) => {
      if (v.id.startsWith('cat-') || v.id.startsWith('ex-')) return false
      const matchGrupo = filtroGrupo === 'TODOS' || v.grupoMuscular.toLowerCase() === filtroGrupo.toLowerCase()
      const matchTexto =
        v.titulo.toLowerCase().includes(termino) ||
        (v.descripcion && v.descripcion.toLowerCase().includes(termino)) ||
        v.grupoMuscular.toLowerCase().includes(termino)
      return matchGrupo && matchTexto
    })

    // 2. Unificar con los resultados de la API sin duplicados
    const idsExistentes = new Set(videosGymCoincidentes.map((v) => v.id))
    const apiUnicos = resultadosBusquedaApi.filter((e) => !idsExistentes.has(e.id))

    return [...videosGymCoincidentes, ...apiUnicos]
  }, [busquedaDebounced, filtroGrupo, videosTecnica, resultadosBusquedaApi])

  // Grupos a mostrar según el filtro activo
  const gruposAMostrar = useMemo(() => {
    if (filtroGrupo === 'TODOS') {
      return ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'] as GrupoValido[]
    }
    return [filtroGrupo as GrupoValido]
  }, [filtroGrupo])

  // Total general de ejercicios
  const totalGeneral = useMemo(() => {
    const totalCatalogo = Object.values(totalesPorGrupo).reduce((acc, n) => acc + n, 0)
    const totalCustom = videosTecnica.filter((v) => !v.id.startsWith('cat-') && !v.id.startsWith('ex-')).length
    return totalCatalogo + totalCustom
  }, [totalesPorGrupo, videosTecnica])

  if (!usuarioActual) return null

  return (
    <div className="mx-auto max-w-[1550px] px-4 py-6 md:px-8 md:py-8 space-y-8">
      {/* Header superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-400 mb-1">
            <Video className="size-4" />
            <span>Videoteca Biomecánica ATLAS</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
            Técnica por <span className="text-blue-500">grupo muscular</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-400 max-w-3xl">
            {esAdmin
              ? 'Biblioteca completa dividida por grupos musculares. Podés agregar videos propios de coaching o consultar los 1.500 bucles biomecánicos con técnica estricta.'
              : 'Elegí el músculo que vas a entrenar para ver la técnica exacta, consejos de postura y evitar lesiones durante tu rutina.'}
          </p>
        </div>

        {esAdmin && (
          <Button
            onClick={() => setModalNuevoAbierto(true)}
            className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="mr-2 size-4" />
            Nuevo video coach
          </Button>
        )}
      </div>

      {/* Barra de Filtros por Músculo y Buscador */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            id="buscar-video"
            type="text"
            aria-label="Buscar ejercicio o músculo"
            placeholder="Buscar ejercicio (ej. Banca, Sentadilla, Curl, Polea)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-800 bg-slate-900/80 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
          />
          {busqueda && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Pestañas de Grupos Musculares con Conteo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {GRUPOS_MUSCULARES.map((grupo) => {
            const activo = filtroGrupo === grupo
            const totalGrupo = grupo === 'TODOS' ? totalGeneral : totalesPorGrupo[grupo as GrupoValido] || 0

            return (
              <button
                key={grupo}
                onClick={() => {
                  setFiltroGrupo(grupo)
                  setBusqueda('')
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer ${
                  activo
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{grupo}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activo ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {totalGrupo}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* VISTA 1: BÚSQUEDA ACTIVA */}
      {resultadosBusqueda !== null ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="size-5 text-blue-400" />
              Resultados para <span className="text-blue-400">"{busqueda}"</span>
            </h2>
            <span className="text-xs font-medium text-slate-400">
              {cargandoBusqueda ? 'Buscando en catálogo...' : `${resultadosBusqueda.length} ejercicios encontrados`}
            </span>
          </div>

          {cargandoBusqueda && resultadosBusqueda.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                  <div className="h-44 rounded-xl bg-slate-800/60" />
                  <div className="h-4 w-1/3 rounded bg-slate-800" />
                  <div className="h-5 w-3/4 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : resultadosBusqueda.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <div className="size-14 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-4">
                <Search className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No se encontraron coincidencias</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                No encontramos ejercicios con el término "{busqueda}". Probá buscando por nombre en español (ej: "press", "remo", "sentadilla") o en inglés (ej: "deadlift", "biceps").
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {resultadosBusqueda.map((video) => (
                <TarjetaEjercicio
                  key={video.id}
                  video={video}
                  esAdmin={esAdmin}
                  onSeleccionar={() => setVideoSeleccionado(video)}
                  onEliminar={() => setVideoAEliminar(video)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: SECCIONES ORGANIZADAS POR GRUPO MUSCULAR */
        <div className="space-y-12">
          {gruposAMostrar.map((grupo) => {
            const info = INFO_GRUPOS[grupo]
            const videosGym = videosGymPorGrupo[grupo] || []
            const ejerciciosCatalogo = ejerciciosPorGrupo[grupo] || []
            const totalDisponibles = totalesPorGrupo[grupo] || ejerciciosCatalogo.length
            const estaCargando = cargandoGrupo[grupo] || false
            const quedanMas = ejerciciosCatalogo.length < totalDisponibles

            const IconoGrupo = info.icono

            return (
              <section key={grupo} className="space-y-6">
                {/* Encabezado del Grupo Muscular */}
                <div className={`p-5 rounded-2xl border bg-gradient-to-r ${info.color} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`size-12 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-center shrink-0 shadow-sm ${info.iconColor}`}>
                      <IconoGrupo className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-white">{info.titulo}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-950/80 border border-slate-800 text-slate-300">
                          {totalDisponibles} ejercicios
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">{info.descripcion}</p>
                    </div>
                  </div>

                  {filtroGrupo === 'TODOS' && (
                    <button
                      onClick={() => setFiltroGrupo(grupo)}
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 transition-colors self-start md:self-auto cursor-pointer"
                    >
                      Ver solo {grupo}
                    </button>
                  )}
                </div>

                {/* Videos Exclusivos de Coaching ATLAS Gym (si existen) */}
                {videosGym.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                      <Sparkles className="size-3.5" />
                      <span>Tutoriales Exclusivos de los Coaches</span>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {videosGym.map((video) => (
                        <TarjetaEjercicio
                          key={video.id}
                          video={video}
                          esAdmin={esAdmin}
                          esTutorialCoach={true}
                          onSeleccionar={() => setVideoSeleccionado(video)}
                          onEliminar={() => setVideoAEliminar(video)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Grilla de Ejercicios y Técnica del Catálogo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Dumbbell className="size-3.5 text-slate-400" />
                      Ejercicios y Biomecánica en Bucles (Loop)
                    </span>
                    <span>
                      Mostrando <strong className="text-white">{ejerciciosCatalogo.length}</strong> de{' '}
                      <strong className="text-white">{totalDisponibles}</strong>
                    </span>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {ejerciciosCatalogo.map((video) => (
                      <TarjetaEjercicio
                        key={video.id}
                        video={video}
                        esAdmin={esAdmin}
                        onSeleccionar={() => setVideoSeleccionado(video)}
                        onEliminar={() => setVideoAEliminar(video)}
                      />
                    ))}
                  </div>
                </div>

                {/* Botón de Cargar Más para este grupo muscular */}
                {quedanMas && (
                  <div className="flex flex-col items-center justify-center pt-2 pb-4 gap-2">
                    <button
                      type="button"
                      disabled={estaCargando}
                      onClick={() => cargarMasDeGrupo(grupo)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-200 font-bold text-xs md:text-sm shadow-md transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {estaCargando ? (
                        <>
                          <div className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <span>Cargando más ejercicios de {grupo}...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-4 text-blue-400" />
                          <span>Cargar más de {grupo} (+12)</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Quedan {totalDisponibles - ejerciciosCatalogo.length} ejercicios adicionales de {grupo}
                    </span>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* REPRODUCTOR MODAL COMPLETO DE EJERCICIO / VIDEO */}
      {videoSeleccionado && (
        <dialog
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoSeleccionado(null)
          }}
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-none bg-slate-950/85 p-4 backdrop-blur-md backdrop:bg-transparent transition-opacity duration-200 animate-in fade-in"
          aria-labelledby="modal-player-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                  {videoSeleccionado.grupoMuscular}
                </span>
                <h2 id="modal-player-title" className="text-base md:text-lg font-bold text-white truncate max-w-md">
                  {videoSeleccionado.titulo}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar reproductor"
                onClick={() => setVideoSeleccionado(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Visualizador de Video / GIF */}
            {videoSeleccionado.gifUrl || videoSeleccionado.formato === 'GIF' ? (
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={videoSeleccionado.gifUrl || videoSeleccionado.videoUrl}
                  alt={`Técnica de ${videoSeleccionado.titulo}`}
                  className="max-h-full max-w-full object-contain mx-auto"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-950/80 text-[10px] font-mono font-bold text-blue-400 border border-slate-800 backdrop-blur-sm">
                  ⚡ Loop continuo sin cortes
                </div>
              </div>
            ) : (
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={getEmbedUrl(videoSeleccionado.videoUrl)}
                  title={videoSeleccionado.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            )}

            {/* Detalles, Consejos e Instrucciones */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-900">
              {videoSeleccionado.descripcion && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Descripción del ejercicio
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{videoSeleccionado.descripcion}</p>
                </div>
              )}

              {/* Músculos objetivo */}
              {(videoSeleccionado as any).musculosPrincipales && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Objetivo:</span>
                  {(videoSeleccionado as any).musculosPrincipales.map((m: string) => (
                    <span key={m} className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                      {m}
                    </span>
                  ))}
                  {(videoSeleccionado as any).equipo && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                      {(videoSeleccionado as any).equipo}
                    </span>
                  )}
                </div>
              )}

              {/* Consejos Clave */}
              {videoSeleccionado.consejosClave && videoSeleccionado.consejosClave.length > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-blue-400" />
                    Puntos clave para una ejecución perfecta
                  </h4>
                  <ul className="space-y-2">
                    {videoSeleccionado.consejosClave.map((tip) => (
                      <li key={tip} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                        <span className="size-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pasos de ejecución */}
              {(videoSeleccionado as any).instruccionesPasoAPaso && (videoSeleccionado as any).instruccionesPasoAPaso.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Instrucciones paso a paso
                  </h4>
                  <ol className="space-y-2">
                    {(videoSeleccionado as any).instruccionesPasoAPaso.map((paso: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-bold text-blue-400 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1 leading-relaxed">{paso.replace(/^Paso\s*\d+:\s*/i, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-800">
                <span>
                  {videoSeleccionado.equipo ? `Equipamiento: ${videoSeleccionado.equipo}` : `Duración: ${videoSeleccionado.duracion}`}
                </span>
                <span>Nivel: {videoSeleccionado.nivel}</span>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* MODAL NUEVO VIDEO COACH (ADMIN) */}
      {modalNuevoAbierto && (
        <ModalNuevoVideo
          onCerrar={() => setModalNuevoAbierto(false)}
          onGuardar={(nuevo) => {
            agregarVideoTecnica(nuevo)
            setModalNuevoAbierto(false)
          }}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINAR VIDEO */}
      {videoAEliminar && (
        <ModalConfirmarEliminarVideo
          video={videoAEliminar}
          onCancel={() => setVideoAEliminar(null)}
          onConfirm={() => {
            eliminarVideoTecnica(videoAEliminar.id)
            setVideoAEliminar(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Tarjeta de Ejercicio de Carga Instantánea (0 ms):
 * - No descarga el GIF pesado inmediatamente en mount para no saturar la red.
 * - Muestra un poster biomecánico interactivo.
 * - Al pasar el cursor (hover) o al tocarlo, activa la previsualización del GIF.
 * - Al hacer clic, abre el reproductor en pantalla completa.
 */
function TarjetaEjercicio({
  video,
  esAdmin,
  esTutorialCoach,
  onSeleccionar,
  onEliminar,
}: {
  video: VideoTecnica
  esAdmin: boolean
  esTutorialCoach?: boolean
  onSeleccionar: () => void
  onEliminar: () => void
}) {
  const [hoverActivo, setHoverActivo] = useState(false)
  const [gifCargado, setGifCargado] = useState(false)

  const esGif = Boolean(video.gifUrl || video.formato === 'GIF')
  const urlMedio = video.gifUrl || video.videoUrl

  return (
    <div
      onMouseEnter={() => setHoverActivo(true)}
      onMouseLeave={() => setHoverActivo(false)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        esTutorialCoach
          ? 'border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-slate-900/60 hover:shadow-blue-900/30'
          : 'border-slate-800 bg-slate-900/60 hover:border-blue-500/40 hover:shadow-blue-950/40'
      }`}
    >
      <button
        type="button"
        onClick={onSeleccionar}
        aria-label={`Ver técnica: ${video.titulo}`}
        className="relative h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/60 text-left cursor-pointer group-hover:border-blue-500/30"
      >
        {esGif ? (
          <>
            {/* Poster liviano por defecto para apertura en 0ms */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="size-12 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Play className="size-5 fill-current ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                ⚡ Ver loop biomecánico
              </span>
            </div>

            {/* El GIF solo se monta cuando el usuario hace hover, ahorrando ~40MB en la carga inicial */}
            {hoverActivo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlMedio}
                alt={video.titulo}
                onLoad={() => setGifCargado(true)}
                className={`absolute inset-0 h-full w-full object-contain p-2 transition-opacity duration-300 ${
                  gifCargado ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          /* Video de YouTube de coach */
          <>
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative size-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500">
              <Play className="size-5 fill-white ml-0.5" />
            </div>
          </>
        )}

        {/* Badge superior de grupo / equipo */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-slate-950/85 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
            {video.grupoMuscular}
          </span>
          {video.equipo && (
            <span className="rounded-md bg-slate-950/85 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-800">
              {video.equipo}
            </span>
          )}
        </div>

        {/* Badge inferior de duración o GIF */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-slate-950/90 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300 border border-slate-800 backdrop-blur-sm">
          {esGif ? (
            <span className="text-blue-400 font-extrabold flex items-center gap-1">⚡ Loop GIF</span>
          ) : (
            <>
              <Clock className="size-3 text-slate-400" />
              {video.duracion}
            </>
          )}
        </div>

        {esTutorialCoach && (
          <div className="absolute top-2.5 right-2.5">
            <span className="rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
              <Sparkles className="size-2.5" />
              Coach ATLAS
            </span>
          </div>
        )}
      </button>

      {/* Contenido de la tarjeta */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="size-2.5 text-blue-400" />
              {video.nivel}
            </span>

            {esAdmin && !video.id.startsWith('cat-') && !video.id.startsWith('ex-') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEliminar()
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                title="Eliminar video tutorial"
                aria-label={`Eliminar video ${video.titulo}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          <h3 className="font-bold text-white text-sm md:text-base leading-snug group-hover:text-blue-400 transition-colors line-clamp-1">
            {video.titulo}
          </h3>

          {video.descripcion && (
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">{video.descripcion}</p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onSeleccionar}
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <Play className="size-3 fill-blue-400" />
            <span>Ver técnica</span>
          </button>

          <span className="text-[10px] font-medium text-slate-500">
            {esTutorialCoach ? 'ATLAS Coach' : 'Biomecánica'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ModalNuevoVideo({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void
  onGuardar: (video: Omit<VideoTecnica, 'id'>) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [grupoMuscular, setGrupoMuscular] = useState<VideoTecnica['grupoMuscular']>('Pecho')
  const [duracion, setDuracion] = useState('01:30')
  const [nivel, setNivel] = useState('Técnica estricta')
  const [videoUrl, setVideoUrl] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipsTexto, setTipsTexto] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !videoUrl.trim()) return

    const consejosClave = tipsTexto
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    onGuardar({
      titulo: titulo.trim(),
      grupoMuscular,
      duracion: duracion.trim() || '01:30',
      nivel: nivel.trim() || 'Técnica estricta',
      videoUrl: videoUrl.trim(),
      descripcion: descripcion.trim(),
      consejosClave: consejosClave.length > 0 ? consejosClave : undefined,
    })
  }

  return (
    <dialog
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-none bg-slate-950/80 p-4 backdrop-blur-sm backdrop:bg-transparent transition-opacity duration-200"
      aria-labelledby="modal-video-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="modal-video-title" className="text-2xl font-black text-white">
              Nuevo Video de Técnica
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Cargá un tutorial de YouTube o video para la videoteca de tus alumnos.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Nombre del Ejercicio / Video
            <input
              required
              placeholder="Ej: Peso Muerto Rumano con Mancuernas"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
              Grupo muscular
              <select
                value={grupoMuscular}
                onChange={(e) => setGrupoMuscular(e.target.value as any)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="Pecho">Pecho</option>
                <option value="Espalda">Espalda</option>
                <option value="Piernas">Piernas</option>
                <option value="Hombros">Hombros</option>
                <option value="Brazos">Brazos</option>
                <option value="Core">Core</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
              Duración aproximada
              <input
                placeholder="Ej: 01:45"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Enlace del video (YouTube o embed)
            <input
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Descripción o enfoque biomecánico
            <textarea
              rows={2}
              placeholder="Explicación breve de la postura y músculos objetivo..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm text-white outline-none focus:border-blue-500 resize-none"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Tips clave de ejecución (uno por línea)
            <textarea
              rows={3}
              placeholder="Empujar el suelo con los talones&#10;Mantener la espalda neutra&#10;No hiperextender el cuello"
              value={tipsTexto}
              onChange={(e) => setTipsTexto(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm text-white outline-none focus:border-blue-500 resize-none text-xs"
            />
          </label>

          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              className="h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all duration-200"
            >
              Guardar video
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

function ModalConfirmarEliminarVideo({
  video,
  onCancel,
  onConfirm,
}: {
  video: VideoTecnica
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
          <Trash2 className="size-6" />
        </div>
        <h3 className="text-lg font-bold text-white">¿Eliminar video tutorial?</h3>
        <p className="mt-2 text-sm text-slate-400">
          Vas a eliminar <span className="font-semibold text-slate-200">"{video.titulo}"</span> de la videoteca. Esta acción no se puede deshacer y los alumnos ya no podrán visualizar esta técnica.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20 active:scale-95 cursor-pointer"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
