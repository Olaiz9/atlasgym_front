'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/store'
import { Plan } from '@/lib/types'
import { Package, Plus, Pencil, Trash2, X, Check, DollarSign, Calendar, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PlanesPage() {
  const { planes, agregarPlan, actualizarPlan, eliminarPlan, usuarioActual } = useAppData()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [planAEditar, setPlanAEditar] = useState<Plan | null>(null)

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [diasPorSemana, setDiasPorSemana] = useState('Libre')
  const [activo, setActivo] = useState(true)

  function abrirCrear() {
    setPlanAEditar(null)
    setNombre('')
    setPrecio('')
    setDescripcion('')
    setDiasPorSemana('Libre')
    setActivo(true)
    setModalAbierto(true)
  }

  function abrirEditar(plan: Plan) {
    setPlanAEditar(plan)
    setNombre(plan.nombre)
    setPrecio(plan.precio.toString())
    setDescripcion(plan.descripcion || '')
    setDiasPorSemana(plan.diasPorSemana || 'Libre')
    setActivo(plan.activo)
    setModalAbierto(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = parseInt(precio, 10)
    if (!nombre.trim() || isNaN(precioNum) || precioNum <= 0) return

    if (planAEditar) {
      actualizarPlan(planAEditar.id, {
        nombre: nombre.trim(),
        precio: precioNum,
        descripcion: descripcion.trim(),
        diasPorSemana,
        activo,
      })
    } else {
      agregarPlan({
        nombre: nombre.trim(),
        precio: precioNum,
        descripcion: descripcion.trim(),
        diasPorSemana,
        activo,
      })
    }
    setModalAbierto(false)
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500 mb-1">
            <Package className="size-4" />
            <span>Administración de Membresías</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Planes y <span className="text-blue-500">Tarifas</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-400 max-w-2xl">
            Ajustá los precios de las cuotas, creá nuevos planes o actualizá las condiciones de cada pase. Los cambios impactan inmediatamente en Alumnos y Finanzas.
          </p>
        </div>

        {usuarioActual.rol === 'ADMIN' && (
          <Button
            onClick={abrirCrear}
            className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 border-transparent transition-all duration-300 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95 shrink-0"
          >
            <Plus className="mr-2 size-5" />
            Nuevo Plan
          </Button>
        )}
      </div>

      {/* Grid de Planes */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {planes.map((plan) => (
          <div
            key={plan.id}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
              plan.activo
                ? 'border-slate-800 bg-slate-900/50 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/30'
                : 'border-slate-800/40 bg-slate-950/40 opacity-70'
            }`}
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-600/10 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20">
                    <Calendar className="size-3" />
                    {plan.diasPorSemana || 'Pase Libre'}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">{plan.nombre}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => abrirEditar(plan)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar plan y precio"
                  >
                    <Pencil className="size-4" />
                  </button>
                  {planes.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Seguro que querés eliminar el plan "${plan.nombre}"?`)) {
                          eliminarPlan(plan.id)
                        }
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar plan"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Precio */}
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tight text-white">
                  ${plan.precio.toLocaleString('es-AR')}
                </span>
                <span className="text-xs font-bold text-slate-500">/ mes</span>
              </div>

              {/* Descripción */}
              <p className="mt-3 text-sm text-slate-400 leading-relaxed min-h-[40px]">
                {plan.descripcion || 'Acceso general según los horarios del gimnasio.'}
              </p>
            </div>

            {/* Footer de la tarjeta */}
            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  plan.activo ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <span className={`size-2 rounded-full ${plan.activo ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                {plan.activo ? 'Disponible para inscripción' : 'Pausado'}
              </span>

              <Button
                variant="ghost"
                onClick={() => abrirEditar(plan)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 h-8 px-3 rounded-lg"
              >
                Modificar precio
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR / EDITAR PLAN */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {planAEditar ? 'Modificar Plan' : 'Nuevo Plan de Gimnasio'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {planAEditar
                    ? 'Actualizá el importe o los detalles para los nuevos cobros.'
                    : 'Agregá una nueva opción de cuota a la lista.'}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
                Nombre del Plan
                <input
                  required
                  placeholder="Ej: Pase Libre Musculación"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
                  Precio mensual ($)
                  <input
                    required
                    type="number"
                    min={1}
                    placeholder="Ej: 20000"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
                  Frecuencia / Días
                  <select
                    value={diasPorSemana}
                    onChange={(e) => setDiasPorSemana(e.target.value)}
                    className="h-11 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="Libre">Libre (Lunes a Sábado)</option>
                    <option value="5 días por semana">5 días por semana</option>
                    <option value="3 días por semana">3 días por semana</option>
                    <option value="2 días por semana">2 días por semana</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
                Descripción para el alumno
                <textarea
                  rows={2}
                  placeholder="Qué incluye este plan..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm text-white outline-none focus:border-blue-500 resize-none"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="size-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                Plan activo (disponible para nuevas inscripciones)
              </label>

              <div className="mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAbierto(false)}
                  className="h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
                >
                  {planAEditar ? 'Guardar cambios' : 'Crear plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
