'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import { Rutina, DiaRutina, Ejercicio, Alumno, RegistroSerie, SesionEjercicio, SesionEntrenamiento, VideoTecnica } from '@/lib/types'
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
} from 'lucide-react'

const OBJETIVOS = ['TODOS', 'Hipertrofia', 'Fuerza', 'Adaptación', 'Funcional']

export default function RutinasPage() {
  const { rutinas, alumnos, usuarioActual, agregarRutina, asignarRutinaAAlumno, eliminarRutina, getRutinaDeAlumno } =
    useAppData()

  const [filtroObjetivo, setFiltroObjetivo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [rutinaAAsignar, setRutinaAAsignar] = useState<Rutina | null>(null)
  const [rutinaAEliminar, setRutinaAEliminar] = useState<Rutina | null>(null)
  const [diaExpandido, setDiaExpandido] = useState<Record<string, boolean>>({})

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

  // Si es ALUMNO, le mostramos directamente su rutina asignada
  if (usuarioActual.rol === 'ALUMNO') {
    const miRutina = getRutinaDeAlumno(usuarioActual.alumnoId || 'a1') || rutinas[0]
    return <VistaMiRutinaAlumno rutina={miRutina} usuario={usuarioActual} />
  }

  const toggleDia = (diaId: string) => {
    setDiaExpandido((prev) => ({ ...prev, [diaId]: !prev[diaId] }))
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
                  <button
                    onClick={() => setRutinaAEliminar(rutina)}
                    title="Eliminar rutina"
                    aria-label="Eliminar rutina"
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Estructura por Días:
                  </p>
                  {rutina.dias.map((dia) => {
                    const expandido = diaExpandido[dia.id] !== false // Default abierto o cerrado
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
                                className="flex items-center justify-between text-xs text-slate-400"
                              >
                                <span className="text-slate-300 font-medium truncate max-w-[200px]">
                                  • {ej.nombre}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 shrink-0">
                                  {ej.series}x{ej.repeticiones}
                                </span>
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
            setRutinaAEliminar(null)
          }}
        />
      )}

      {/* Modal: Crear Nueva Rutina */}
      {modalNuevaAbierto && (
        <ModalNuevaRutina
          onClose={() => setModalNuevaAbierto(false)}
          onSave={(nueva) => {
            agregarRutina(nueva)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
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
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (rutina: Omit<Rutina, 'id'>) => void
}) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [objetivo, setObjetivo] = useState('Hipertrofia')
  const [dias, setDias] = useState<DiaRutina[]>([
    {
      id: 'd-1',
      nombre: 'Día 1 — Pecho y Tríceps',
      ejercicios: [
        { id: 'e-1', nombre: 'Press Banca Plano', series: 4, repeticiones: '10', descansoSegundos: 90 },
        { id: 'e-2', nombre: 'Aperturas con Mancuernas', series: 3, repeticiones: '12', descansoSegundos: 60 },
      ],
    },
  ])

  const agregarDia = () => {
    const num = dias.length + 1
    setDias((prev) => [
      ...prev,
      {
        id: `d-${Date.now()}`,
        nombre: `Día ${num} — Nuevo Día`,
        ejercicios: [
          { id: `e-${Date.now()}`, nombre: 'Ejercicio 1', series: 4, repeticiones: '10', descansoSegundos: 60 },
        ],
      },
    ])
  }

  const agregarEjercicioADia = (diaId: string) => {
    setDias((prev) =>
      prev.map((d) =>
        d.id === diaId
          ? {
              ...d,
              ejercicios: [
                ...d.ejercicios,
                { id: `e-${Date.now()}`, nombre: 'Nuevo ejercicio', series: 3, repeticiones: '12', descansoSegundos: 60 },
              ],
            }
          : d
      )
    )
  }

  const actualizarNombreDia = (diaId: string, nuevoNombre: string) => {
    setDias((prev) => prev.map((d) => (d.id === diaId ? { ...d, nombre: nuevoNombre } : d)))
  }

  const actualizarEjercicio = (diaId: string, ejId: string, campo: string, valor: any) => {
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
    if (!nombre.trim()) return
    onSave({
      nombre,
      descripcion,
      objetivo,
      dias,
      esGenerica: true,
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl text-slate-900 border border-slate-200 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
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
                <div key={dia.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      value={dia.nombre}
                      onChange={(e) => actualizarNombreDia(dia.id, e.target.value)}
                      placeholder={`Día ${idx + 1}`}
                      className="font-bold text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => agregarEjercicioADia(dia.id)}
                      className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
                    >
                      + Ejercicio
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dia.ejercicios.map((ej) => (
                      <div key={ej.id} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <input
                          aria-label="Nombre del ejercicio"
                          value={ej.nombre}
                          onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'nombre', e.target.value)}
                          placeholder="Nombre del ejercicio"
                          className="flex-1 font-medium outline-none text-slate-800"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={ej.series}
                            onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'series', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-12 text-center bg-slate-100 rounded px-1 py-1 font-mono font-bold"
                            title="Series"
                            aria-label="Series"
                          />
                          <span className="text-slate-400">x</span>
                          <input
                            value={ej.repeticiones}
                            onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'repeticiones', e.target.value)}
                            placeholder="Reps"
                            className="w-16 text-center bg-slate-100 rounded px-1 py-1 font-mono font-bold"
                            title="Repeticiones"
                            aria-label="Repeticiones"
                          />
                          <button
                            type="button"
                            onClick={() => eliminarEjercicio(dia.id, ej.id)}
                            aria-label="Eliminar ejercicio"
                            className="text-slate-400 hover:text-rose-500 p-1 ml-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Busca un video de técnica cuyo título contenga alguna palabra clave del ejercicio. */
function buscarVideoParaEjercicio(nombre: string, videos: VideoTecnica[]): VideoTecnica | undefined {
  const palabras = nombre
    .toLowerCase()
    .split(/[\s,\-–—/]+/)
    .filter((w) => w.length > 3)
  return videos.find((v) =>
    palabras.some((p) => v.titulo.toLowerCase().includes(p))
  )
}

/** Formatea el resultado de una serie previa: "80 kg × 10" */
function formatPrevia(serie: RegistroSerie | undefined): string {
  if (!serie) return '—'
  return `${serie.kg} kg × ${serie.reps}`
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

        {/* iframe de YouTube */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={video.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

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

// ── Tarjeta de Ejercicio con Registro de Series ─────────────────────────────
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
  const [videoAbierto, setVideoAbierto] = useState(false)
  const videoMatch = useMemo(() => buscarVideoParaEjercicio(ejercicio.nombre, videos), [ejercicio.nombre, videos])

  const seriesCompletas = seriesData.filter((s) => s.completada).length
  const todasCompletas = seriesCompletas === ejercicio.series

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

  return (
    <>
      <div
        className={`rounded-2xl border bg-slate-950 p-5 flex flex-col gap-4 transition-[border-color] duration-200 ${
          todasCompletas ? 'border-blue-600/50' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Header del ejercicio */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className={`size-7 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
              todasCompletas ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400'
            }`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white leading-tight truncate">{ejercicio.nombre}</h3>
              {ejercicio.notas && (
                <p className="mt-0.5 text-xs text-slate-400 italic">💡 {ejercicio.notas}</p>
              )}
            </div>
          </div>
          {ejercicio.descansoSegundos && (
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              <Clock className="size-3" />
              {ejercicio.descansoSegundos}s
            </span>
          )}
        </div>

        {/* Tabla de series */}
        <div className="rounded-xl overflow-hidden border border-slate-800">
          {/* Header de tabla */}
          <div className="grid grid-cols-[32px_1fr_64px_56px_36px] gap-1 px-3 py-2 bg-slate-900 border-b border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Serie</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Previa</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">KG</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">REPS</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">✓</span>
          </div>

          {/* Filas de series */}
          {seriesData.map((serie) => {
            const previaData = sesionPrevia?.series.find((s) => s.serieNumero === serie.serieNumero)
            return (
              <div
                key={serie.serieNumero}
                className={`grid grid-cols-[32px_1fr_64px_56px_36px] gap-1 items-center px-3 py-2.5 border-b border-slate-800/50 last:border-0 transition-colors duration-150 ${
                  serie.completada ? 'bg-blue-600/10' : ''
                }`}
              >
                {/* Número de serie */}
                <span className={`text-sm font-black text-center ${serie.completada ? 'text-blue-400' : 'text-slate-400'}`}>
                  {serie.serieNumero}
                </span>

                {/* Previa */}
                <span className="text-xs text-slate-500 truncate">{formatPrevia(previaData)}</span>

                {/* Input KG */}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={serie.kg || ''}
                  onChange={(e) => handleCambioSerie(serie.serieNumero, 'kg', parseFloat(e.target.value) || 0)}
                  aria-label={`KG serie ${serie.serieNumero}`}
                  className="w-full text-center bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm rounded-lg px-1 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {/* Input REPS */}
                <input
                  type="number"
                  min={0}
                  value={serie.reps || ''}
                  onChange={(e) => handleCambioSerie(serie.serieNumero, 'reps', parseInt(e.target.value, 10) || 0)}
                  aria-label={`Reps serie ${serie.serieNumero}`}
                  className="w-full text-center bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm rounded-lg px-1 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {/* Checkbox de completado */}
                <button
                  onClick={() => toggleCompletada(serie.serieNumero)}
                  aria-label={serie.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                  className={`size-7 rounded-full flex items-center justify-center mx-auto transition-[background-color,border-color] duration-150 border-2 ${
                    serie.completada
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-transparent border-slate-600 hover:border-slate-400'
                  }`}
                >
                  {serie.completada && <Check className="size-3.5 text-white" strokeWidth={3} />}
                </button>
              </div>
            )
          })}
        </div>

        {/* Botón ver técnica */}
        {videoMatch && (
          <button
            onClick={() => setVideoAbierto(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-600/50 hover:text-blue-400 hover:bg-blue-600/5 transition-[color,background-color,border-color] duration-200 text-xs font-bold"
          >
            <PlayCircle className="size-4" />
            Ver técnica del ejercicio
          </button>
        )}
      </div>

      {videoAbierto && videoMatch && (
        <ModalVideoTecnica video={videoMatch} onClose={() => setVideoAbierto(false)} />
      )}
    </>
  )
}

// ── Vista dedicada para el Alumno en Rutinas ────────────────────────────────
function VistaMiRutinaAlumno({ rutina, usuario }: { rutina: Rutina; usuario: any }) {
  const { guardarSesion, getUltimaSesion, videosTecnica } = useAppData()
  const [diaActivo, setDiaActivo] = useState(0)
  const [guardado, setGuardado] = useState(false)

  const dia = rutina.dias[diaActivo] ?? rutina.dias[0]

  // Sesión previa para el día activo
  const sesionPrevia = useMemo(
    () => (dia ? getUltimaSesion(usuario.alumnoId || 'a1', rutina.id, dia.id) : undefined),
    [dia, getUltimaSesion, usuario.alumnoId, rutina.id]
  )

  // Estado local de las series actuales del día
  const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<Record<string, RegistroSerie[]>>(() => {
    if (!dia) return {}
    const inicial: Record<string, RegistroSerie[]> = {}
    dia.ejercicios.forEach((ej) => {
      const prevEj = sesionPrevia?.ejercicios.find((e) => e.ejercicioId === ej.id)
      inicial[ej.id] = Array.from({ length: ej.series }, (_, i) => ({
        serieNumero: i + 1,
        kg: prevEj?.series[i]?.kg ?? 0,
        reps: prevEj?.series[i]?.reps ?? 0,
        completada: false,
      }))
    })
    return inicial
  })

  // Reinicializar series cuando cambia el día activo
  const handleCambioDia = useCallback(
    (index: number) => {
      setDiaActivo(index)
      setGuardado(false)
      const nuevoDia = rutina.dias[index]
      if (!nuevoDia) return
      const prevDia = getUltimaSesion(usuario.alumnoId || 'a1', rutina.id, nuevoDia.id)
      const inicial: Record<string, RegistroSerie[]> = {}
      nuevoDia.ejercicios.forEach((ej) => {
        const prevEj = prevDia?.ejercicios.find((e) => e.ejercicioId === ej.id)
        inicial[ej.id] = Array.from({ length: ej.series }, (_, i) => ({
          serieNumero: i + 1,
          kg: prevEj?.series[i]?.kg ?? 0,
          reps: prevEj?.series[i]?.reps ?? 0,
          completada: false,
        }))
      })
      setSeriesPorEjercicio(inicial)
    },
    [rutina, getUltimaSesion, usuario.alumnoId]
  )

  const handleChangeSeries = useCallback((ejercicioId: string, series: RegistroSerie[]) => {
    setSeriesPorEjercicio((prev) => ({ ...prev, [ejercicioId]: series }))
    setGuardado(false)
  }, [])

  // Progreso del día
  const { completados, total } = useMemo(() => {
    if (!dia) return { completados: 0, total: 0 }
    let completados = 0
    dia.ejercicios.forEach((ej) => {
      const series = seriesPorEjercicio[ej.id] ?? []
      if (series.length > 0 && series.every((s) => s.completada)) completados++
    })
    return { completados, total: dia.ejercicios.length }
  }, [dia, seriesPorEjercicio])

  const handleGuardar = useCallback(() => {
    if (!dia) return
    const ejerciciosSesion: SesionEjercicio[] = dia.ejercicios.map((ej) => ({
      ejercicioId: ej.id,
      series: seriesPorEjercicio[ej.id] ?? [],
    }))
    guardarSesion({
      alumnoId: usuario.alumnoId || 'a1',
      rutinaId: rutina.id,
      diaId: dia.id,
      fecha: new Date().toISOString().slice(0, 10),
      ejercicios: ejerciciosSesion,
    })
    setGuardado(true)
  }, [dia, seriesPorEjercicio, guardarSesion, usuario.alumnoId, rutina.id])

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

          {/* Tarjetas de ejercicios */}
          <div className="grid gap-5 sm:grid-cols-2">
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
                  ¡Entreno guardado!
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Guardar Entreno
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
