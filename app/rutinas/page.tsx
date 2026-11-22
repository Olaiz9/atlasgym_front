'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import { Rutina, DiaRutina, Ejercicio, Alumno, RegistroSerie, SesionEjercicio, SesionEntrenamiento, VideoTecnica, TipoSerieEjercicio } from '@/lib/types'
import { buscarVideoParaEjercicio, formatPrevia, obtenerBorradorEntrenamiento, diaInicialDeRutina, limpiarBorradoresObsoletos, getClaveBorradorEntrenamiento, detectarConflictosAsignacionRutina } from '@/lib/rutina-utils'
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
  Users,
  Check,
  X,
  AlertCircle,
  Flame,
  Search,
  CheckCircle2,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  ChevronLeft,
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
          <h1 className="text-5xl font-black text-white md:text-6xl">
            Rutinas y entrenamientos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Creá plantillas genéricas por objetivos o asigná entrenamientos directamente a los alumnos.
          </p>
        </div>
        <button
          onClick={() => setModalNuevaAbierto(true)}
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-[color,background-color,transform] duration-200 active:scale-95"
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-[color,background-color] duration-200 active:scale-95 ${
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
            className="pl-9 pr-4 h-10 text-sm bg-slate-900 border border-slate-800 text-white rounded-full outline-none transition-[border-color] duration-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64 placeholder:text-slate-500"
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
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm transition-[border-color] duration-200 hover:border-slate-700"
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
                    <p className="text-xs font-bold text-slate-500">
                      Estructura por Días ({rutina.dias.length}):
                    </p>
                    {rutina.dias.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleTodosDias(rutina)}
                        aria-label={rutina.dias.every((d) => diaExpandido[d.id]) ? 'Colapsar todos los días' : 'Ver todos los días'}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
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
                          <span className="flex items-center gap-2 text-xs text-slate-500">
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
                                    <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                      Bi-serie
                                    </span>
                                  )}
                                  {ej.tipoSerie === 'DROP_SET' && (
                                    <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                      Drop Set
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {ej.descansoSegundos ? (
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-0.5" title={`Descanso: ${ej.descansoSegundos} segundos`}>
                                      <Clock className="size-2.5 text-blue-400" />
                                      {ej.descansoSegundos}s
                                    </span>
                                  ) : null}
                                  <span className="text-xs font-mono text-slate-400">
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
                  <p className="text-xs font-bold text-slate-500 mb-1.5">
                    Alumnos con esta rutina:
                  </p>
                  {alumnosConEstaRutina.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {alumnosConEstaRutina.map((al) => (
                        <span
                          key={al.id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300"
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
            <h2 className="text-2xl font-black text-white">
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
                    <span className="text-xs text-amber-400/90 truncate shrink-0">
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
                className="h-10 rounded-xl bg-amber-600 px-5 text-xs font-bold text-white shadow-lg shadow-amber-600/25 hover:bg-amber-500 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] active:scale-95"
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
              <p className="text-xs text-blue-300/80 mt-1">{rutina.dias.length} días de entrenamiento</p>
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
                        <p className="text-xs text-slate-400 truncate">
                          {a.plan}
                          {yaAsignada && ' — Ya tiene esta rutina'}
                          {tieneOtraRutina && ` — Tiene: ${nombreOtraRutina}`}
                        </p>
                      </div>
                      {tieneOtraRutina && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
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
                className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,transform] duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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

  const eliminarDia = (diaId: string) => {
    setErrorValidacion(null)
    // La rutina conserva al menos un día.
    setDias((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== diaId) : prev))
    setDiaParaBuscar((actual) => (actual === diaId ? null : actual))
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
            <h2 className="text-3xl font-black text-white">
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
              <span className="text-xs font-bold text-slate-400">
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

            <div className="space-y-6">
              {dias.map((dia, idx) => (
                <TarjetaDiaRutina
                  key={dia.id}
                  dia={dia}
                  idx={idx}
                  puedeEliminar={dias.length > 1}
                  onEliminarDia={() => eliminarDia(dia.id)}
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
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-[color,background-color,transform] duration-200 active:scale-95"
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
  puedeEliminar,
  onEliminarDia,
  onAbrirBuscador,
  onActualizarNombre,
  onAgregarEjercicio,
  onActualizarEjercicio,
  onEliminarEjercicio,
}: {
  dia: DiaRutina
  idx: number
  puedeEliminar: boolean
  onEliminarDia: () => void
  onAbrirBuscador: () => void
  onActualizarNombre: (nombre: string) => void
  onAgregarEjercicio: () => void
  onActualizarEjercicio: (ejId: string, campo: string, valor: any) => void
  onEliminarEjercicio: (ejId: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-700/80 border-l-4 border-l-blue-500 bg-slate-950/40 shadow-md overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-800/70 border-b border-slate-700/80 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="shrink-0 text-[11px] font-black tracking-wide px-2 py-1 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300">
            DÍA {idx + 1}
          </span>
          <input
            aria-label={`Nombre del día ${idx + 1}`}
            value={dia.nombre}
            onChange={(e) => onActualizarNombre(e.target.value)}
            placeholder={`Día ${idx + 1}`}
            className="font-bold text-sm bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 outline-none text-white focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
          />
          {puedeEliminar && (
            <button
              type="button"
              onClick={onEliminarDia}
              aria-label={`Eliminar día ${idx + 1}`}
              title="Eliminar este día"
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
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

      <div className="p-4 space-y-2.5">
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
                  className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
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
                <span className="text-xs font-bold text-slate-400">Series:</span>
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
                <span className="text-xs font-bold text-slate-400">Reps:</span>
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
                  className="text-xs font-mono font-bold text-slate-200 bg-transparent outline-none cursor-pointer"
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

  // Catálogo de ejercicios con GIF (el mismo que muestra la Videoteca). Sin esto, si el gimnasio
  // todavía no cargó videos propios, el buscador quedaba vacío y no se podía agregar nada.
  const [catalogo, setCatalogo] = useState<VideoTecnica[]>([])
  const [totalCatalogo, setTotalCatalogo] = useState(0)
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(true)
  useEffect(() => {
    const control = new AbortController()
    setBuscandoCatalogo(true)
    const espera = setTimeout(() => {
      const params = new URLSearchParams({ limit: '50' })
      if (busqueda.trim()) params.set('q', busqueda.trim())
      if (grupoSeleccionado !== 'TODOS') params.set('grupo', grupoSeleccionado)
      fetch(`/api/ejercicios?${params.toString()}`, { signal: control.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          setCatalogo(Array.isArray(data.ejercicios) ? data.ejercicios : [])
          setTotalCatalogo(typeof data.total === 'number' ? data.total : 0)
        })
        .catch(() => {})
        .finally(() => {
          if (!control.signal.aborted) setBuscandoCatalogo(false)
        })
    }, 250)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [busqueda, grupoSeleccionado])

  // Primero los videos del gimnasio; después el catálogo, sin repetir el mismo ejercicio
  const resultados = useMemo(() => {
    const titulos = new Set(ejerciciosFiltrados.map((v) => normalizar(v.titulo)))
    return [...ejerciciosFiltrados, ...catalogo.filter((c) => !titulos.has(normalizar(c.titulo)))]
  }, [ejerciciosFiltrados, catalogo])
  const totalResultados = ejerciciosFiltrados.length + totalCatalogo
  const visibles = useMemo(() => resultados.slice(0, 50), [resultados])

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
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
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
          {visibles.length === 0 && buscandoCatalogo ? (
            <p className="py-10 text-center text-sm text-slate-400" role="status">Buscando ejercicios…</p>
          ) : visibles.length === 0 ? (
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
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                          {ejercicio.grupoMuscular}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {ejercicio.nivel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate mt-1">
                        {ejercicio.titulo}
                      </h4>
                      {ejercicio.descripcion && (
                        <p className="text-xs text-slate-400 line-clamp-1">
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

          {totalResultados > 50 && (
            <div className="text-center py-3 text-xs text-slate-400 font-medium">
              Mostrando los primeros 50 de {totalResultados} resultados. Escribí más letras para afinar la búsqueda.
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
              `${totalResultados} ejercicios disponibles`
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
            <p className="text-xs font-bold text-blue-400">{video.grupoMuscular} · {video.nivel}</p>
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
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-xs font-mono font-bold text-blue-400 border border-slate-800 backdrop-blur-sm">
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
              <p className="text-xs font-bold text-slate-500 mb-2">Tips de técnica</p>
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
function Separador() {
  return <span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>
}

const textoDescanso = (s: number) => (s % 60 === 0 ? `${s / 60} min` : `${s} s`)

function metaEjercicio(ej: Ejercicio) {
  const partes = [`${ej.series} × ${ej.repeticiones}`]
  if (ej.tipoSerie === 'DROP_SET') partes.push('drop set')
  if (ej.descansoSegundos) partes.push(`descanso ${textoDescanso(ej.descansoSegundos)}`)
  return partes.join(' | ')
}

function useVideoEjercicio(nombre: string, videos: VideoTecnica[]) {
  const [videoApi, setVideoApi] = useState<VideoTecnica | null>(null)
  useEffect(() => {
    if (!buscarVideoParaEjercicio(nombre, videos) && nombre) {
      let cancelado = false
      fetch(`/api/ejercicios?q=${encodeURIComponent(nombre)}&limit=1`)
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
  }, [nombre, videos])
  return useMemo(() => buscarVideoParaEjercicio(nombre, videos) || videoApi || undefined, [nombre, videos, videoApi])
}

function FilaEjercicio({
  ejercicio,
  index,
  series,
  activo,
  videos,
  onElegir,
}: {
  ejercicio: Ejercicio
  index: number
  series: RegistroSerie[]
  activo: boolean
  videos: VideoTecnica[]
  onElegir: () => void
}) {
  const video = useVideoEjercicio(ejercicio.nombre, videos)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const hechas = series.filter((s) => s.completada).length
  const completo = series.length > 0 && hechas === series.length

  return (
    <li
      className={`flex items-center gap-1 rounded-[14px] bg-[#162A50] pr-3 lg:border lg:pr-0 ${
        activo ? 'lg:border-2 lg:border-blue-400 lg:bg-[#1E3663]' : 'lg:border-[#22396A] lg:bg-[#0E1B36]'
      }`}
    >
      <button type="button" onClick={onElegir} aria-current={activo ? 'step' : undefined} className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 p-3 text-left">
        <span className="w-7 shrink-0 font-display text-2xl font-extrabold text-slate-500">{index + 1}</span>
        <span className="min-w-0 flex-1">
          {ejercicio.tipoSerie === 'BI_SERIE' && <span className="block text-[13px] font-semibold text-amber-400">Bi-serie</span>}
          <span className="block font-semibold text-white">{ejercicio.nombre}</span>
          <span className="block text-[13px] text-slate-400">
            {metaEjercicio(ejercicio)}
            {hechas > 0 && !completo && (
              <>
                <Separador />
                {hechas} de {series.length}
              </>
            )}
          </span>
        </span>
        {completo && <Check className="size-[18px] shrink-0 text-[#5BE3A0]" aria-label="Hecho" />}
      </button>
      {video && (
        <button
          type="button"
          onClick={() => setVideoAbierto(true)}
          aria-label={`Ver técnica de ${ejercicio.nombre}`}
          className="h-11 shrink-0 rounded-[10px] border border-[#2A4677] bg-[#0E1B36] px-3 text-[13px] font-semibold text-slate-300 lg:hidden"
        >
          Técnica
        </button>
      )}
      {videoAbierto && video && <ModalVideoTecnica video={video} onClose={() => setVideoAbierto(false)} />}
    </li>
  )
}

function PanelEjercicio({
  ejercicio,
  seriesData,
  sesionPrevia,
  videos,
  onChange,
  onIniciarDescanso,
}: {
  ejercicio: Ejercicio
  seriesData: RegistroSerie[]
  sesionPrevia: SesionEjercicio | undefined
  videos: VideoTecnica[]
  onChange: (series: RegistroSerie[]) => void
  onIniciarDescanso: (ejercicioNombre: string, segundos: number) => void
}) {
  const video = useVideoEjercicio(ejercicio.nombre, videos)
  const [videoAbierto, setVideoAbierto] = useState(false)
  const esGif = Boolean(video && (video.gifUrl || video.formato === 'GIF'))
  const cambiarSerie = (numSerie: number, campo: 'kg' | 'reps', valor: number) =>
    onChange(seriesData.map((s) => (s.serieNumero === numSerie ? { ...s, [campo]: valor } : s)))
  const alternarSerie = (numSerie: number) => {
    const vaACompletar = !seriesData.find((s) => s.serieNumero === numSerie)?.completada
    onChange(seriesData.map((s) => (s.serieNumero === numSerie ? { ...s, completada: !s.completada } : s)))
    if (vaACompletar) onIniciarDescanso(ejercicio.nombre, ejercicio.descansoSegundos || 60)
  }
  const claseInput =
    'h-11 w-full rounded-[10px] border border-[#2A4677] bg-[#0E1B36] text-center text-base text-slate-100 outline-none focus:border-blue-400'
  const columnas = 'grid grid-cols-[34px_minmax(0,1fr)_68px_56px_48px] items-center gap-1.5 sm:grid-cols-[40px_minmax(0,1fr)_80px_72px_48px] sm:gap-2'

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap lg:gap-5">
        <div className="relative flex h-[168px] flex-1 basis-64 items-center justify-center overflow-hidden rounded-2xl bg-[#13254A] text-[13px] text-[#8296BB] lg:h-[220px]">
          {video && esGif ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.gifUrl || video.videoUrl}
              alt={`GIF de la técnica de ${ejercicio.nombre}${video.descripcion ? `: ${video.descripcion}` : ''}`}
              className="size-full object-contain p-2"
            />
          ) : video ? (
            <button type="button" onClick={() => setVideoAbierto(true)} aria-label={`Ver video de técnica de ${ejercicio.nombre}`} className="flex size-14 items-center justify-center rounded-full bg-blue-600 text-white">
              <Play className="ml-0.5 size-[22px] fill-current" />
            </button>
          ) : (
            'Sin video de técnica cargado'
          )}
        </div>
        <div className="flex flex-1 basis-56 flex-col gap-2">
          <h2 className="font-display text-[32px] font-bold uppercase leading-none text-white">{ejercicio.nombre}</h2>
          <p className="text-sm text-[#8296BB]">
            {ejercicio.tipoSerie === 'BI_SERIE' && (
              <>
                Bi-serie
                <Separador />
              </>
            )}
            {metaEjercicio(ejercicio)}
          </p>
          <div className="flex flex-wrap gap-x-4">
            {video && (
              <button type="button" onClick={() => setVideoAbierto(true)} className="h-11 text-sm font-semibold text-blue-400">Ver técnica completa</button>
            )}
            {ejercicio.descansoSegundos ? (
              <button type="button" onClick={() => onIniciarDescanso(ejercicio.nombre, ejercicio.descansoSegundos || 60)} className="h-11 text-sm font-semibold text-blue-400">
                Iniciar descanso
              </button>
            ) : null}
          </div>
          {ejercicio.notas && <p className="text-sm text-slate-300">{ejercicio.notas}</p>}
          {video?.consejosClave && video.consejosClave.length > 0 && (
            <div className="hidden lg:block">
              <h3 className="mb-1 text-[13px] font-bold uppercase tracking-[.06em] text-slate-500">Tips de técnica</h3>
              <ul className="list-disc pl-[18px] text-[15px] leading-normal text-slate-200">
                {video.consejosClave.slice(0, 3).map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div role="table" aria-label="Series" className="flex flex-col gap-2">
        <div role="row" className={`${columnas} pl-3 pr-2 text-[13px] text-[#8296BB]`}>
          <span role="columnheader">Serie</span>
          <span role="columnheader">Previa</span>
          <span role="columnheader">Kg</span>
          <span role="columnheader">Repes</span>
          <span role="columnheader" className="text-center">Hecha</span>
        </div>
        {seriesData.map((serie) => {
          const previa = sesionPrevia?.series.find((s) => s.serieNumero === serie.serieNumero)
          return (
            <div key={serie.serieNumero} role="row" className={`${columnas} rounded-xl py-1.5 pl-3 pr-2 ${serie.completada ? 'bg-[#5BE3A0]/10' : 'bg-[#13254A]'}`}>
              <span role="cell" className="font-semibold text-white">{serie.serieNumero}</span>
              <span role="cell" className="text-[13px] text-[#8296BB]">
                {previa && typeof previa.kg === 'number' && typeof previa.reps === 'number' ? `${previa.kg} kg × ${previa.reps}` : '—'}
              </span>
              <span role="cell">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={serie.kg || ''}
                  onChange={(e) => cambiarSerie(serie.serieNumero, 'kg', parseFloat(e.target.value) || 0)}
                  aria-label={`KG serie ${serie.serieNumero}`}
                  placeholder="0"
                  className={claseInput}
                />
              </span>
              <span role="cell">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={serie.reps || ''}
                  onChange={(e) => cambiarSerie(serie.serieNumero, 'reps', parseInt(e.target.value, 10) || 0)}
                  aria-label={`Repeticiones serie ${serie.serieNumero}`}
                  placeholder="0"
                  className={claseInput}
                />
              </span>
              <span role="cell" className="flex justify-center">
                <button
                  type="button"
                  onClick={() => alternarSerie(serie.serieNumero)}
                  aria-pressed={serie.completada}
                  aria-label={serie.completada ? `Serie ${serie.serieNumero} hecha` : `Marcar serie ${serie.serieNumero} como hecha`}
                  className={`flex size-12 items-center justify-center rounded-xl ${
                    serie.completada ? 'bg-[#5BE3A0] text-[#0B2A1D]' : 'border border-slate-700 text-[#8296BB]'
                  }`}
                >
                  <Check className="size-5" strokeWidth={3} />
                </button>
              </span>
            </div>
          )
        })}
      </div>
      {videoAbierto && video && <ModalVideoTecnica video={video} onClose={() => setVideoAbierto(false)} />}
    </div>
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
            className="h-10 px-5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-[color,background-color,transform] duration-150 active:scale-95"
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

      <span className="mb-2 rounded-full border border-blue-500/30 bg-blue-950/40 px-3.5 py-1 text-xs font-bold text-blue-400">
        Portal del alumno
      </span>

      <h1 className="text-4xl font-black text-white sm:text-5xl">
        Aún no tenés una rutina asignada
      </h1>

      <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
        Hola, <strong className="text-white">{nombre}</strong>. Tu coach de ATLAS Gym está preparando tu plan personalizado acorde a tus objetivos y nivel.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        <a
          href={`${CONTACTO_ATLAS.whatsappUrl}?text=${mensajeWhatsapp}`}
          target="atlas_whatsapp_tab"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-[color,background-color,transform] duration-200 active:scale-95"
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
  const { guardarSesion, getUltimaSesion, sesionesEntrenamiento, videosTecnica } = useAppData()
  const alumnoId = usuario?.alumnoId || 'a1'

  // Clave de almacenamiento local para persistir el progreso en curso del alumno
  const claveBorrador = useMemo(
    () => getClaveBorradorEntrenamiento(alumnoId, rutina.id, fechaLocalHoy()),
    [alumnoId, rutina.id]
  )

  // Estado del día activo (restaura borrador si existía)
  const [diaActivo, setDiaActivo] = useState<number>(() =>
    diaInicialDeRutina(rutina, sesionesEntrenamiento, alumnoId, fechaLocalHoy())
  )
  const [diaElegidoAMano, setDiaElegidoAMano] = useState(
    () => obtenerBorradorEntrenamiento(alumnoId, rutina.id, fechaLocalHoy())?.diaElegidoAMano === true
  )

  const [guardado, setGuardado] = useState(false)
  const [modalIncompletoAbierto, setModalIncompletoAbierto] = useState(false)
  const [ejercicioActivo, setEjercicioActivo] = useState(0)
  const [entrenando, setEntrenando] = useState(false)
  const [listaAbierta, setListaAbierta] = useState(false)

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
          diaElegidoAMano,
          seriesPorDia,
          fecha: fechaLocalHoy(),
          actualizadoEn: Date.now(),
        })
      )
    } catch {}
  }, [claveBorrador, diaActivo, diaElegidoAMano, seriesPorDia])

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

  // Al guardar, en celular se vuelve a la lista del día
  useEffect(() => {
    if (guardado) setEntrenando(false)
  }, [guardado])

  const ejercicios = dia?.ejercicios ?? []
  const indiceActual = Math.min(ejercicioActivo, Math.max(0, ejercicios.length - 1))
  const ejercicioActual = ejercicios[indiceActual]
  const esUltimo = indiceActual === ejercicios.length - 1
  const seriesDe = (ej: Ejercicio) => seriesPorEjercicio[ej.id] ?? []
  const estaCompleto = (ej: Ejercicio) => seriesDe(ej).length > 0 && seriesDe(ej).every((s) => s.completada)
  const irA = (i: number) => {
    setEjercicioActivo(i)
    setEntrenando(true)
    setListaAbierta(false)
  }
  const terminar = () => {
    if (seriesTotales.completadas > 0) handleGuardar()
    else setEntrenando(false)
  }
  // fixed y no sticky: <main> tiene overflow-x-hidden y el sticky se calcula contra él, no contra la pantalla.
  const claseBarra = 'fixed inset-x-0 bottom-[76px] z-10 border-t border-[#1E3663] bg-slate-950 px-5 py-3 md:static md:border-0 md:bg-transparent md:p-0 lg:hidden'

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-3.5 px-5 pb-24 pt-[22px] md:px-10 md:pb-6 lg:gap-6 lg:pb-12 lg:pt-8">
      <header className={`${entrenando ? 'hidden lg:flex' : 'flex'} flex-col gap-3.5 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between`}>
        <div>
          <p className="text-[13px] font-semibold text-slate-500 lg:mb-1.5 lg:text-sm">
            {rutina.nombre}
            {rutina.objetivo && (
              <>
                <Separador />
                {rutina.objetivo}
              </>
            )}
          </p>
          <h1 className="mt-0.5 text-[34px] font-extrabold uppercase leading-[.95] text-white lg:text-[44px]">Mi rutina</h1>
          {rutina.descripcion && <p className="mt-1.5 hidden max-w-2xl text-sm text-slate-400 lg:block">{rutina.descripcion}</p>}
        </div>
        <div role="tablist" aria-label="Días de la rutina" className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-[#13254A] p-1 lg:flex">
          {rutina.dias.map((d, index) => {
            const activo = diaActivo === index
            const series = seriesPorDia[d.id] ?? {}
            const terminado = d.ejercicios.length > 0 && d.ejercicios.every((ej) => (series[ej.id] ?? []).length > 0 && series[ej.id].every((s) => s.completada))
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={activo}
                aria-label={d.nombre}
                onClick={() => {
                  handleCambioDia(index)
                  setDiaElegidoAMano(true)
                  setEjercicioActivo(0)
                }}
                className={`flex h-11 items-center justify-center gap-1 rounded-[10px] text-sm lg:px-[18px] lg:text-[15px] ${
                  activo ? 'bg-blue-600 font-bold text-white' : 'font-semibold text-slate-300'
                }`}
              >
                Día {index + 1}
                {terminado && <Check className="size-3.5 text-[#5BE3A0]" aria-label="terminado" />}
              </button>
            )
          })}
        </div>
      </header>

      {dia && (
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-5">
          <section aria-labelledby="titulo-dia" className={`${entrenando ? 'hidden lg:flex' : 'flex'} flex-col gap-2.5 lg:gap-2 lg:rounded-[20px] lg:border lg:border-[#22396A] lg:bg-[#162A50] lg:p-[18px]`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-slate-400 lg:px-1 lg:pb-2">
              <h2 id="titulo-dia" className="font-bold text-slate-100 lg:text-lg">{dia.nombre}</h2>
              <span className="text-[13px]">
                <span className="lg:hidden">{dia.ejercicios.length} ejercicios</span>
                <span className="hidden lg:inline">{completados} de {total} hecho</span>
              </span>
            </div>
            <div aria-hidden="true" className="mx-1 mb-2 hidden h-1.5 overflow-hidden rounded-full bg-[#0E1B36] lg:block">
              <span className="block h-full bg-[#5BE3A0]" style={{ width: `${total > 0 ? (completados / total) * 100 : 0}%` }} />
            </div>
            <ol className="flex flex-col gap-2.5 lg:gap-2">
              {ejercicios.map((ej, i) => (
                <FilaEjercicio
                  key={ej.id}
                  ejercicio={ej}
                  index={i}
                  series={seriesDe(ej)}
                  activo={i === indiceActual}
                  videos={videosTecnica}
                  onElegir={() => irA(i)}
                />
              ))}
            </ol>
            {ejercicios.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Este día todavía no tiene ejercicios.</p>}
          </section>

          {!entrenando && ejercicios.length > 0 && (
            <div className={claseBarra}>
              {guardado && (
                <p role="status" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#5BE3A0]">
                  <CheckCircle2 className="size-4" />
                  {completados === total ? 'Entrenamiento completado' : 'Progreso parcial guardado'}
                </p>
              )}
              <button
                type="button"
                onClick={() => irA(Math.max(0, ejercicios.findIndex((ej) => !estaCompleto(ej))))}
                className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-blue-600 text-[17px] font-bold text-white"
              >
                <Play className="size-[18px] fill-current" />
                {seriesTotales.completadas > 0 ? 'Seguir entrenamiento' : 'Empezar entrenamiento'}
              </button>
            </div>
          )}

          {ejercicioActual && (
            <section aria-label="Entrenamiento en curso" className={`${entrenando ? 'flex' : 'hidden lg:flex'} flex-col gap-4 lg:gap-[18px] lg:rounded-[20px] lg:border lg:border-[#22396A] lg:bg-[#162A50] lg:p-[22px]`}>
              <div className="flex items-center gap-1 lg:hidden">
                <button type="button" onClick={() => setListaAbierta(true)} aria-label="Ver todos los ejercicios de hoy" className="min-h-12 flex-1 text-left text-slate-100">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    Ejercicio {indiceActual + 1} de {ejercicios.length}
                    <ChevronDown className="size-4" />
                  </span>
                  <span aria-hidden="true" className="mt-2 flex gap-1">
                    {ejercicios.map((ej, i) => (
                      <span key={ej.id} className={`h-[5px] flex-1 rounded-full ${i === indiceActual ? 'bg-blue-400' : estaCompleto(ej) ? 'bg-[#5BE3A0]' : 'bg-[#1E3663]'}`} />
                    ))}
                  </span>
                </button>
                <button type="button" onClick={terminar} className="min-h-12 px-3 text-sm text-slate-300">Terminar</button>
              </div>

              <PanelEjercicio
                key={ejercicioActual.id}
                ejercicio={ejercicioActual}
                seriesData={seriesDe(ejercicioActual)}
                sesionPrevia={sesionPrevia?.ejercicios.find((e) => e.ejercicioId === ejercicioActual.id)}
                videos={videosTecnica}
                onChange={(series) => handleChangeSeries(ejercicioActual.id, series)}
                onIniciarDescanso={iniciarDescanso}
              />

              {guardado && (
                <p role="status" className="hidden items-center justify-end gap-1.5 text-sm font-semibold text-[#5BE3A0] lg:flex">
                  <CheckCircle2 className="size-4" />
                  {completados === total ? 'Entrenamiento completado' : 'Progreso parcial guardado'}
                </p>
              )}
              <div className="fixed inset-x-0 bottom-[76px] z-10 grid grid-cols-[1fr_1.7fr] gap-2.5 border-t border-[#1E3663] bg-slate-950 px-5 py-3 md:static md:border-0 md:bg-transparent md:p-0 lg:flex lg:justify-end">
                <button
                  type="button"
                  onClick={() => setEjercicioActivo(indiceActual - 1)}
                  disabled={indiceActual === 0}
                  className="flex h-14 items-center justify-center gap-1.5 rounded-[14px] border border-[#2A4677] text-[15px] font-medium text-slate-100 disabled:opacity-40 lg:h-[50px] lg:px-4"
                >
                  <ChevronLeft className="size-[18px]" />
                  Anterior
                </button>
                <button type="button" onClick={handleGuardar} className="hidden h-[50px] rounded-xl border border-[#2A4677] px-[18px] text-[15px] font-semibold text-slate-100 lg:block">
                  Guardar y terminar acá
                </button>
                <button
                  type="button"
                  onClick={() => (esUltimo ? handleGuardar() : setEjercicioActivo(indiceActual + 1))}
                  className="h-14 rounded-[14px] bg-blue-600 px-3 font-semibold text-white hover:bg-blue-500 lg:h-[50px] lg:rounded-xl lg:px-[22px] lg:text-[15px] lg:font-bold"
                >
                  {esUltimo ? 'Finalizar entrenamiento' : 'Siguiente ejercicio'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {listaAbierta && dia && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#060D1F]/70 lg:hidden" onClick={() => setListaAbierta(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-lista"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full flex-col gap-1.5 overflow-y-auto rounded-t-3xl bg-[#13254A] px-5 pb-6 pt-2.5"
          >
            <span aria-hidden="true" className="mb-2 h-[5px] w-11 shrink-0 self-center rounded-full bg-slate-700" />
            <div className="flex items-center justify-between">
              <h2 id="titulo-lista" className="text-lg font-semibold text-white">Ejercicios de hoy</h2>
              <button type="button" onClick={() => setListaAbierta(false)} aria-label="Cerrar lista" className="flex size-12 items-center justify-center rounded-xl text-slate-300">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-1.5 text-sm text-[#8296BB]">Tocá uno para ir directo. Lo que ya marcaste queda guardado.</p>
            {ejercicios.map((ej, i) => {
              const hechas = seriesDe(ej).filter((s) => s.completada).length
              const totalSeries = seriesDe(ej).length
              const estado =
                i === indiceActual
                  ? `Ahora, ${hechas} de ${totalSeries} series`
                  : estaCompleto(ej)
                  ? 'Hecho'
                  : hechas > 0
                  ? `${hechas} de ${totalSeries} series`
                  : 'Pendiente'
              return (
                <button
                  key={ej.id}
                  type="button"
                  onClick={() => irA(i)}
                  aria-current={i === indiceActual ? 'step' : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-1.5 text-left ${
                    i === indiceActual ? 'border-slate-700 bg-[#1E3663]' : 'border-transparent'
                  }`}
                >
                  <span className="w-6 text-[15px] text-[#8296BB]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-slate-100">{ej.nombre}</span>
                    <span className="block text-[13px] text-[#8296BB]">{estado}</span>
                  </span>
                </button>
              )
            })}
          </section>
        </div>
      )}

      {/* Barra Flotante de Temporizador de Descanso Automático */}
      {temporizador && (
        <div className="fixed bottom-[160px] left-1/2 z-40 w-[94%] max-w-md -translate-x-1/2 animate-in slide-in-from-bottom-5 duration-200 lg:bottom-6">
          <div
            className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] ${
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
                  <p className="text-xs sm:text-xs font-bold text-slate-400 truncate">
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
                        className="h-8 px-2 sm:px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
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
                className={`h-full transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 rounded-full ${
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
              <p className="text-center text-xs font-bold text-emerald-300 mt-2 animate-pulse">
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
