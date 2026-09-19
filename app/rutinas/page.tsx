'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import { Rutina, DiaRutina, Ejercicio, Alumno, RegistroSerie, SesionEjercicio, SesionEntrenamiento, VideoTecnica, TipoSerieEjercicio } from '@/lib/types'
import { buscarVideoParaEjercicio, formatPrevia, inicializarSeriesDia } from '@/lib/rutina-utils'
import { CONTACTO_ATLAS } from '@/lib/constants'
import { fechaLocalHoy } from '@/lib/date-utils'
import { WhatsAppIcon } from '@/components/icons/brand-icons'
import {
  Dumbbell,
  Plus,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Users,
  Check,
  X,
  AlertCircle,
  Flame,
  Search,
  PlayCircle,
  Save,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useEscapeKey } from '@/lib/use-escape-key'
import { CLASICOS_CURADOS } from '@/lib/clasicos-curados'
import { useDebounce } from '@/lib/use-debounce'

const OBJETIVOS = ['TODOS', 'Hipertrofia', 'Fuerza', 'Adaptación', 'Funcional']

export default function RutinasPage() {
  const { rutinas, alumnos, videosTecnica, usuarioActual, agregarRutina, asignarRutinaAAlumno, eliminarRutina, getRutinaDeAlumno } =
    useAppData()
  const { toast } = useToast()

  const [filtroObjetivo, setFiltroObjetivo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [rutinaAAsignar, setRutinaAAsignar] = useState<Rutina | null>(null)
  const [rutinaAEliminar, setRutinaAEliminar] = useState<Rutina | null>(null)
  const [diaExpandido, setDiaExpandido] = useState<Record<string, boolean>>({})

  useEscapeKey(() => {
    if (modalNuevaAbierto) setModalNuevaAbierto(false)
    if (rutinaAAsignar) setRutinaAAsignar(null)
    if (rutinaAEliminar) setRutinaAEliminar(null)
  }, modalNuevaAbierto || !!rutinaAAsignar || !!rutinaAEliminar)

  const handleDuplicarRutina = (rutina: Rutina) => {
    const copia: Omit<Rutina, "id"> = {
      nombre: `${rutina.nombre} (Copia)`,
      descripcion: rutina.descripcion || "",
      objetivo: rutina.objetivo,
      esGenerica: true,
      dias: rutina.dias.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        ejercicios: d.ejercicios.map((e) => ({
          ...e,
          id: crypto.randomUUID(),
        })),
      })),
    };
    const nueva = agregarRutina(copia);
    toast(`Rutina "${nueva.nombre}" duplicada con éxito`, "success");
  };

  // Filtrado de rutinas para el admin
  const rutinasFiltradas = useMemo(() => {
    return rutinas.filter((r) => {
      const matchObj = filtroObjetivo === 'TODOS' || r.objetivo.toLowerCase() === filtroObjetivo.toLowerCase()
      const matchBusqueda =
        r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      return matchObj && matchBusqueda
    })
  }, [rutinas, filtroObjetivo, busqueda])

  if (!usuarioActual) {
    return null
  }

  // Si es ALUMNO, le mostramos directamente su rutina asignada
  if (usuarioActual.rol === 'ALUMNO') {
    const miRutina = usuarioActual.alumnoId ? getRutinaDeAlumno(usuarioActual.alumnoId) : undefined
    if (!miRutina) {
      return <EstadoSinRutina usuario={usuarioActual} />
    }
    return <VistaMiRutinaAlumno rutina={miRutina} usuario={usuarioActual} />
  }

  const toggleDia = (diaId: string) => {
    setDiaExpandido((prev) => ({ ...prev, [diaId]: !prev[diaId] }))
  }

  const toggleTodosDias = (rutina: Rutina) => {
    const estanTodosExpandidos = rutina.dias.every((d) => diaExpandido[d.id])
    setDiaExpandido((prev) => {
      const siguiente = { ...prev }
      rutina.dias.forEach((d) => {
        siguiente[d.id] = !estanTodosExpandidos
      })
      return siguiente
    })
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Rutinas y Entrenamientos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Creá plantillas genéricas por objetivos o asigná entrenamientos directamente a los alumnos.
          </p>
        </div>
        <button
          onClick={() => setModalNuevaAbierto(true)}
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Rutina
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {OBJETIVOS.map((obj) => (
            <button
              key={obj}
              onClick={() => setFiltroObjetivo(obj)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-[color,background-color,box-shadow] duration-200 active:scale-95 ${
                filtroObjetivo === obj
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {obj === 'TODOS' ? 'Todas las rutinas' : obj}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="buscar-rutina"
            aria-label="Buscar rutina"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar rutina..."
            className="pl-9 pr-4 h-10 text-sm bg-slate-900 border border-slate-800 text-white rounded-full outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Grid de Rutinas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rutinasFiltradas.map((rutina) => {
          const alumnosConEstaRutina = alumnos.filter((a) => a.rutinaId === rutina.id)
          const totalEjercicios = rutina.dias.reduce((acc, d) => acc + d.ejercicios.length, 0)

          return (
            <div
              key={rutina.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:border-slate-700"
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/15 text-blue-400 border border-blue-500/20">
                    <Flame className="size-3" />
                    {rutina.objetivo}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicarRutina(rutina)}
                      title="Duplicar rutina (crear copia)"
                      aria-label={`Duplicar rutina ${rutina.nombre}`}
                      className="text-slate-500 hover:text-blue-400 transition-colors p-1 cursor-pointer"
                    >
                      <Copy className="size-4" />
                    </button>
                    <button
                      onClick={() => setRutinaAEliminar(rutina)}
                      title="Eliminar rutina"
                      aria-label="Eliminar rutina"
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-xl font-black text-white">{rutina.nombre}</h3>
                {rutina.descripcion && (
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{rutina.descripcion}</p>
                )}

                {/* Métricas rápidas */}
                <div className="mt-4 flex items-center gap-4 py-3 border-y border-slate-800/80 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Dumbbell className="size-4 text-blue-400" />
                    {rutina.dias.length} {rutina.dias.length === 1 ? 'Día' : 'Días'}
                  </span>
                  <span>·</span>
                  <span>{totalEjercicios} ejercicios totales</span>
                </div>

                {/* Días y Ejercicios (Desplegable) */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Estructura por Días ({rutina.dias.length}):
                    </p>
                    {rutina.dias.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleTodosDias(rutina)}
                        aria-label={rutina.dias.every((d) => diaExpandido[d.id]) ? 'Colapsar todos los días' : 'Ver todos los días'}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {rutina.dias.every((d) => diaExpandido[d.id]) ? 'Colapsar todos' : 'Ver todos'}
                      </button>
                    )}
                  </div>
                  {rutina.dias.map((dia) => {
                    const expandido = !!diaExpandido[dia.id] // Default compacto
                    return (
                      <div
                        key={dia.id}
                        className="rounded-xl border border-slate-800/60 bg-slate-950/50 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleDia(dia.id)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-slate-300 hover:text-white transition-colors"
                        >
                          <span>{dia.nombre}</span>
                          <span className="flex items-center gap-2 text-[10px] text-slate-500">
                            {dia.ejercicios.length} ejer.
                            {expandido ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          </span>
                        </button>

                        {expandido && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-slate-800/40 space-y-1.5">
                            {dia.ejercicios.map((ej) => (
                              <div
                                key={ej.id}
                                className="flex items-center justify-between text-xs text-slate-400 gap-2"
                              >
                                <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                                  <span className="text-slate-300 font-medium truncate">
                                    • {ej.nombre}
                                  </span>
                                  {ej.tipoSerie === 'BI_SERIE' && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                      Bi-serie
                                    </span>
                                  )}
                                  {ej.tipoSerie === 'DROP_SET' && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                      Drop Set
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {ej.descansoSegundos ? (
                                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5" title={`Descanso: ${ej.descansoSegundos} segundos`}>
                                      <Clock className="size-2.5 text-blue-400" />
                                      {ej.descansoSegundos}s
                                    </span>
                                  ) : null}
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {ej.series}x{ej.repeticiones}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Alumnos asignados actualmente */}
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alumnos con esta rutina:
                  </p>
                  {alumnosConEstaRutina.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {alumnosConEstaRutina.map((al) => (
                        <span
                          key={al.id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                        >
                          {al.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Todavía no asignada a ningún alumno</span>
                  )}
                </div>
              </div>

              {/* Botón Asignar */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setRutinaAAsignar(rutina)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white py-2.5 text-xs font-bold text-slate-200 transition-[color,background-color] duration-200 active:scale-95"
                >
                  <UserPlus className="size-4" />
                  Asignar a Alumno
                </button>
              </div>
            </div>
          )
        })}

        {rutinasFiltradas.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500">
            No se encontraron rutinas con los criterios seleccionados.
          </div>
        )}
      </div>

      {/* Modal: Asignar Rutina a Alumno */}
      {rutinaAAsignar && (
        <ModalAsignarRutina
          rutina={rutinaAAsignar}
          alumnos={alumnos}
          onClose={() => setRutinaAAsignar(null)}
          onConfirm={(alumnoId) => {
            asignarRutinaAAlumno(rutinaAAsignar.id, alumnoId)
            const al = alumnos.find((a) => a.id === alumnoId)
            toast(`Rutina asignada a ${al?.nombre || 'alumno'}`, 'success')
            setRutinaAAsignar(null)
          }}
        />
      )}

      {/* Modal: Confirmar Eliminar Rutina */}
      {rutinaAEliminar && (
        <ModalConfirmarEliminarRutina
          rutina={rutinaAEliminar}
          onCancel={() => setRutinaAEliminar(null)}
          onConfirm={() => {
            eliminarRutina(rutinaAEliminar.id)
            toast(`Rutina "${rutinaAEliminar.nombre}" eliminada`, 'info')
            setRutinaAEliminar(null)
          }}
        />
      )}

      {/* Modal: Crear Nueva Rutina */}
      {modalNuevaAbierto && (
        <ModalNuevaRutina
          videosTecnica={videosTecnica}
          onClose={() => setModalNuevaAbierto(false)}
          onSave={(nueva) => {
            const r = agregarRutina(nueva)
            toast(`Rutina "${r.nombre}" creada exitosamente`, 'success')
            setModalNuevaAbierto(false)
          }}
        />
      )}
    </div>
  )
}

// ---------- Modal: Confirmar Eliminar Rutina ----------
function ModalConfirmarEliminarRutina({
  rutina,
  onCancel,
  onConfirm,
}: {
  rutina: Rutina
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
        <h3 className="text-lg font-bold text-white">¿Eliminar {rutina.nombre}?</h3>
        <p className="mt-2 text-sm text-slate-400">
          Esta acción no se puede deshacer. Los alumnos que tengan esta rutina asignada perderán el acceso a su contenido.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/20 active:scale-95"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Modal: Asignar Rutina a Alumno ----------
function ModalAsignarRutina({
  rutina,
  alumnos,
  onClose,
  onConfirm,
}: {
  rutina: Rutina
  alumnos: Alumno[]
  onClose: () => void
  onConfirm: (alumnoId: string) => void
}) {
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(alumnos[0]?.id || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!alumnoSeleccionado) return
    onConfirm(alumnoSeleccionado)
  }

  const alumnoActual = alumnos.find((a) => a.id === alumnoSeleccionado)

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Asignar Rutina</h2>
            <p className="text-xs text-slate-500 mt-0.5">Asignar plan a un alumno del gimnasio</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900">
            <p className="font-bold">Rutina seleccionada:</p>
            <p className="text-sm font-extrabold text-blue-700 mt-0.5">{rutina.nombre}</p>
            <p className="text-[11px] text-blue-600 mt-1">{rutina.dias.length} Días de entrenamiento</p>
          </div>

          <div>
            <label htmlFor="alumno-asignar-select" className="block text-xs font-bold text-slate-700 mb-1.5">
              Elegir Alumno:
            </label>
            <select
              id="alumno-asignar-select"
              value={alumnoSeleccionado}
              onChange={(e) => setAlumnoSeleccionado(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-900 cursor-pointer"
            >
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.plan}) {a.rutinaId === rutina.id ? '— Ya la tiene asignada' : ''}
                </option>
              ))}
            </select>
          </div>

          {alumnoActual && alumnoActual.rutinaId && alumnoActual.rutinaId !== rutina.id && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Este alumno ya tiene otra rutina asignada. Al confirmar, se reemplazará por <strong>{rutina.nombre}</strong>.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-[color,background-color] duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95"
            >
              Confirmar asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Modal: Crear Nueva Rutina ----------
function ModalNuevaRutina({
  videosTecnica,
  onClose,
  onSave,
}: {
  videosTecnica: VideoTecnica[]
  onClose: () => void
  onSave: (rutina: Omit<Rutina, 'id'>) => void
}) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [objetivo, setObjetivo] = useState('Hipertrofia')
  const [diaParaBuscar, setDiaParaBuscar] = useState<string | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)
  const [dias, setDias] = useState<DiaRutina[]>([
    {
      id: 'd-1',
      nombre: 'Día 1 — Pecho y Tríceps',
      ejercicios: [
        { id: 'e-1', nombre: 'Press Banca Plano', series: 4, repeticiones: '10', tipoSerie: 'NORMAL', descansoSegundos: 90 },
        { id: 'e-2', nombre: 'Aperturas con Mancuernas', series: 3, repeticiones: '12', tipoSerie: 'NORMAL', descansoSegundos: 60 },
      ],
    },
  ])


  const agregarDia = () => {
    setErrorValidacion(null)
    const num = dias.length + 1
    setDias((prev) => [
      ...prev,
      {
        id: `d-${Date.now()}`,
        nombre: `Día ${num} — Nuevo Día`,
        ejercicios: [
          { id: `e-${Date.now()}`, nombre: 'Ejercicio 1', series: 4, repeticiones: '10', tipoSerie: 'NORMAL', descansoSegundos: 60 },
        ],
      },
    ])
  }

  const agregarEjercicioADia = (diaId: string) => {
    setErrorValidacion(null)
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? {
              ...d,
              ejercicios: [
                ...d.ejercicios,
                { id: `e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, nombre: 'Nuevo ejercicio', series: 3, repeticiones: '12', tipoSerie: 'NORMAL', descansoSegundos: 60 },
              ],
            }
          : d
      )
    )
  }

  const agregarEjercicioDesdeVideoteca = (diaId: string, video: VideoTecnica) => {
    if (!video) return
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? {
              ...d,
              ejercicios: [
                ...d.ejercicios,
                {
                  id: `e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  nombre: video.titulo,
                  series: 3,
                  repeticiones: '10-12',
                  tipoSerie: 'NORMAL',
                  descansoSegundos: 60,
                  videoUrl: video.videoUrl || video.gifUrl,
                  gifUrl: video.gifUrl,
                },
              ],
            }
          : d
      )
    )
  }

  const actualizarNombreDia = (diaId: string, nuevoNombre: string) => {
    setErrorValidacion(null)
    setDias((prev) => prev.map((d) => (d.id === diaId ? { ...d, nombre: nuevoNombre } : d)))
  }

  const actualizarEjercicio = (diaId: string, ejId: string, campo: string, valor: any) => {
    setErrorValidacion(null)
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? {
              ...d,
              ejercicios: d.ejercicios.map((e) => (e.id === ejId ? { ...e, [campo]: valor } : e)),
            }
          : d
      )
    )
  }

  const eliminarEjercicio = (diaId: string, ejId: string) => {
    setErrorValidacion(null)
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? { ...d, ejercicios: d.ejercicios.filter((e) => e.id !== ejId) }
          : d
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setErrorValidacion('El nombre de la rutina es obligatorio.')
      return
    }
    if (dias.length === 0) {
      setErrorValidacion('Debe agregar al menos un día a la rutina.')
      return
    }
    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i]
      if (!dia.nombre.trim()) {
        setErrorValidacion(`El día ${i + 1} no tiene un nombre válido.`)
        return
      }
      if (dia.ejercicios.length === 0) {
        setErrorValidacion(`El día "${dia.nombre}" debe incluir al menos un ejercicio.`)
        return
      }
      for (const ej of dia.ejercicios) {
        if (!ej.nombre.trim()) {
          setErrorValidacion(`Todos los ejercicios deben tener un nombre asignado (revisá "${dia.nombre}").`)
          return
        }
      }
    }
    setErrorValidacion(null)
    onSave({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      objetivo,
      dias,
      esGenerica: true,
    })
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">Crear Nueva Rutina</h2>
            <p className="text-xs text-slate-500 mt-0.5">Definí el nombre general, los días y sus ejercicios</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rutina-nombre" className="block text-xs font-bold text-slate-700 mb-1.5">Nombre de la Rutina</label>
              <input
                id="rutina-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Hipertrofia 4 Días"
                required
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="rutina-objetivo" className="block text-xs font-bold text-slate-700 mb-1.5">Objetivo</label>
              <select
                id="rutina-objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Hipertrofia">Hipertrofia</option>
                <option value="Fuerza">Fuerza y Potencia</option>
                <option value="Adaptación">Adaptación / Principiante</option>
                <option value="Funcional">Funcional</option>
                <option value="Definición">Definición</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rutina-desc" className="block text-xs font-bold text-slate-700 mb-1.5">Descripción (opcional)</label>
            <input
              id="rutina-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Rutina de 4 días enfocada en sobrecarga progresiva"
              className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Días y Ejercicios */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Días de Entrenamiento ({dias.length})
              </span>
              <button
                type="button"
                onClick={agregarDia}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="size-3.5" /> Agregar Día
              </button>
            </div>

            <div className="space-y-4">
              {dias.map((dia, idx) => (
                <TarjetaDiaRutina
                  key={dia.id}
                  dia={dia}
                  idx={idx}
                  onAbrirBuscador={() => setDiaParaBuscar(dia.id)}
                  onActualizarNombre={(nombre) => actualizarNombreDia(dia.id, nombre)}
                  onAgregarEjercicio={() => agregarEjercicioADia(dia.id)}
                  onActualizarEjercicio={(ejId, campo, valor) => actualizarEjercicio(dia.id, ejId, campo, valor)}
                  onEliminarEjercicio={(ejId) => eliminarEjercicio(dia.id, ejId)}
                />
              ))}
            </div>
          </div>

          {errorValidacion && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorValidacion}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-[color,background-color] duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95"
            >
              Guardar Rutina
            </button>
          </div>
        </form>

        {diaParaBuscar && (
          <ModalBuscarEjercicioVideoteca
            diaNombre={dias.find((d) => d.id === diaParaBuscar)?.nombre}
            videosTecnica={videosTecnica}
            onSeleccionar={(video) => {
              agregarEjercicioDesdeVideoteca(diaParaBuscar, video)
            }}
            onClose={() => setDiaParaBuscar(null)}
          />
        )}
      </div>
    </div>
  )
}

// ---------- Subcomponente: Tarjeta de Día y Ejercicios ----------
function TarjetaDiaRutina({
  dia,
  idx,
  onAbrirBuscador,
  onActualizarNombre,
  onAgregarEjercicio,
  onActualizarEjercicio,
  onEliminarEjercicio,
}: {
  dia: DiaRutina
  idx: number
  onAbrirBuscador: () => void
  onActualizarNombre: (nombre: string) => void
  onAgregarEjercicio: () => void
  onActualizarEjercicio: (ejId: string, campo: string, valor: any) => void
  onEliminarEjercicio: (ejId: string) => void
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <input
          value={dia.nombre}
          onChange={(e) => onActualizarNombre(e.target.value)}
          placeholder={`Día ${idx + 1}`}
          className="font-bold text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onAbrirBuscador}
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Buscar en la videoteca de ejercicios"
          >
            <Search className="size-3.5 text-blue-600" />
            <span>Buscar en Videoteca</span>
          </button>
          <button
            type="button"
            onClick={onAgregarEjercicio}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            + Manual
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {dia.ejercicios.map((ej) => (
          <div key={ej.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2.5 shadow-sm">
            {/* Fila superior: Nombre del ejercicio y botón eliminar */}
            <div className="flex items-center gap-2">
              <input
                aria-label="Nombre del ejercicio"
                value={ej.nombre}
                onChange={(e) => onActualizarEjercicio(ej.id, 'nombre', e.target.value)}
                placeholder="Nombre del ejercicio..."
                className="flex-1 font-semibold outline-none text-slate-800 placeholder:text-slate-400 bg-slate-50/70 px-3 py-1.5 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={onAbrirBuscador}
                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors shrink-0"
                title="Buscar o sumar desde la videoteca"
                aria-label="Buscar en videoteca"
              >
                <Search className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onEliminarEjercicio(ej.id)}
                aria-label="Eliminar ejercicio"
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors shrink-0"
                title="Eliminar este ejercicio"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Fila inferior: Modalidad (Normal/Bi-serie/Drop set), Series, Reps, Descanso */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-slate-700">
              {/* Modalidad de serie */}
              <div className="flex items-center gap-1">
                <select
                  aria-label="Modalidad del ejercicio"
                  value={ej.tipoSerie || 'NORMAL'}
                  onChange={(e) => {
                    const nuevoTipo = e.target.value as 'NORMAL' | 'BI_SERIE' | 'DROP_SET'
                    onActualizarEjercicio(ej.id, 'tipoSerie', nuevoTipo)
                    if (nuevoTipo === 'BI_SERIE' && (!ej.repeticiones || ej.repeticiones === '10' || ej.repeticiones === '12')) {
                      onActualizarEjercicio(ej.id, 'repeticiones', '10 + 10')
                    } else if (nuevoTipo === 'DROP_SET' && (!ej.repeticiones || ej.repeticiones === '10' || ej.repeticiones === '12')) {
                      onActualizarEjercicio(ej.id, 'repeticiones', '8 + 8 + 8')
                    }
                  }}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                    ej.tipoSerie === 'BI_SERIE'
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : ej.tipoSerie === 'DROP_SET'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="BI_SERIE">⚡ Bi-serie</option>
                  <option value="DROP_SET">🔥 Drop Set</option>
                </select>
              </div>

              {/* Series */}
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Series:</span>
                <input
                  type="number"
                  min={1}
                  value={ej.series}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'series', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-9 text-center bg-white border border-slate-200 rounded py-0.5 font-mono font-bold text-slate-800"
                  title="Series"
                  aria-label="Series"
                />
              </div>

              {/* Reps */}
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 flex-1 min-w-[110px]">
                <span className="text-[10px] uppercase font-bold text-slate-500">Reps:</span>
                <input
                  value={ej.repeticiones}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'repeticiones', e.target.value)}
                  placeholder={ej.tipoSerie === 'BI_SERIE' ? '10 + 10' : ej.tipoSerie === 'DROP_SET' ? '8 + 8 + 8' : '10-12'}
                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono font-bold text-slate-800 text-center"
                  title="Repeticiones"
                  aria-label="Repeticiones"
                />
              </div>

              {/* Descanso */}
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0" title="Tiempo de descanso entre series">
                <Clock className="size-3 text-blue-500" />
                <select
                  aria-label="Tiempo de descanso"
                  value={ej.descansoSegundos ?? 60}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'descansoSegundos', parseInt(e.target.value, 10))}
                  className="text-[11px] font-mono font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                >
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s (1m)</option>
                  <option value={75}>75s</option>
                  <option value={90}>90s (1.5m)</option>
                  <option value={120}>120s (2m)</option>
                  <option value={150}>150s (2.5m)</option>
                  <option value={180}>180s (3m)</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Modal para Buscar y Seleccionar Ejercicios de la Videoteca ─────────────
function ModalBuscarEjercicioVideoteca({
  diaNombre,
  videosTecnica,
  onSeleccionar,
  onClose,
}: {
  diaNombre?: string
  videosTecnica: VideoTecnica[]
  onSeleccionar: (video: VideoTecnica) => void
  onClose: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebounce(busqueda, 250)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('TODOS')
  const [recientesAgregados, setRecientesAgregados] = useState<Record<string, boolean>>({})
  const [contadorAgregados, setContadorAgregados] = useState(0)
  const [ejerciciosApi, setEjerciciosApi] = useState<VideoTecnica[]>(() => CLASICOS_CURADOS)
  const [totalApi, setTotalApi] = useState(1500)
  const [cargandoApi, setCargandoApi] = useState(false)

  const GRUPOS = ['TODOS', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']

  useEscapeKey(onClose)

  useEffect(() => {
    let cancelado = false
    setCargandoApi(true)

    const params = new URLSearchParams()
    if (grupoSeleccionado !== 'TODOS') params.set('grupo', grupoSeleccionado)
    if (busquedaDebounced.trim()) params.set('q', busquedaDebounced.trim())
    params.set('limit', '60')

    fetch(`/api/ejercicios?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado) {
          setEjerciciosApi(data.ejercicios || [])
          if (data.total) setTotalApi(data.total)
          setCargandoApi(false)
        }
      })
      .catch(() => {
        if (!cancelado) setCargandoApi(false)
      })

    return () => {
      cancelado = true
    }
  }, [grupoSeleccionado, busquedaDebounced])

  const ejerciciosFiltrados = useMemo(() => {
    const videosCoachFiltrados = videosTecnica.filter((v) => {
      if (v.id.startsWith('cat-') || v.id.startsWith('ex-')) return false
      if (grupoSeleccionado !== 'TODOS' && v.grupoMuscular !== grupoSeleccionado) return false
      if (!busquedaDebounced.trim()) return true
      return v.titulo.toLowerCase().includes(busquedaDebounced.toLowerCase())
    })

    const idsCoach = new Set(videosCoachFiltrados.map((v) => v.id))
    const apiSinDuplicados = ejerciciosApi.filter((e) => !idsCoach.has(e.id))

    return [...videosCoachFiltrados, ...apiSinDuplicados]
  }, [videosTecnica, ejerciciosApi, grupoSeleccionado, busquedaDebounced])

  const visibles = useMemo(() => ejerciciosFiltrados.slice(0, 60), [ejerciciosFiltrados])

  const handleAgregar = (video: VideoTecnica) => {
    onSeleccionar(video)
    setContadorAgregados((prev) => prev + 1)
    setRecientesAgregados((prev) => ({ ...prev, [video.id]: true }))
    setTimeout(() => {
      setRecientesAgregados((prev) => ({ ...prev, [video.id]: false }))
    }, 1800)
  }

  const totalGeneral = useMemo(() => {
    const coachCount = videosTecnica.filter((v) => !v.id.startsWith('cat-') && !v.id.startsWith('ex-')).length
    return totalApi + coachCount
  }, [totalApi, videosTecnica])

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">Videoteca de Ejercicios</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {totalGeneral.toLocaleString('es-AR')} ejercicios
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {diaNombre ? `Agregando a: ${diaNombre}` : 'Buscá por nombre o grupo muscular para sumarlo a la rutina'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar buscador"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Buscador y Filtros */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribí para buscar (ej: press banca, sentadilla, curl, dominadas, triceps)..."
              className="w-full pl-10 pr-9 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-medium rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Chips de Grupo Muscular */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {GRUPOS.map((grupo) => {
              const activo = grupoSeleccionado === grupo
              return (
                <button
                  key={grupo}
                  type="button"
                  onClick={() => setGrupoSeleccionado(grupo)}
                  className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                    activo
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {grupo === 'TODOS' ? 'Todos los grupos' : grupo}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
          {visibles.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="size-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">No encontramos ejercicios coincidentes</p>
                <p className="text-xs text-slate-500 mt-1">
                  Probá buscando con otra palabra clave o limpiando el filtro de grupo muscular.
                </p>
              </div>
              {(busqueda || grupoSeleccionado !== 'TODOS') && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('')
                    setGrupoSeleccionado('TODOS')
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            visibles.map((ejercicio) => {
              const agregado = recientesAgregados[ejercicio.id]
              return (
                <div
                  key={ejercicio.id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-blue-50/50 p-2 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ejercicio.gifUrl || ejercicio.videoUrl}
                      alt={ejercicio.titulo}
                      className="size-14 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {ejercicio.grupoMuscular}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {ejercicio.nivel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate mt-1">
                        {ejercicio.titulo}
                      </h4>
                      {ejercicio.descripcion && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {ejercicio.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAgregar(ejercicio)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-[background-color,transform,color] active:scale-95 ${
                      agregado
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                    }`}
                  >
                    {agregado ? (
                      <>
                        <Check className="size-3.5" />
                        <span>Agregado</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        <span>Agregar</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}

          {ejerciciosFiltrados.length > 60 && (
            <div className="text-center py-3 text-xs text-slate-400 font-medium">
              Mostrando los primeros 60 de {totalGeneral.toLocaleString('es-AR')} ejercicios. Escribí más letras para afinar la búsqueda.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            {contadorAgregados > 0 ? (
              <span className="text-emerald-700 font-bold">
                ✓ {contadorAgregados} ejercicio{contadorAgregados > 1 ? 's' : ''} sumado{contadorAgregados > 1 ? 's' : ''} {diaNombre ? `a ${diaNombre}` : 'a la rutina'}
              </span>
            ) : cargandoApi ? (
              <span className="text-blue-600 font-medium">Buscando ejercicios en catálogo...</span>
            ) : (
              `${totalGeneral.toLocaleString('es-AR')} ejercicios disponibles en videoteca`
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            Listo, volver a la rutina
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de Video de Técnica ───────────────────────────────────────────────
function ModalVideoTecnica({ video, onClose }: { video: VideoTecnica; onClose: () => void }) {
  const embedUrl = video.videoUrl.includes('embed')
    ? video.videoUrl
    : video.videoUrl.replace('watch?v=', 'embed/')
  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{video.grupoMuscular} · {video.nivel}</p>
            <h3 className="text-base font-bold text-white mt-0.5">{video.titulo}</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
            <X className="size-5" />
          </button>
        </div>

        {/* Visualizador de técnica: GIF en loop continuo o iframe de YouTube */}
        {video.gifUrl || video.formato === 'GIF' ? (
          <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.gifUrl || video.videoUrl}
              alt={`Técnica de ${video.titulo}`}
              className="max-h-full max-w-full object-contain mx-auto"
              loading="lazy"
            />
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-mono font-bold text-blue-400 border border-slate-800 backdrop-blur-sm">
              ⚡ Loop continuo
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title={video.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Descripción y tips */}
        <div className="px-5 py-4 space-y-3">
          {video.descripcion && (
            <p className="text-xs text-slate-400 leading-relaxed">{video.descripcion}</p>
          )}
          {video.consejosClave && video.consejosClave.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Tips de técnica</p>
              <ul className="space-y-1.5">
                {video.consejosClave.map((tip) => (
                  <li key={tip.slice(0, 40)} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check className="size-3.5 text-blue-400 mt-0.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subcomponentes de Tarjeta Desplegable ─────────────────────────────────
function BadgeEstadoEjercicio({
  todasCompletas,
  seriesCompletas,
  totalSeries,
}: {
  todasCompletas: boolean
  seriesCompletas: number
  totalSeries: number
}) {
  if (todasCompletas) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        <Check className="size-3 text-emerald-400" strokeWidth={3} />
        Completado
      </span>
    )
  }
  if (seriesCompletas > 0) {
    return (
      <span className="text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
        {seriesCompletas}/{totalSeries} series
      </span>
    )
  }
  return (
    <span className="text-[11px] font-medium text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
      {totalSeries} series
    </span>
  )
}

function TablaSeries({
  seriesData,
  sesionPrevia,
  onCambioSerie,
  onToggleCompletada,
}: {
  seriesData: RegistroSerie[]
  sesionPrevia: SesionEjercicio | undefined
  onCambioSerie: (numSerie: number, campo: 'kg' | 'reps', valor: number) => void
  onToggleCompletada: (numSerie: number) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80">
      {/* Header de tabla */}
      <div className="grid grid-cols-[36px_1fr_70px_60px_40px] gap-1 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span className="text-center">Serie</span>
        <span>Previa</span>
        <span className="text-center">KG</span>
        <span className="text-center">REPS</span>
        <span className="text-center">✓</span>
      </div>

      {/* Filas de series */}
      {seriesData.map((serie) => {
        const previaData = sesionPrevia?.series.find((s) => s.serieNumero === serie.serieNumero)
        return (
          <div
            key={serie.serieNumero}
            className={`grid grid-cols-[36px_1fr_70px_60px_40px] gap-1 items-center px-3 py-2.5 border-b border-slate-800/50 last:border-0 transition-colors duration-150 ${
              serie.completada ? 'bg-blue-600/10' : ''
            }`}
          >
            {/* Número de serie */}
            <span className={`text-sm font-black text-center ${serie.completada ? 'text-blue-400' : 'text-slate-400'}`}>
              {serie.serieNumero}
            </span>

            {/* Previa */}
            <div className="truncate pr-1">
              {previaData && typeof previaData.kg === 'number' && typeof previaData.reps === 'number' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-xs font-mono font-bold text-slate-200 shadow-sm">
                  <span className="text-blue-400 font-extrabold">{previaData.kg}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">kg</span>
                  <span className="text-slate-500 font-sans mx-0.5 font-bold">×</span>
                  <span className="text-blue-400 font-extrabold">{previaData.reps}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">reps</span>
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-600 px-2 font-bold select-none">—</span>
              )}
            </div>

            {/* Input KG */}
            <input
              type="number"
              min={0}
              step={0.5}
              value={serie.kg || ''}
              onChange={(e) => onCambioSerie(serie.serieNumero, 'kg', parseFloat(e.target.value) || 0)}
              aria-label={`KG serie ${serie.serieNumero}`}
              className="w-full text-center bg-slate-800/90 border border-slate-700 text-white font-mono font-bold text-sm rounded-lg px-1 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Input REPS */}
            <input
              type="number"
              min={0}
              value={serie.reps || ''}
              onChange={(e) => onCambioSerie(serie.serieNumero, 'reps', parseInt(e.target.value, 10) || 0)}
              aria-label={`Reps serie ${serie.serieNumero}`}
              className="w-full text-center bg-slate-800/90 border border-slate-700 text-white font-mono font-bold text-sm rounded-lg px-1 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Checkbox de completado */}
            <button
              type="button"
              onClick={() => onToggleCompletada(serie.serieNumero)}
              aria-label={serie.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
              className={`size-7 rounded-full flex items-center justify-center mx-auto transition-[background-color,border-color] duration-150 border-2 ${
                serie.completada
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/40'
                  : 'bg-transparent border-slate-600 hover:border-slate-400 text-transparent'
              }`}
            >
              {serie.completada && <Check className="size-3.5" strokeWidth={3} />}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Tarjeta de Ejercicio Desplegable (Acordeón / Cortina) ───────────────────
function TarjetaEjercicioAlumno({
  ejercicio,
  index,
  seriesData,
  sesionPrevia,
  videos,
  onChange,
}: {
  ejercicio: Ejercicio
  index: number
  seriesData: RegistroSerie[]
  sesionPrevia: SesionEjercicio | undefined
  videos: VideoTecnica[]
  onChange: (series: RegistroSerie[]) => void
}) {
  const [expandido, setExpandido] = useState(index === 0)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const [videoApi, setVideoApi] = useState<VideoTecnica | null>(null)
  const videoMatch = useMemo(() => buscarVideoParaEjercicio(ejercicio.nombre, videos) || videoApi || undefined, [ejercicio.nombre, videos, videoApi])

  useEffect(() => {
    if (!buscarVideoParaEjercicio(ejercicio.nombre, videos) && ejercicio.nombre) {
      let cancelado = false
      fetch(`/api/ejercicios?q=${encodeURIComponent(ejercicio.nombre)}&limit=1`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelado && d.ejercicios && d.ejercicios.length > 0) {
            setVideoApi(d.ejercicios[0])
          }
        })
        .catch(() => {})
      return () => {
        cancelado = true
      }
    }
  }, [ejercicio.nombre, videos])

  const seriesCompletas = seriesData.filter((s) => s.completada).length
  const todasCompletas = seriesCompletas === ejercicio.series && ejercicio.series > 0

  const handleCambioSerie = useCallback(
    (numSerie: number, campo: 'kg' | 'reps', valor: number) => {
      const actualizadas = seriesData.map((s) =>
        s.serieNumero === numSerie ? { ...s, [campo]: valor } : s
      )
      onChange(actualizadas)
    },
    [seriesData, onChange]
  )

  const toggleCompletada = useCallback(
    (numSerie: number) => {
      const actualizadas = seriesData.map((s) =>
        s.serieNumero === numSerie ? { ...s, completada: !s.completada } : s
      )
      onChange(actualizadas)
    },
    [seriesData, onChange]
  )

  const contenedorClass = todasCompletas
    ? 'border-emerald-500/40 bg-slate-950/90'
    : expandido
    ? 'border-blue-600/50 bg-slate-950'
    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'

  const numeroClass = todasCompletas
    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    : expandido
    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
    : 'bg-blue-600/15 text-blue-400 border border-blue-600/20'

  return (
    <>
      <div className={`rounded-2xl border bg-slate-950 transition-[border-color,background-color] duration-200 overflow-hidden ${contenedorClass}`}>
        {/* Cabecera clickeable (Interruptor de Cortina) */}
        <button
          type="button"
          onClick={() => setExpandido((prev) => !prev)}
          aria-expanded={expandido}
          className="w-full p-4 md:p-5 flex items-center justify-between gap-3 text-left transition-[background-color] duration-150 hover:bg-slate-900/40 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Número del ejercicio */}
            <span className={`size-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 transition-colors duration-200 ${numeroClass}`}>
              {String(index + 1).padStart(2, '0')}
            </span>

            {/* Nombre y Badges de estado */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">{ejercicio.nombre}</h3>
                {ejercicio.tipoSerie === 'BI_SERIE' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/35 shadow-sm">
                    ⚡ Bi-serie
                  </span>
                )}
                {ejercicio.tipoSerie === 'DROP_SET' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm">
                    🔥 Drop Set
                  </span>
                )}
                <BadgeEstadoEjercicio
                  todasCompletas={todasCompletas}
                  seriesCompletas={seriesCompletas}
                  totalSeries={ejercicio.series}
                />
              </div>
            </div>
          </div>

          {/* Lateral derecho: Descanso y Chevron */}
          <div className="flex items-center gap-3 shrink-0">
            {ejercicio.descansoSegundos ? (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-sm" title={`Descanso sugerido entre series: ${ejercicio.descansoSegundos} segundos`}>
                <Clock className="size-3 text-blue-400" />
                {ejercicio.descansoSegundos}s descanso
              </span>
            ) : null}
            <div
              className={`size-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                expandido ? 'rotate-180 text-blue-400 border-blue-500/30' : ''
              }`}
            >
              <ChevronDown className="size-4" />
            </div>
          </div>
        </button>

        {/* Contenido desplegable (Cuerpo de la Cortina) */}
        {expandido && (
          <div className="p-4 md:p-5 pt-0 space-y-4 border-t border-slate-800/50 mt-1 animate-in fade-in duration-200">
            {/* Notas y descanso mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3">
              {ejercicio.notas ? (
                <p className="text-xs text-slate-400 italic">💡 {ejercicio.notas}</p>
              ) : (
                <span />
              )}
              {ejercicio.descansoSegundos ? (
                <span className="sm:hidden flex items-center gap-1.5 text-[11px] font-bold text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700/80 w-fit shadow-sm">
                  <Clock className="size-3 text-blue-400" />
                  Descanso: {ejercicio.descansoSegundos}s
                </span>
              ) : null}
            </div>

            {/* Tabla de series */}
            <TablaSeries
              seriesData={seriesData}
              sesionPrevia={sesionPrevia}
              onCambioSerie={handleCambioSerie}
              onToggleCompletada={toggleCompletada}
            />

            {/* Botón ver técnica */}
            {videoMatch && (
              <button
                type="button"
                onClick={() => setVideoAbierto(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:border-blue-600/50 hover:text-blue-400 hover:bg-blue-600/5 transition-[color,background-color,border-color] duration-200 text-xs font-bold"
              >
                <PlayCircle className="size-4" />
                Ver técnica del ejercicio
              </button>
            )}
          </div>
        )}
      </div>

      {videoAbierto && videoMatch && (
        <ModalVideoTecnica video={videoMatch} onClose={() => setVideoAbierto(false)} />
      )}
    </>
  )
}

// ── Modal de Confirmación de Entreno Incompleto ──────────────────────────────
function ModalConfirmarIncompleto({
  completados,
  totalEjercicios,
  seriesCompletadas,
  totalSeries,
  onConfirmar,
  onClose,
}: {
  completados: number
  totalEjercicios: number
  seriesCompletadas: number
  totalSeries: number
  onConfirmar: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <AlertCircle className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">¿Guardar entrenamiento incompleto?</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Completaste <strong className="text-amber-300 font-bold">{completados} de {totalEjercicios}</strong> ejercicios ({seriesCompletadas} de {totalSeries} series).
            </p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Se guardará el registro de las series que ya realizaste para que la próxima vez figuren en tu columna de <strong className="text-slate-200">Previa</strong> y no pierdas tu avance de hoy.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-[color,background-color] duration-150"
          >
            Seguir entrenando
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmar()
              onClose()
            }}
            className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-[color,background-color,box-shadow,transform] duration-150 active:scale-95"
          >
            Guardar progreso parcial
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estado cuando el Alumno no tiene Rutina Asignada ─────────────────────────
function EstadoSinRutina({ usuario }: { usuario: any }) {
  const nombre = usuario?.nombre ? usuario.nombre.split(' ')[0] : 'Alumno'
  const mensajeWhatsapp = encodeURIComponent(
    `Hola! Soy ${usuario?.nombre || 'alumno'} de ATLAS Gym. Quería consultar con un coach sobre la asignación de mi rutina de entrenamiento.`
  )

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[650px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl border border-blue-500/20 bg-blue-600/10 text-blue-400 shadow-xl shadow-blue-950/20">
        <Dumbbell className="size-10" />
      </div>

      <span className="mb-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
        Portal del Alumno
      </span>

      <h1 className="text-2xl font-black text-white sm:text-3xl">
        Aún no tenés una rutina asignada
      </h1>

      <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
        Hola, <strong className="text-white">{nombre}</strong>. Tu coach de ATLAS Gym está preparando tu plan personalizado acorde a tus objetivos y nivel.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        <a
          href={`${CONTACTO_ATLAS.whatsappUrl}?text=${mensajeWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-[color,background-color,transform] duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          <WhatsAppIcon className="w-5 h-5 fill-white" />
          Consultar a mi coach por WhatsApp
        </a>
        <Link
          href="/videoteca"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-6 py-3 text-sm font-bold text-slate-200 transition-colors"
        >
          Explorar Videoteca
        </Link>
      </div>
    </div>
  )
}

// ── Vista dedicada para el Alumno en Rutinas ────────────────────────────────
function VistaMiRutinaAlumno({ rutina, usuario }: { rutina: Rutina; usuario: any }) {
  const { guardarSesion, getUltimaSesion, getSesionHoy, videosTecnica } = useAppData()
  const [diaActivo, setDiaActivo] = useState(0)

  const dia = rutina.dias[diaActivo] ?? rutina.dias[0]

  // Sesión guardada hoy (si existe, para recuperar progreso en curso)
  const sesionHoy = useMemo(
    () => (dia ? getSesionHoy(usuario.alumnoId || 'a1', rutina.id, dia.id) : undefined),
    [dia, getSesionHoy, usuario.alumnoId, rutina.id]
  )

  // Sesión previa (anterior a hoy) para referencia histórica
  const sesionPrevia = useMemo(
    () => (dia ? getUltimaSesion(usuario.alumnoId || 'a1', rutina.id, dia.id) : undefined),
    [dia, getUltimaSesion, usuario.alumnoId, rutina.id]
  )

  const [guardado, setGuardado] = useState(() => !!sesionHoy)
  const [modalIncompletoAbierto, setModalIncompletoAbierto] = useState(false)

  // Estado local de las series del día:
  // Si ya se guardó progreso hoy, rehidrata los valores y el estado de completado.
  // Si no, usa la sesión previa como referencia sin marcar completado.
  const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<Record<string, RegistroSerie[]>>(() => {
    if (!dia) return {}
    return inicializarSeriesDia(dia.ejercicios, sesionHoy, sesionPrevia)
  })

  // Reinicializar series cuando cambia el día activo
  const handleCambioDia = useCallback(
    (index: number) => {
      setDiaActivo(index)
      const nuevoDia = rutina.dias[index]
      if (!nuevoDia) return
      const hoyDia = getSesionHoy(usuario.alumnoId || 'a1', rutina.id, nuevoDia.id)
      const prevDia = getUltimaSesion(usuario.alumnoId || 'a1', rutina.id, nuevoDia.id)
      setGuardado(!!hoyDia)
      setSeriesPorEjercicio(inicializarSeriesDia(nuevoDia.ejercicios, hoyDia, prevDia))
    },
    [rutina, getSesionHoy, getUltimaSesion, usuario.alumnoId]
  )

  const handleChangeSeries = useCallback((ejercicioId: string, series: RegistroSerie[]) => {
    setSeriesPorEjercicio((prev) => ({ ...prev, [ejercicioId]: series }))
    setGuardado(false)
  }, [])

  // Progreso de ejercicios del día
  const { completados, total } = useMemo(() => {
    if (!dia) return { completados: 0, total: 0 }
    let completados = 0
    dia.ejercicios.forEach((ej) => {
      const series = seriesPorEjercicio[ej.id] ?? []
      if (series.length > 0 && series.every((s) => s.completada)) completados++
    })
    return { completados, total: dia.ejercicios.length }
  }, [dia, seriesPorEjercicio])

  // Conteo total de series completadas vs totales
  const seriesTotales = useMemo(() => {
    if (!dia) return { completadas: 0, total: 0 }
    let completadas = 0
    let totalSeries = 0
    dia.ejercicios.forEach((ej) => {
      totalSeries += ej.series
      const series = seriesPorEjercicio[ej.id] ?? []
      completadas += series.filter((s) => s.completada).length
    })
    return { completadas, total: totalSeries }
  }, [dia, seriesPorEjercicio])

  const ejecutarGuardado = useCallback(() => {
    if (!dia || !usuario.alumnoId) return
    const ejerciciosSesion: SesionEjercicio[] = dia.ejercicios.map((ej) => ({
      ejercicioId: ej.id,
      series: seriesPorEjercicio[ej.id] ?? [],
    }))
    guardarSesion({
      alumnoId: usuario.alumnoId,
      rutinaId: rutina.id,
      diaId: dia.id,
      fecha: fechaLocalHoy(),
      ejercicios: ejerciciosSesion,
    })
    setGuardado(true)
  }, [dia, seriesPorEjercicio, guardarSesion, usuario.alumnoId, rutina.id])

  const handleGuardar = useCallback(() => {
    if (!dia) return
    const incompleto = completados < total
    if (incompleto) {
      setModalIncompletoAbierto(true)
    } else {
      ejecutarGuardado()
    }
  }, [dia, completados, total, ejecutarGuardado])

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500 mb-1">
          Mi Entrenamiento Asignado
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {rutina.nombre}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {rutina.descripcion || 'Plan de entrenamiento personalizado diseñado por tus profesores.'}
        </p>
      </div>

      {/* Selector de Días */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rutina.dias.map((d, index) => (
          <button
            key={d.id}
            onClick={() => handleCambioDia(index)}
            className={`px-5 py-3 rounded-2xl text-sm font-bold transition-[color,background-color,box-shadow] duration-200 active:scale-95 shrink-0 ${
              diaActivo === index
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {d.nombre}
          </button>
        ))}
      </div>

      {/* Panel del día activo */}
      {dia && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl space-y-6">
          {/* Header con progreso */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-white">{dia.nombre}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{dia.ejercicios.length} ejercicios para hoy</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${completados === total && total > 0 ? 'text-blue-400' : 'text-white'}`}>
                {completados}/{total}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">completados</p>
            </div>
          </div>

          {/* Barra de progreso */}
          {total > 0 && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-[width] duration-500"
                style={{ width: `${(completados / total) * 100}%` }}
              />
            </div>
          )}

          {/* Lista de ejercicios desplegables (cortinas) */}
          <div className="flex flex-col gap-3.5">
            {dia.ejercicios.map((ej, i) => (
              <TarjetaEjercicioAlumno
                key={ej.id}
                ejercicio={ej}
                index={i}
                seriesData={seriesPorEjercicio[ej.id] ?? []}
                sesionPrevia={sesionPrevia?.ejercicios.find((e) => e.ejercicioId === ej.id)}
                videos={videosTecnica}
                onChange={(series) => handleChangeSeries(ej.id, series)}
              />
            ))}
          </div>

          {/* Botón Guardar Entreno */}
          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleGuardar}
              className={`inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95 ${
                guardado
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:-translate-y-0.5'
              }`}
            >
              {guardado ? (
                <>
                  <CheckCircle2 className="size-4" />
                  {completados === total && total > 0
                    ? '¡Entrenamiento completado! 🎉'
                    : '¡Progreso parcial guardado!'}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {completados === total && total > 0
                    ? 'Finalizar y Guardar Entreno'
                    : 'Guardar Entreno'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación para guardado parcial / incompleto */}
      {modalIncompletoAbierto && dia && (
        <ModalConfirmarIncompleto
          completados={completados}
          totalEjercicios={total}
          seriesCompletadas={seriesTotales.completadas}
          totalSeries={seriesTotales.total}
          onConfirmar={ejecutarGuardado}
          onClose={() => setModalIncompletoAbierto(false)}
        />
      )}
    </div>
  )
}
