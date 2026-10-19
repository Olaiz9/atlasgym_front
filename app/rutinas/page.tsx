'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import { Rutina, DiaRutina, Ejercicio, Alumno, RegistroSerie, SesionEjercicio, SesionEntrenamiento, VideoTecnica, TipoSerieEjercicio } from '@/lib/types'
import { buscarVideoParaEjercicio, formatPrevia, obtenerBorradorEntrenamiento, limpiarBorradoresObsoletos, getClaveBorradorEntrenamiento, detectarConflictosAsignacionRutina } from '@/lib/rutina-utils'
import { CONTACTO_ATLAS } from '@/lib/constants'
import { fechaLocalHoy } from '@/lib/date-utils'
import { reproducirSonidoFinDescanso } from '@/lib/asistencia-utils'
import {
  Dumbbell,
  Plus,
  Edit3,
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
  Play,
  Pause,
  RotateCcw,
  Volume2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useEscapeKey } from '@/lib/use-escape-key'
import { Tooltip } from '@/components/ui/tooltip'

const OBJETIVOS = ['TODOS', 'Hipertrofia', 'Fuerza', 'Adaptación', 'Funcional']

export default function RutinasPage() {
  const { rutinas, alumnos, videosTecnica, usuarioActual, agregarRutina, actualizarRutina, asignarRutinaAAlumno, eliminarRutina, getRutinaDeAlumno } =
    useAppData()
  const { toast } = useToast()

  const [filtroObjetivo, setFiltroObjetivo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [rutinaAEditar, setRutinaAEditar] = useState<Rutina | null>(null)
  const [rutinaAAsignar, setRutinaAAsignar] = useState<Rutina | null>(null)
  const [rutinaAEliminar, setRutinaAEliminar] = useState<Rutina | null>(null)
  const [diaExpandido, setDiaExpandido] = useState<Record<string, boolean>>({})

  useEscapeKey(() => {
    if (modalNuevaAbierto) setModalNuevaAbierto(false)
    if (rutinaAEditar) setRutinaAEditar(null)
    if (rutinaAAsignar) setRutinaAAsignar(null)
    if (rutinaAEliminar) setRutinaAEliminar(null)
  }, modalNuevaAbierto || !!rutinaAEditar || !!rutinaAAsignar || !!rutinaAEliminar)

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
            Rutinas y entrenamientos
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
          Nueva rutina
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
                      onClick={() => setRutinaAEditar(rutina)}
                      title="Editar rutina"
                      aria-label={`Editar rutina ${rutina.nombre}`}
                      className="text-slate-500 hover:text-blue-400 transition-colors p-1 cursor-pointer"
                    >
                      <Edit3 className="size-4" />
                    </button>
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
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-slate-300 font-medium truncate">
                                    • {ej.nombre}
                                  </span>
                                  {ej.tipoSerie === 'BI_SERIE' && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                      Bi-serie
                                    </span>
                                  )}
                                  {ej.tipoSerie === 'DROP_SET' && (
                                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
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
                  Asignar a alumno
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
          rutinas={rutinas}
          alumnos={alumnos}
          onClose={() => setRutinaAAsignar(null)}
          onConfirm={(alumnoIds) => {
            alumnoIds.forEach((id) => asignarRutinaAAlumno(rutinaAAsignar.id, id))
            if (alumnoIds.length === 1) {
              const al = alumnos.find((a) => a.id === alumnoIds[0])
              toast(`Rutina asignada a ${al?.nombre || 'alumno'}`, 'success')
            } else {
              toast(`Rutina asignada a ${alumnoIds.length} alumnos con éxito`, 'success')
            }
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

      {/* Modal: Crear o Editar Rutina */}
      {(modalNuevaAbierto || rutinaAEditar) && (
        <ModalNuevaRutina
          rutinaAEditar={rutinaAEditar}
          videosTecnica={videosTecnica}
          onClose={() => {
            setModalNuevaAbierto(false)
            setRutinaAEditar(null)
          }}
          onSave={(datos) => {
            if (rutinaAEditar) {
              actualizarRutina(rutinaAEditar.id, datos)
              toast(`Rutina "${datos.nombre}" actualizada con éxito`, 'success')
              setRutinaAEditar(null)
            } else {
              const r = agregarRutina(datos)
              toast(`Rutina "${r.nombre}" creada exitosamente`, 'success')
              setModalNuevaAbierto(false)
            }
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
  rutinas,
  alumnos,
  onClose,
  onConfirm,
}: {
  rutina: Rutina
  rutinas: Rutina[]
  alumnos: Alumno[]
  onClose: () => void
  onConfirm: (alumnoIds: string[]) => void
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [mostrarConfirmacionReemplazo, setMostrarConfirmacionReemplazo] = useState(false)

  const conflictos = useMemo(() => {
    return detectarConflictosAsignacionRutina(seleccionados, rutinas, alumnos, rutina.id)
  }, [seleccionados, rutinas, alumnos, rutina.id])

  const alumnosFiltrados = alumnos.filter((a) => {
    if (!busquedaAlumno.trim()) return true
    const q = busquedaAlumno.trim().toLowerCase()
    return a.nombre.toLowerCase().includes(q) || (a.dni && a.dni.includes(q))
  })

  const toggleAlumno = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (seleccionados.length === 0) return

    // Si algún alumno seleccionado ya tiene otra rutina asignada, pedimos confirmación explícita
    if (conflictos.length > 0 && !mostrarConfirmacionReemplazo) {
      setMostrarConfirmacionReemplazo(true)
      return
    }

    onConfirm(seleccionados)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-white">
              {mostrarConfirmacionReemplazo ? 'Aviso de reasignación' : 'Asignar rutina'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mostrarConfirmacionReemplazo
                ? 'Algunos alumnos ya tienen otra rutina asignada'
                : 'Seleccioná uno o más alumnos'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mostrarConfirmacionReemplazo ? (
          <div className="space-y-4 flex flex-col min-h-0 flex-1">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertCircle className="size-4 shrink-0 text-amber-400" />
                <span>Atención: Sobreescritura de rutina</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Los siguientes alumnos ya cuentan con un plan de entrenamiento activo y se les reemplazará por <strong>{rutina.nombre}</strong>:
              </p>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {conflictos.map((c) => (
                  <div
                    key={c.alumnoId}
                    className="p-2 rounded-xl bg-slate-950/70 border border-amber-500/20 text-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-bold truncate">{c.alumnoNombre}</span>
                    <span className="text-[10px] text-amber-400/90 truncate shrink-0">
                      Actual: {c.rutinaAnteriorNombre}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              ¿Deseás confirmar el cambio y asignar esta nueva rutina a todos los alumnos seleccionados?
            </p>

            <div className="flex justify-end gap-3 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionReemplazo(false)}
                className="h-10 rounded-xl border border-slate-700 bg-slate-800/50 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Volver a la lista
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(seleccionados)
                  onClose()
                }}
                className="h-10 rounded-xl bg-amber-600 px-5 text-xs font-bold text-white shadow-lg shadow-amber-600/25 hover:bg-amber-500 transition-all active:scale-95"
              >
                Sí, reemplazar y asignar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col min-h-0 flex-1">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 shrink-0">
              <p className="font-bold text-slate-400">Rutina seleccionada:</p>
              <p className="text-sm font-extrabold text-blue-400 mt-0.5">{rutina.nombre}</p>
              <p className="text-[11px] text-blue-300/80 mt-1">{rutina.dias.length} días de entrenamiento</p>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busquedaAlumno}
                onChange={(e) => setBusquedaAlumno(e.target.value)}
                placeholder="Buscar alumno por nombre o DNI..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 space-y-1 border border-slate-800 rounded-xl p-2 max-h-[280px]">
              {alumnosFiltrados.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No se encontraron alumnos</p>
              ) : (
                alumnosFiltrados.map((a) => {
                  const checked = seleccionados.includes(a.id)
                  const yaAsignada = a.rutinaId === rutina.id
                  const tieneOtraRutina = a.rutinaId && a.rutinaId !== rutina.id
                  const nombreOtraRutina = tieneOtraRutina
                    ? rutinas.find((r) => r.id === a.rutinaId)?.nombre || 'Otra rutina'
                    : null

                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        checked
                          ? 'bg-blue-600/20 border border-blue-500/40'
                          : 'hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAlumno(a.id)}
                        className="size-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{a.nombre}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {a.plan}
                          {yaAsignada && ' — Ya tiene esta rutina'}
                          {tieneOtraRutina && ` — Tiene: ${nombreOtraRutina}`}
                        </p>
                      </div>
                      {tieneOtraRutina && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          Tiene rutina
                        </span>
                      )}
                      {checked && <Check className="size-4 text-blue-400 shrink-0" />}
                    </label>
                  )
                })
              )}
            </div>

            {seleccionados.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-400 shrink-0 px-1">
                <span>
                  {seleccionados.length} {seleccionados.length === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
                </span>
                {conflictos.length > 0 && (
                  <span className="text-amber-400 font-medium">
                    ⚠️ {conflictos.length} con rutina previa
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-[color,background-color] duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={seleccionados.length === 0}
                className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {conflictos.length > 0 ? 'Continuar asignación' : 'Confirmar asignación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------- Modal: Crear o Editar Rutina ----------
function ModalNuevaRutina({
  rutinaAEditar,
  videosTecnica,
  onClose,
  onSave,
}: {
  rutinaAEditar?: Rutina | null
  videosTecnica: VideoTecnica[]
  onClose: () => void
  onSave: (rutina: Omit<Rutina, 'id'>) => void
}) {
  const esEdicion = !!rutinaAEditar
  const [nombre, setNombre] = useState(rutinaAEditar?.nombre || '')
  const [descripcion, setDescripcion] = useState(rutinaAEditar?.descripcion || '')
  const [objetivo, setObjetivo] = useState(rutinaAEditar?.objetivo || 'Hipertrofia')
  const [diaParaBuscar, setDiaParaBuscar] = useState<string | null>(null)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)
  const [dias, setDias] = useState<DiaRutina[]>(() => {
    if (rutinaAEditar && rutinaAEditar.dias.length > 0) {
      return rutinaAEditar.dias.map((d) => ({
        ...d,
        ejercicios: d.ejercicios.map((e) => ({ ...e })),
      }))
    }
    return [
      {
        id: 'd-1',
        nombre: 'Día 1 — Pecho y Tríceps',
        ejercicios: [
          { id: 'e-1', nombre: 'Press Banca Plano', series: 4, repeticiones: '10', tipoSerie: 'NORMAL', descansoSegundos: 90 },
          { id: 'e-2', nombre: 'Aperturas con Mancuernas', series: 3, repeticiones: '12', tipoSerie: 'NORMAL', descansoSegundos: 60 },
        ],
      },
    ]
  })


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

  const agregarEjercicioDesdeVideoteca = (diaId: string, videoTitulo: string) => {
    if (!videoTitulo) return
    const video = videosTecnica.find((v) => v.titulo.toLowerCase() === videoTitulo.toLowerCase())
    const nombreEj = video?.titulo || videoTitulo
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? {
              ...d,
              ejercicios: [
                ...d.ejercicios,
                {
                  id: `e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  nombre: nombreEj,
                  series: 3,
                  repeticiones: '10-12',
                  tipoSerie: 'NORMAL',
                  descansoSegundos: 60,
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
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-3xl shadow-2xl text-slate-100 border border-slate-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-white">
              {esEdicion ? 'Editar rutina' : 'Crear nueva rutina'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {esEdicion
                ? 'Los cambios se reflejarán automáticamente en todos los alumnos que la tengan asignada.'
                : 'Definí el nombre general, los días y sus ejercicios'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white rounded-full p-1.5 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rutina-nombre" className="block text-xs font-bold text-slate-400 mb-1.5">Nombre de la rutina</label>
              <input
                id="rutina-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Hipertrofia 4 Días"
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="rutina-objetivo" className="block text-xs font-bold text-slate-400 mb-1.5">Objetivo</label>
              <select
                id="rutina-objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-sm"
              >
                <option value="Hipertrofia" className="bg-slate-900 text-white">Hipertrofia</option>
                <option value="Fuerza" className="bg-slate-900 text-white">Fuerza y Potencia</option>
                <option value="Adaptación" className="bg-slate-900 text-white">Adaptación / Principiante</option>
                <option value="Funcional" className="bg-slate-900 text-white">Funcional</option>
                <option value="Definición" className="bg-slate-900 text-white">Definición</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rutina-desc" className="block text-xs font-bold text-slate-400 mb-1.5">Descripción (opcional)</label>
            <input
              id="rutina-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Rutina de 4 días enfocada en sobrecarga progresiva"
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white placeholder-slate-500 text-sm"
            />
          </div>

          {/* Días y Ejercicios */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Días de entrenamiento ({dias.length})
              </span>
              <button
                type="button"
                onClick={agregarDia}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="size-3.5" /> Agregar día
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
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorValidacion}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-[color,background-color] duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95"
            >
              {esEdicion ? 'Guardar cambios' : 'Guardar rutina'}
            </button>
          </div>
        </form>

        {diaParaBuscar && (
          <ModalBuscarEjercicioVideoteca
            diaNombre={dias.find((d) => d.id === diaParaBuscar)?.nombre}
            videosTecnica={videosTecnica}
            onSeleccionar={(video) => {
              agregarEjercicioDesdeVideoteca(diaParaBuscar, video.titulo)
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
    <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <input
          value={dia.nombre}
          onChange={(e) => onActualizarNombre(e.target.value)}
          placeholder={`Día ${idx + 1}`}
          className="font-bold text-sm bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 outline-none text-white focus:ring-2 focus:ring-blue-500 flex-1"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onAbrirBuscador}
            className="text-xs font-bold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Buscar en la videoteca de ejercicios"
          >
            <Search className="size-3.5 text-blue-400" />
            <span>Buscar en videoteca</span>
          </button>
          <button
            type="button"
            onClick={onAgregarEjercicio}
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            + Manual
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {dia.ejercicios.map((ej) => (
          <div key={ej.id} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-2.5 shadow-sm">
            {/* Fila superior: Nombre del ejercicio y botón eliminar */}
            <div className="flex items-center gap-2">
              <input
                aria-label="Nombre del ejercicio"
                value={ej.nombre}
                onChange={(e) => onActualizarEjercicio(ej.id, 'nombre', e.target.value)}
                placeholder="Nombre del ejercicio..."
                className="flex-1 font-semibold outline-none text-white placeholder:text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/80 focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={onAbrirBuscador}
                className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors shrink-0"
                title="Buscar o sumar desde la videoteca"
                aria-label="Buscar en videoteca"
              >
                <Search className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onEliminarEjercicio(ej.id)}
                aria-label="Eliminar ejercicio"
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors shrink-0"
                title="Eliminar este ejercicio"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Fila inferior: Modalidad (Normal/Bi-serie/Drop set), Series, Reps, Descanso */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-slate-300">
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
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                      : ej.tipoSerie === 'DROP_SET'
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <option value="NORMAL" className="bg-slate-900 text-white">Normal</option>
                  <option value="BI_SERIE" className="bg-slate-900 text-white">Bi-serie</option>
                  <option value="DROP_SET" className="bg-slate-900 text-white">Drop Set</option>
                </select>
              </div>

              {/* Series */}
              <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/80">
                <span className="text-[10px] uppercase font-bold text-slate-400">Series:</span>
                <input
                  type="number"
                  min={1}
                  value={ej.series}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'series', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-9 text-center bg-slate-900 border border-slate-700 rounded py-0.5 font-mono font-bold text-white"
                  title="Series"
                  aria-label="Series"
                />
              </div>

              {/* Reps */}
              <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/80 flex-1 min-w-[110px]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Reps:</span>
                <input
                  value={ej.repeticiones}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'repeticiones', e.target.value)}
                  placeholder={ej.tipoSerie === 'BI_SERIE' ? '10 + 10' : ej.tipoSerie === 'DROP_SET' ? '8 + 8 + 8' : '10-12'}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono font-bold text-white text-center"
                  title="Repeticiones"
                  aria-label="Repeticiones"
                />
              </div>

              {/* Descanso */}
              <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/80 shrink-0" title="Tiempo de descanso entre series">
                <Clock className="size-3 text-blue-400" />
                <select
                  aria-label="Tiempo de descanso"
                  value={ej.descansoSegundos ?? 60}
                  onChange={(e) => onActualizarEjercicio(ej.id, 'descansoSegundos', parseInt(e.target.value, 10))}
                  className="text-[11px] font-mono font-bold text-slate-200 bg-transparent outline-none cursor-pointer"
                >
                  <option value={15} className="bg-slate-900 text-white">15s</option>
                  <option value={20} className="bg-slate-900 text-white">20s</option>
                  <option value={30} className="bg-slate-900 text-white">30s</option>
                  <option value={45} className="bg-slate-900 text-white">45s</option>
                  <option value={60} className="bg-slate-900 text-white">60s (1m)</option>
                  <option value={75} className="bg-slate-900 text-white">75s</option>
                  <option value={90} className="bg-slate-900 text-white">90s (1.5m)</option>
                  <option value={105} className="bg-slate-900 text-white">105s</option>
                  <option value={120} className="bg-slate-900 text-white">120s (2m)</option>
                  <option value={150} className="bg-slate-900 text-white">150s (2.5m)</option>
                  <option value={180} className="bg-slate-900 text-white">180s (3m)</option>
                  <option value={210} className="bg-slate-900 text-white">210s (3.5m)</option>
                  <option value={240} className="bg-slate-900 text-white">240s (4m)</option>
                  <option value={300} className="bg-slate-900 text-white">300s (5m)</option>
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
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('TODOS')
  const [recientesAgregados, setRecientesAgregados] = useState<Record<string, boolean>>({})
  const [contadorAgregados, setContadorAgregados] = useState(0)

  const GRUPOS = ['TODOS', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']

  const normalizar = (texto: string) =>
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const ejerciciosFiltrados = useMemo(() => {
    const queryNorm = normalizar(busqueda.trim())
    const palabras = queryNorm.split(/\s+/).filter(Boolean)

    return videosTecnica.filter((v) => {
      if (grupoSeleccionado !== 'TODOS' && v.grupoMuscular !== grupoSeleccionado) {
        return false
      }
      if (palabras.length === 0) return true

      const titNorm = normalizar(v.titulo)
      const descNorm = normalizar(v.descripcion || '')
      const gNorm = normalizar(v.grupoMuscular || '')

      return palabras.every((p) => titNorm.includes(p) || descNorm.includes(p) || gNorm.includes(p))
    })
  }, [videosTecnica, busqueda, grupoSeleccionado])

  const visibles = useMemo(() => ejerciciosFiltrados.slice(0, 50), [ejerciciosFiltrados])

  const handleAgregar = (video: VideoTecnica) => {
    onSeleccionar(video)
    setContadorAgregados((prev) => prev + 1)
    setRecientesAgregados((prev) => ({ ...prev, [video.id]: true }))
    setTimeout(() => {
      setRecientesAgregados((prev) => ({ ...prev, [video.id]: false }))
    }, 1800)
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Videoteca de ejercicios</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {videosTecnica.length.toLocaleString('es-AR')} ejercicios
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {diaNombre ? `Agregando a: ${diaNombre}` : 'Buscá por nombre o grupo muscular para sumarlo a la rutina'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar buscador"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Buscador y Filtros */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribí para buscar (ej: press banca, sentadilla, curl, dominadas, triceps)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-800/80 text-white placeholder:text-slate-500 text-sm font-medium rounded-xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
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
                      : 'bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {grupo === 'TODOS' ? 'Todos los grupos' : grupo}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/80">
          {visibles.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="size-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Search className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">No encontramos ejercicios coincidentes</p>
                <p className="text-xs text-slate-400 mt-1">
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
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 underline"
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
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-slate-800/50 p-2 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ejercicio.gifUrl || ejercicio.videoUrl}
                      alt={ejercicio.titulo}
                      className="size-14 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                          {ejercicio.grupoMuscular}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {ejercicio.nivel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate mt-1">
                        {ejercicio.titulo}
                      </h4>
                      {ejercicio.descripcion && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
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

          {ejerciciosFiltrados.length > 50 && (
            <div className="text-center py-3 text-xs text-slate-400 font-medium">
              Mostrando los primeros 50 de {ejerciciosFiltrados.length} resultados. Escribí más letras para afinar la búsqueda.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {contadorAgregados > 0 ? (
              <span className="text-emerald-400 font-bold">
                ✓ {contadorAgregados} ejercicio{contadorAgregados > 1 ? 's' : ''} sumado{contadorAgregados > 1 ? 's' : ''}
              </span>
            ) : (
              `${ejerciciosFiltrados.length} ejercicios disponibles`
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition-colors"
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
              Loop continuo
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
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-inner">
        {/* Header de tabla */}
        <div className="grid grid-cols-[40px_1fr_75px_70px_46px] gap-2 px-3 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span className="text-center">Serie</span>
          <span>Previa</span>
          <span className="text-center">KG</span>
          <span className="text-center">Repes</span>
          <span className="text-center">✓</span>
        </div>

        {/* Filas de series */}
        {seriesData.map((serie) => {
          const previaData = sesionPrevia?.series.find((s) => s.serieNumero === serie.serieNumero)
          return (
            <div
              key={serie.serieNumero}
              className={`grid grid-cols-[40px_1fr_75px_70px_46px] gap-2 items-center px-3 py-2.5 border-b border-slate-800/60 last:border-0 transition-colors duration-150 ${
                serie.completada ? 'bg-blue-600/10' : 'hover:bg-slate-900/30'
              }`}
            >
              {/* Número de serie */}
              <div className="flex items-center justify-center">
                <span className={`text-xs font-black font-mono size-6 rounded-md flex items-center justify-center ${
                  serie.completada ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-300'
                }`}>
                  {serie.serieNumero}
                </span>
              </div>

              {/* Previa */}
              <div className="truncate pr-1">
                {previaData && typeof previaData.kg === 'number' && typeof previaData.reps === 'number' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                    <span className="text-blue-400 font-extrabold">{previaData.kg}</span>
                    <span className="text-[10px] text-slate-500 font-sans">kg</span>
                    <span className="text-slate-600 font-sans mx-0.5 font-bold">×</span>
                    <span className="text-blue-400 font-extrabold">{previaData.reps}</span>
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-600 px-1 font-bold select-none">—</span>
                )}
              </div>

              {/* Input KG */}
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={serie.kg || ''}
                  onChange={(e) => onCambioSerie(serie.serieNumero, 'kg', parseFloat(e.target.value) || 0)}
                  aria-label={`KG serie ${serie.serieNumero}`}
                  placeholder="0"
                  className="w-full text-center bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm rounded-lg px-1 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Input REPES */}
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={serie.reps || ''}
                  onChange={(e) => onCambioSerie(serie.serieNumero, 'reps', parseInt(e.target.value, 10) || 0)}
                  aria-label={`Repeticiones serie ${serie.serieNumero}`}
                  placeholder="0"
                  className="w-full text-center bg-slate-900 border border-slate-800 text-white font-mono font-bold text-sm rounded-lg px-1 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Checkbox circular de completado */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onToggleCompletada(serie.serieNumero)}
                  aria-label={serie.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                  className={`size-7 rounded-full flex items-center justify-center transition-[background-color,border-color,transform] duration-150 active:scale-90 border-2 ${
                    serie.completada
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-900/80 border-slate-700 hover:border-slate-500 text-transparent'
                  }`}
                >
                  <Check className={`size-3.5 transition-opacity ${serie.completada ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
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
  onIniciarDescanso,
}: {
  ejercicio: Ejercicio
  index: number
  seriesData: RegistroSerie[]
  sesionPrevia: SesionEjercicio | undefined
  videos: VideoTecnica[]
  onChange: (series: RegistroSerie[]) => void
  onIniciarDescanso?: (ejercicioNombre: string, segundos: number) => void
}) {
  const [expandido, setExpandido] = useState(index === 0)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const [mostrarNotas, setMostrarNotas] = useState(false)
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
  const totalSeriesActuales = seriesData.length || ejercicio.series
  const todasCompletas = seriesCompletas === totalSeriesActuales && totalSeriesActuales > 0

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
      const serieTarget = seriesData.find((s) => s.serieNumero === numSerie)
      const vaACompletar = serieTarget ? !serieTarget.completada : false
      const actualizadas = seriesData.map((s) =>
        s.serieNumero === numSerie ? { ...s, completada: !s.completada } : s
      )
      onChange(actualizadas)
      if (vaACompletar && onIniciarDescanso) {
        onIniciarDescanso(ejercicio.nombre, ejercicio.descansoSegundos || 60)
      }
    },
    [seriesData, onChange, onIniciarDescanso, ejercicio.nombre, ejercicio.descansoSegundos]
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
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white break-words">{ejercicio.nombre}</h3>
                {ejercicio.tipoSerie === 'BI_SERIE' && (
                  <span className="inline-flex items-center text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/35 shadow-sm shrink-0">
                    Bi-serie
                  </span>
                )}
                {ejercicio.tipoSerie === 'DROP_SET' && (
                  <span className="inline-flex items-center text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm shrink-0">
                    Drop Set
                  </span>
                )}
                <BadgeEstadoEjercicio
                  todasCompletas={todasCompletas}
                  seriesCompletas={seriesCompletas}
                  totalSeries={totalSeriesActuales}
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

        {/* Contenido desplegable (Cuerpo de la Cortina estilo Hevy / Alpha Progression) */}
        {expandido && (
          <div className="p-4 md:p-5 pt-0 space-y-4 border-t border-slate-800/50 mt-1 animate-in fade-in duration-200">
            {/* Píldoras de acción rápida (Tutorial, Notas, Descanso) */}
            <div className="flex items-center gap-2 pt-3 flex-wrap">
              {videoMatch && (
                <button
                  type="button"
                  onClick={() => setVideoAbierto(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 text-xs font-bold transition-colors"
                >
                  <PlayCircle className="size-3.5 text-blue-400" />
                  Tutorial
                </button>
              )}

              {ejercicio.notas && (
                <button
                  type="button"
                  onClick={() => setMostrarNotas((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    mostrarNotas
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Notas {mostrarNotas ? '▲' : '▼'}
                </button>
              )}

              {ejercicio.descansoSegundos ? (
                <button
                  type="button"
                  onClick={() => onIniciarDescanso && onIniciarDescanso(ejercicio.nombre, ejercicio.descansoSegundos || 60)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-blue-400 text-xs font-bold transition-colors"
                  title="Iniciar cronómetro de descanso"
                >
                  <Clock className="size-3.5 text-blue-400" />
                  {ejercicio.descansoSegundos}s descanso
                </button>
              ) : null}
            </div>

            {/* Cuadro de notas expandido o siempre visible si tiene notas */}
            {(mostrarNotas || !videoMatch) && ejercicio.notas && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 italic">
                {ejercicio.notas}
              </div>
            )}

            {/* Tabla de series moderna */}
            <TablaSeries
              seriesData={seriesData}
              sesionPrevia={sesionPrevia}
              onCambioSerie={handleCambioSerie}
              onToggleCompletada={toggleCompletada}
            />
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
        Portal del alumno
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
          Consultar a mi coach por WhatsApp
        </a>
        <Link
          href="/videoteca"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-6 py-3 text-sm font-bold text-slate-200 transition-colors"
        >
          Explorar videoteca
        </Link>
      </div>
    </div>
  )
}

// ── Vista dedicada para el Alumno en Rutinas ────────────────────────────────
function VistaMiRutinaAlumno({ rutina, usuario }: { rutina: Rutina; usuario: any }) {
  const { guardarSesion, getUltimaSesion, videosTecnica } = useAppData()
  const alumnoId = usuario?.alumnoId || 'a1'

  // Clave de almacenamiento local para persistir el progreso en curso del alumno
  const claveBorrador = useMemo(
    () => getClaveBorradorEntrenamiento(alumnoId, rutina.id, fechaLocalHoy()),
    [alumnoId, rutina.id]
  )

  // Estado del día activo (restaura borrador si existía)
  const [diaActivo, setDiaActivo] = useState<number>(() => {
    const borrador = obtenerBorradorEntrenamiento(alumnoId, rutina.id, fechaLocalHoy())
    if (borrador && borrador.diaActivo < rutina.dias.length) {
      return borrador.diaActivo
    }
    return 0
  })

  const [guardado, setGuardado] = useState(false)
  const [modalIncompletoAbierto, setModalIncompletoAbierto] = useState(false)

  // Temporizador de descanso automático entre series
  const [temporizador, setTemporizador] = useState<{
    ejercicioNombre: string
    segundosRestantes: number
    totalSegundos: number
    activo: boolean
    notificado: boolean
  } | null>(null)

  const iniciarDescanso = useCallback((ejercicioNombre: string, segundos: number) => {
    setTemporizador({
      ejercicioNombre,
      segundosRestantes: segundos,
      totalSegundos: segundos,
      activo: true,
      notificado: false,
    })
  }, [])

  useEffect(() => {
    if (!temporizador || !temporizador.activo) return

    if (temporizador.segundosRestantes <= 0) {
      if (!temporizador.notificado) {
        reproducirSonidoFinDescanso()
        setTemporizador((prev) => (prev ? { ...prev, notificado: true, activo: false } : null))
      }
      return
    }

    const timer = setInterval(() => {
      setTemporizador((prev) => {
        if (!prev || !prev.activo) return prev
        const nuevosSegundos = prev.segundosRestantes - 1
        if (nuevosSegundos <= 0 && !prev.notificado) {
          reproducirSonidoFinDescanso()
          return {
            ...prev,
            segundosRestantes: 0,
            activo: false,
            notificado: true,
          }
        }
        return {
          ...prev,
          segundosRestantes: nuevosSegundos,
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [temporizador])

  const dia = rutina.dias[diaActivo] ?? rutina.dias[0]

  // Sesión previa para el día activo
  const sesionPrevia = useMemo(
    () => (dia ? getUltimaSesion(alumnoId, rutina.id, dia.id) : undefined),
    [dia, getUltimaSesion, alumnoId, rutina.id]
  )

  // Estado de series indexado por id de día (restaura borrador si existe para no perder progreso ante navegación o refresco)
  const [seriesPorDia, setSeriesPorDia] = useState<Record<string, Record<string, RegistroSerie[]>>>(() => {
    const hoy = fechaLocalHoy()
    limpiarBorradoresObsoletos(hoy)

    const borrador = obtenerBorradorEntrenamiento(alumnoId, rutina.id, hoy)
    if (borrador && borrador.seriesPorDia) {
      return borrador.seriesPorDia
    }

    const inicial: Record<string, Record<string, RegistroSerie[]>> = {}
    rutina.dias.forEach((d) => {
      const prevDia = getUltimaSesion(alumnoId, rutina.id, d.id)
      const diaInicial: Record<string, RegistroSerie[]> = {}
      d.ejercicios.forEach((ej) => {
        const prevEj = prevDia?.ejercicios.find((e) => e.ejercicioId === ej.id)
        diaInicial[ej.id] = Array.from({ length: ej.series }, (_, i) => ({
          serieNumero: i + 1,
          kg: prevEj?.series[i]?.kg ?? 0,
          reps: prevEj?.series[i]?.reps ?? 0,
          completada: false,
        }))
      })
      inicial[d.id] = diaInicial
    })
    return inicial
  })

  // Persistir automáticamente el progreso en tiempo real ante cualquier cambio
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        claveBorrador,
        JSON.stringify({
          diaActivo,
          seriesPorDia,
          fecha: fechaLocalHoy(),
          actualizadoEn: Date.now(),
        })
      )
    } catch {}
  }, [claveBorrador, diaActivo, seriesPorDia])

  // Obtener las series del día activo
  const seriesPorEjercicio = useMemo(() => {
    if (!dia) return {}
    return seriesPorDia[dia.id] ?? {}
  }, [dia, seriesPorDia])

  // Cambiar de día preservando el estado de cada día
  const handleCambioDia = useCallback(
    (index: number) => {
      setDiaActivo(index)
      setGuardado(false)
      const nuevoDia = rutina.dias[index]
      if (!nuevoDia) return

      // Si por alguna razón el nuevo día no tiene estado aún, inicializarlo sin tocar los demás
      setSeriesPorDia((prev) => {
        if (prev[nuevoDia.id]) return prev
        const prevDia = getUltimaSesion(usuario.alumnoId || 'a1', rutina.id, nuevoDia.id)
        const diaInicial: Record<string, RegistroSerie[]> = {}
        nuevoDia.ejercicios.forEach((ej) => {
          const prevEj = prevDia?.ejercicios.find((e) => e.ejercicioId === ej.id)
          diaInicial[ej.id] = Array.from({ length: ej.series }, (_, i) => ({
            serieNumero: i + 1,
            kg: prevEj?.series[i]?.kg ?? 0,
            reps: prevEj?.series[i]?.reps ?? 0,
            completada: false,
          }))
        })
        return { ...prev, [nuevoDia.id]: diaInicial }
      })
    },
    [rutina, getUltimaSesion, usuario.alumnoId]
  )

  const handleChangeSeries = useCallback((ejercicioId: string, series: RegistroSerie[]) => {
    if (!dia) return
    setSeriesPorDia((prev) => ({
      ...prev,
      [dia.id]: {
        ...(prev[dia.id] ?? {}),
        [ejercicioId]: series,
      },
    }))
    setGuardado(false)
  }, [dia])

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
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-10 space-y-6">
      {/* Cabecera Principal con Resumen de Rutina */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
            <Dumbbell className="size-3.5" />
            Plan activo
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            {rutina.nombre}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl leading-relaxed">
            {rutina.descripcion || 'Plan de entrenamiento personalizado diseñado por tus profesores.'}
          </p>
        </div>

        {/* Resumen HUD: Métricas rápidas del día */}
        {dia && (
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-slate-900/60 border border-slate-800 p-2 sm:p-2.5 rounded-2xl">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-center min-w-[76px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Ejercicios</span>
              <span className="text-lg font-black font-mono text-white">
                <span className="text-blue-400">{completados}</span>/{total}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-center min-w-[76px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Series</span>
              <span className="text-lg font-black font-mono text-white">
                <span className="text-emerald-400">{seriesTotales.completadas}</span>/{seriesTotales.total}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-center min-w-[76px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Progreso</span>
              <span className="text-lg font-black font-mono text-blue-400">
                {total > 0 ? Math.round((completados / total) * 100) : 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selector de Días tipo Segmented Tabs Premium */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 p-1.5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
        {rutina.dias.map((d, index) => {
          const esActivo = diaActivo === index
          const diaSeries = seriesPorDia[d.id] ?? {}
          let dCompletos = 0
          d.ejercicios.forEach((ej) => {
            const s = diaSeries[ej.id] ?? []
            if (s.length > 0 && s.every((item) => item.completada)) dCompletos++
          })
          const dTerminado = dCompletos === d.ejercicios.length && d.ejercicios.length > 0

          return (
            <button
              key={d.id}
              onClick={() => handleCambioDia(index)}
              className={`flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-3 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                esActivo
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-black'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="truncate">{d.nombre}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                esActivo
                  ? 'bg-blue-700/60 text-blue-100'
                  : dTerminado
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {dTerminado ? '✓ Listo' : `${d.ejercicios.length} ej.`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Layout Principal: Dos columnas en pantallas grandes (Izquierda: Guía/Info + Guardado sticky, Derecha: Lista de Ejercicios) */}
      {dia && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda (Sidebar del Día & Acciones) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Tarjeta de Resumen del Día Actual */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                  Sesión de hoy
                </span>
                <h2 className="text-2xl font-black text-white">{dia.nombre}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {dia.ejercicios.length} ejercicios diseñados para esta jornada.
                </p>
              </div>

              {/* Barra de progreso global del día */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Progreso del entrenamiento</span>
                  <span className={completados === total && total > 0 ? 'text-emerald-400' : 'text-blue-400'}>
                    {completados} de {total} completados
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completados === total && total > 0 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${total > 0 ? (completados / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Tips rápidos para el alumno */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-blue-400" />
                  Consejo de ejecución
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Completá cada serie presionando el botón <strong className="text-white">✓</strong>. Se activará automáticamente el temporizador de descanso óptimo.
                </p>
              </div>

              {/* Botón de Finalizar y Guardar Sesión */}
              <button
                type="button"
                onClick={handleGuardar}
                className={`w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-sm font-bold transition-[color,background-color,box-shadow,transform] duration-200 active:scale-95 cursor-pointer shadow-lg ${
                  guardado
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 shadow-emerald-950/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 hover:-translate-y-0.5'
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
                      ? 'Finalizar y guardar entreno'
                      : 'Guardar entreno'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Columna Derecha (Lista de Ejercicios Desplegables con Diseño Alpha / Hevy) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Ejercicios ({dia.ejercicios.length})
              </h3>
              <span className="text-xs text-slate-500">
                Tocá cada tarjeta para desplegar o registrar
              </span>
            </div>

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
                  onIniciarDescanso={iniciarDescanso}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barra Flotante de Temporizador de Descanso Automático */}
      {temporizador && (
        <div className="fixed bottom-22 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl transition-all ${
              temporizador.segundosRestantes === 0
                ? 'bg-emerald-950/95 border-emerald-500/80 shadow-emerald-900/50'
                : 'bg-slate-900/95 border-blue-500/50 shadow-blue-950/60'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-sm border ${
                    temporizador.segundosRestantes === 0
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-bounce'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  }`}
                >
                  {temporizador.segundosRestantes === 0 ? (
                    <Volume2 className="size-5" />
                  ) : (
                    <Clock className="size-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    {temporizador.segundosRestantes === 0
                      ? '¡Tiempo cumplido!'
                      : 'Descanso en progreso'}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-white truncate">
                    {temporizador.ejercicioNombre}
                  </p>
                </div>
              </div>

              {/* Cuenta regresiva digital */}
              <div className="text-right shrink-0">
                <span
                  className={`font-mono text-xl sm:text-2xl font-black ${
                    temporizador.segundosRestantes === 0
                      ? 'text-emerald-400 animate-pulse'
                      : temporizador.segundosRestantes <= 10
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                >
                  {Math.floor(temporizador.segundosRestantes / 60)}:
                  {(temporizador.segundosRestantes % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Controles del temporizador */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {temporizador.segundosRestantes > 0 && (
                  <>
                    <Tooltip content={temporizador.activo ? 'Pausar descanso' : 'Reanudar descanso'}>
                      <button
                        type="button"
                        onClick={() =>
                          setTemporizador((prev) =>
                            prev ? { ...prev, activo: !prev.activo } : null
                          )
                        }
                        className="size-8 sm:size-8.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {temporizador.activo ? (
                          <Pause className="size-3.5 sm:size-4" />
                        ) : (
                          <Play className="size-3.5 sm:size-4" />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip content="Sumar 15 segundos">
                      <button
                        type="button"
                        onClick={() =>
                          setTemporizador((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  segundosRestantes: prev.segundosRestantes + 15,
                                  totalSegundos: Math.max(prev.totalSegundos, prev.segundosRestantes + 15),
                                }
                              : null
                          )
                        }
                        className="h-8 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +15s
                      </button>
                    </Tooltip>
                  </>
                )}
                <Tooltip content="Cerrar temporizador">
                  <button
                    type="button"
                    onClick={() => setTemporizador(null)}
                    className="size-8 sm:size-8.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/60 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Barra de progreso animada */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  temporizador.segundosRestantes === 0
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                }`}
                style={{
                  width: `${
                    temporizador.totalSegundos > 0
                      ? Math.min(
                          100,
                          ((temporizador.totalSegundos - temporizador.segundosRestantes) /
                            temporizador.totalSegundos) *
                            100
                        )
                      : 100
                  }%`,
                }}
              />
            </div>

            {temporizador.segundosRestantes === 0 && (
              <p className="text-center text-[11px] font-bold text-emerald-300 mt-2 animate-pulse">
                🔔 ¡Descanso completado! Preparate para tu próxima serie.
              </p>
            )}
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
