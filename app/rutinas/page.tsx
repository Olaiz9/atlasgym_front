'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAppData } from '@/lib/store'
import { Rutina, DiaRutina, Ejercicio, Alumno } from '@/lib/types'
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
} from 'lucide-react'

const OBJETIVOS = ['TODOS', 'Hipertrofia', 'Fuerza', 'Adaptación', 'Funcional']

export default function RutinasPage() {
  const { rutinas, alumnos, usuarioActual, agregarRutina, asignarRutinaAAlumno, eliminarRutina, getRutinaDeAlumno } =
    useAppData()

  const [filtroObjetivo, setFiltroObjetivo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [rutinaAAsignar, setRutinaAAsignar] = useState<Rutina | null>(null)
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
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 ${
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
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar rutina..."
            className="pl-9 pr-4 h-10 text-sm bg-slate-900 border border-slate-800 text-white rounded-full outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-full sm:w-64 placeholder:text-slate-500"
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
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-slate-700"
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/15 text-blue-400 border border-blue-500/20">
                    <Flame className="size-3" />
                    {rutina.objetivo}
                  </span>
                  <button
                    onClick={() => eliminarRutina(rutina.id)}
                    title="Eliminar rutina"
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white py-2.5 text-xs font-bold text-slate-200 transition-all duration-300 active:scale-95"
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Elegir Alumno:
            </label>
            <select
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
              className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all duration-300 active:scale-95"
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre de la Rutina</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Hipertrofia 4 Días"
                required
                className="w-full px-3.5 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Objetivo</label>
              <select
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Descripción (opcional)</label>
            <input
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
                          value={ej.nombre}
                          onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'nombre', e.target.value)}
                          placeholder="Nombre del ejercicio"
                          className="flex-1 font-medium outline-none text-slate-800"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={ej.series}
                            onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'series', Number(e.target.value))}
                            className="w-12 text-center bg-slate-100 rounded px-1 py-1 font-mono font-bold"
                            title="Series"
                          />
                          <span className="text-slate-400">x</span>
                          <input
                            value={ej.repeticiones}
                            onChange={(e) => actualizarEjercicio(dia.id, ej.id, 'repeticiones', e.target.value)}
                            placeholder="Reps"
                            className="w-16 text-center bg-slate-100 rounded px-1 py-1 font-mono font-bold"
                            title="Repeticiones"
                          />
                          <button
                            type="button"
                            onClick={() => eliminarEjercicio(dia.id, ej.id)}
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
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all duration-300 active:scale-95"
            >
              Guardar Rutina
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Vista dedicada para el Alumno en Rutinas ----------
function VistaMiRutinaAlumno({ rutina, usuario }: { rutina: Rutina; usuario: any }) {
  const [diaActivo, setDiaActivo] = useState(0)
  const dia = rutina.dias[diaActivo] || rutina.dias[0]

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

      {/* Selector de Días en Pestañas */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rutina.dias.map((d, index) => (
          <button
            key={d.id}
            onClick={() => setDiaActivo(index)}
            className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 active:scale-95 shrink-0 ${
              diaActivo === index
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {d.nombre}
          </button>
        ))}
      </div>

      {/* Lista de Ejercicios del Día Activo */}
      {dia && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-xl font-black text-white">{dia.nombre}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{dia.ejercicios.length} ejercicios para hoy</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dia.ejercicios.map((ej, i) => (
              <div
                key={ej.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between transition-all hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="size-7 rounded-lg bg-blue-600/20 text-blue-400 font-mono font-black text-xs flex items-center justify-center">
                      0{i + 1}
                    </span>
                    {ej.descansoSegundos && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        <Clock className="size-3 text-slate-400" />
                        {ej.descansoSegundos}s descanso
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white">{ej.nombre}</h3>
                  {ej.notas && (
                    <p className="mt-1 text-xs text-slate-400 italic">💡 {ej.notas}</p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Series</span>
                      <span className="text-lg font-black text-white">{ej.series}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Reps</span>
                      <span className="text-lg font-black text-blue-400">{ej.repeticiones}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
