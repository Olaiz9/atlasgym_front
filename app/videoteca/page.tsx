'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAppData } from '@/lib/store'
import { VideoTecnica } from '@/lib/types'
import { CLASICOS_CURADOS, EjercicioCatalogo } from '@/lib/clasicos-curados'
import { useDebounce } from '@/lib/use-debounce'
import { useEscapeKey } from '@/lib/use-escape-key'
import { Play, Search, Plus, Trash2, X, CheckCircle2 } from 'lucide-react'
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
    <div className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-5 pb-28 pt-[22px] md:gap-8 md:px-14 md:pb-16 md:pt-12">
      {/* Header superior */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">
          {esAdmin ? 'Técnica por grupo muscular' : 'Videoteca'}
        </h1>
        {esAdmin && (
          <Button
            onClick={() => setModalNuevoAbierto(true)}
            className="h-11 shrink-0 cursor-pointer rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500"
          >
            <Plus className="mr-2 size-4" />
            Nuevo video coach
          </Button>
        )}
      </div>

      {/* Barra de Filtros por Músculo y Buscador */}
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Buscador */}
        <label className="flex h-12 items-center gap-2 rounded-xl border border-[#2A4677] bg-[#162A50] px-3.5 focus-within:border-blue-400 md:h-11 md:w-80 md:shrink-0">
          <Search className="size-[18px] shrink-0 text-slate-500" />
          <input
            id="buscar-video"
            type="search"
            aria-label="Buscar ejercicio"
            placeholder="Buscar ejercicio (ej: sentadilla)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500 md:text-sm"
          />
        </label>

        {/* Pestañas de Grupos Musculares con Conteo */}
        <div role="group" aria-label="Grupo muscular" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
          {GRUPOS_MUSCULARES.map((grupo) => {
            const activo = filtroGrupo === grupo
            const totalGrupo = grupo === 'TODOS' ? totalGeneral : totalesPorGrupo[grupo as GrupoValido] || 0
            return (
              <button
                key={grupo}
                type="button"
                aria-pressed={activo}
                onClick={() => {
                  setFiltroGrupo(grupo)
                  setBusqueda('')
                }}
                className={`flex h-11 shrink-0 items-center rounded-full px-3.5 text-sm transition-colors ${
                  activo ? 'bg-slate-100 font-bold text-[#0E1B36]' : 'border border-[#2A4677] font-semibold text-slate-300 hover:bg-slate-900'
                }`}
              >
                {grupo === 'TODOS' ? 'Todos' : grupo}
                {esAdmin && <span className="ml-2 text-xs opacity-70">{totalGrupo}</span>}
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
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
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
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
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
        <div className="space-y-6 md:space-y-10">
          {gruposAMostrar.map((grupo) => {
            const videosGym = videosGymPorGrupo[grupo] || []
            const ejerciciosCatalogo = ejerciciosPorGrupo[grupo] || []
            const totalDisponibles = totalesPorGrupo[grupo] || ejerciciosCatalogo.length
            const estaCargando = cargandoGrupo[grupo] || false
            const quedanMas = ejerciciosCatalogo.length < totalDisponibles

            return (
              <section key={grupo} aria-label={grupo} className="space-y-2.5 md:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[13px] font-bold uppercase tracking-[.06em] text-slate-500">
                    Técnicas <span aria-hidden="true" className="mx-1 text-slate-600">|</span> {grupo}
                  </h2>
                  {filtroGrupo === 'TODOS' ? (
                    <button type="button" onClick={() => setFiltroGrupo(grupo)} className="h-11 text-sm font-medium text-blue-400 hover:text-blue-300">
                      Ver solo {grupo}
                    </button>
                  ) : (
                    <span className="text-[13px] text-slate-500">{ejerciciosCatalogo.length} de {totalDisponibles}</span>
                  )}
                </div>

                {/* Videos Exclusivos de Coaching ATLAS Gym (si existen) */}
                {videosGym.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
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

                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
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
                      className="flex h-11 items-center gap-2 rounded-xl border border-[#2A4677] px-5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-900 disabled:opacity-50"
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
                    <span className="text-xs text-slate-500 font-medium">
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
                className="flex size-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
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
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-950/80 text-xs font-mono font-bold text-blue-400 border border-slate-800 backdrop-blur-sm">
                  Loop continuo sin cortes
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
                  <h4 className="text-xs font-bold text-slate-400 mb-1.5">
                    Descripción del ejercicio
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{videoSeleccionado.descripcion}</p>
                </div>
              )}

              {/* Músculos objetivo */}
              {(videoSeleccionado as any).musculosPrincipales && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-400">Objetivo:</span>
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
                  <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-1.5">
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
                  <h4 className="text-xs font-bold text-slate-400">
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
  const [gifCargado, setGifCargado] = useState(false)

  const esGif = Boolean(video.gifUrl || video.formato === 'GIF')
  const urlMedio = video.gifUrl || video.videoUrl

  return (
    <div className={`group relative overflow-hidden rounded-[14px] bg-[#162A50] ${esTutorialCoach ? 'col-span-2' : ''}`}>
      <button type="button" onClick={onSeleccionar} aria-label={`Ver técnica: ${video.titulo}`} className="block w-full text-left">
        <span className={`relative flex items-center justify-center overflow-hidden bg-[#13254A] ${esTutorialCoach ? 'h-[150px]' : 'h-24 md:h-36'}`}>
          {esGif ? (
            <>
              {!gifCargado && <Play className="size-5 text-slate-500" aria-hidden="true" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlMedio}
                alt={`GIF: técnica de ${video.titulo}, ejercicio de ${video.grupoMuscular.toLowerCase()}`}
                onLoad={() => setGifCargado(true)}
                className={`absolute inset-0 size-full object-contain p-1.5 transition-opacity duration-200 ${gifCargado ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                decoding="async"
              />
            </>
          ) : (
            <span role="img" aria-label={`Miniatura del video: ${video.titulo}`} className="flex size-14 items-center justify-center rounded-full bg-blue-600">
              <Play className="ml-0.5 size-[22px] fill-white text-white" aria-hidden="true" />
            </span>
          )}
          {esTutorialCoach && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[#1A1206]">Video de ATLAS</span>
          )}
        </span>
        <span className={`block ${esTutorialCoach ? 'px-3.5 py-3' : 'px-3 py-2.5'}`}>
          <span className={`block font-semibold text-slate-100 ${esTutorialCoach ? 'text-base font-bold' : 'line-clamp-2 text-sm'}`}>{video.titulo}</span>
          {esTutorialCoach ? (
            <span className="mt-0.5 block text-[13px] text-slate-400">
              Explicado por los coaches{video.duracion ? <><span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>{video.duracion}</> : null}
            </span>
          ) : (
            <span className="mt-0.5 hidden text-[13px] text-slate-500 md:block">{video.nivel}</span>
          )}
        </span>
      </button>
      {esAdmin && !video.id.startsWith('cat-') && !video.id.startsWith('ex-') && (
        <button
          type="button"
          onClick={onEliminar}
          title="Eliminar video tutorial"
          aria-label={`Eliminar video ${video.titulo}`}
          className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-xl bg-[#0A1530]/75 text-slate-300 hover:text-rose-400"
        >
          <Trash2 className="size-4" />
        </button>
      )}
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
            <h2 id="modal-video-title" className="text-4xl font-black text-white">
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
              className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200"
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
