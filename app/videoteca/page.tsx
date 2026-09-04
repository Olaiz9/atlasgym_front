'use client'

import { useState, useMemo } from 'react'
import { useAppData } from '@/lib/store'
import { VideoTecnica } from '@/lib/types'
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
  ExternalLink,
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
  const [videoSeleccionado, setVideoSeleccionado] = useState<VideoTecnica | null>(null)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)

  const esAdmin = usuarioActual.rol === 'ADMIN'

  const videosFiltrados = useMemo(() => {
    return videosTecnica.filter((v) => {
      const matchGrupo = filtroGrupo === 'TODOS' || v.grupoMuscular.toLowerCase() === filtroGrupo.toLowerCase()
      const matchTexto =
        v.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (v.descripcion && v.descripcion.toLowerCase().includes(busqueda.toLowerCase())) ||
        v.grupoMuscular.toLowerCase().includes(busqueda.toLowerCase())
      return matchGrupo && matchTexto
    })
  }, [videosTecnica, filtroGrupo, busqueda])

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500 mb-1">
            <Video className="size-4" />
            <span>Videoteca de Ejercicios ATLAS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Técnica y <span className="text-blue-500">Biomecánica</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-400">
            {esAdmin
              ? 'Biblioteca de demostraciones en video para tus alumnos. Añade o gestiona los tutoriales de técnica.'
              : 'Consultá cómo realizar cada ejercicio con la técnica correcta para entrenar seguro y evitar lesiones.'}
          </p>
        </div>

        {esAdmin && (
          <Button
            onClick={() => setModalNuevoAbierto(true)}
            className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 border-transparent transition-all duration-300 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95 shrink-0"
          >
            <Plus className="mr-2 size-5" />
            Nuevo Video
          </Button>
        )}
      </div>

      {/* Barra de Búsqueda y Filtros por Grupo Muscular */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ejercicio, músculo o técnica..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-800 bg-slate-900/60 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {GRUPOS_MUSCULARES.map((grupo) => {
            const activo = filtroGrupo === grupo
            return (
              <button
                key={grupo}
                onClick={() => setFiltroGrupo(grupo)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activo
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {grupo}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de Videos */}
      {videosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="size-14 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-4">
            <Video className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No se encontraron videos</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {busqueda || filtroGrupo !== 'TODOS'
              ? 'Probá cambiando el filtro de grupo muscular o el término de búsqueda.'
              : 'Aún no hay videos registrados en la videoteca.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videosFiltrados.map((video) => (
            <div
              key={video.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/40"
            >
              <div
                onClick={() => setVideoSeleccionado(video)}
                className="relative h-48 w-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/50 flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-800/60"
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative size-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/50 transition-all duration-300 group-hover:scale-115 group-hover:bg-blue-500">
                  <Play className="size-6 fill-white ml-0.5" />
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-slate-950/90 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-300 border border-slate-800">
                  <Clock className="size-3 text-slate-400" />
                  {video.duracion}
                </div>

                <div className="absolute top-3 left-3">
                  <span className="rounded-md bg-blue-600/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-blue-400 border border-blue-500/30">
                    {video.grupoMuscular}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Sparkles className="size-3 text-blue-400" />
                      {video.nivel}
                    </span>

                    {esAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar el video "${video.titulo}"?`)) {
                            eliminarVideoTecnica(video.id)
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                        title="Eliminar video"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <h3
                    onClick={() => setVideoSeleccionado(video)}
                    className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer leading-snug"
                  >
                    {video.titulo}
                  </h3>

                  {video.descripcion && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {video.descripcion}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <button
                    onClick={() => setVideoSeleccionado(video)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <Play className="size-3.5 fill-blue-400" />
                    Reproducir y ver tips
                  </button>

                  <span className="text-[11px] font-medium text-slate-500">
                    ATLAS Gym
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL REPRODUCTOR DE VIDEO Y CONSEJOS */}
      {videoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md transition-all animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                  {videoSeleccionado.grupoMuscular}
                </span>
                <h2 className="text-base md:text-lg font-bold text-white truncate max-w-md">
                  {videoSeleccionado.titulo}
                </h2>
              </div>
              <button
                onClick={() => setVideoSeleccionado(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={getEmbedUrl(videoSeleccionado.videoUrl)}
                title={videoSeleccionado.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-slate-900">
              {videoSeleccionado.descripcion && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Descripción del ejercicio
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {videoSeleccionado.descripcion}
                  </p>
                </div>
              )}

              {videoSeleccionado.consejosClave && videoSeleccionado.consejosClave.length > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-blue-400" />
                    Puntos clave para una ejecución perfecta
                  </h4>
                  <ul className="space-y-2">
                    {videoSeleccionado.consejosClave.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                        <span className="size-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <span>Duración estimada: {videoSeleccionado.duracion}</span>
                <span>Nivel: {videoSeleccionado.nivel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO VIDEO (ADMIN) */}
      {modalNuevoAbierto && (
        <ModalNuevoVideo
          onCerrar={() => setModalNuevoAbierto(false)}
          onGuardar={(nuevo) => {
            agregarVideoTecnica(nuevo)
            setModalNuevoAbierto(false)
          }}
        />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Nuevo Video de Técnica</h2>
            <p className="mt-1 text-sm text-slate-400">
              Carga un tutorial de YouTube o video para la videoteca de tus alumnos.
            </p>
          </div>
          <button
            onClick={onCerrar}
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
              Grupo Muscular
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
              className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
            >
              Guardar video
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
