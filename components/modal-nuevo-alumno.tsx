'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { soloLetras, soloNumeros, emailValido, validarDatosAlumno } from '@/lib/validators'
import { fechaLocalHoy } from '@/lib/date-utils'

interface ModalNuevoAlumnoProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalNuevoAlumno({ isOpen, onClose }: ModalNuevoAlumnoProps) {
  const { agregarAlumno, planes, alumnos } = useAppData()
  const [formAlumno, setFormAlumno] = useState({ nombre: '', email: '', dni: '', celular: '', plan: '', planId: '' })
  const [erroresAlumno, setErroresAlumno] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDialogElement>(null)

  const planesActivos = planes.filter((p) => p.activo)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  function validarAlumno() {
    const errores = validarDatosAlumno(formAlumno, true, alumnos)
    setErroresAlumno(errores)
    return Object.keys(errores).length === 0
  }

  function handleCerrar() {
    setFormAlumno({ nombre: '', email: '', dni: '', celular: '', plan: '', planId: '' })
    setErroresAlumno({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCerrar}
      aria-labelledby="modal-nuevo-alumno-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-none bg-slate-950/60 p-4 backdrop-blur-sm backdrop:bg-transparent"
    >
      <div className="w-full max-w-md scale-100 rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="modal-nuevo-alumno-title" className="text-2xl font-black text-slate-900">Nuevo alumno</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Agrega los datos para crear un perfil.</p>
          </div>
          <button onClick={handleCerrar} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!validarAlumno()) return
            agregarAlumno({
              nombre: formAlumno.nombre,
              dni: formAlumno.dni,
              email: formAlumno.email,
              celular: formAlumno.celular,
              planId: formAlumno.planId || undefined,
              plan: formAlumno.plan,
              fechaAlta: fechaLocalHoy(),
              activo: true,
            })
            handleCerrar()
          }}
          className="mt-6 flex flex-col gap-5"
        >
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
            Nombre completo
            <input
              required
              value={formAlumno.nombre}
              onChange={(e) => setFormAlumno({ ...formAlumno, nombre: soloLetras(e.target.value) })}
              maxLength={60}
              className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.nombre ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="Ej. Martín Gómez"
            />
            {erroresAlumno.nombre && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.nombre}</span>}
          </label>

          <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
            Correo electrónico
            <input
              required
              type="email"
              value={formAlumno.email}
              onChange={(e) => setFormAlumno({ ...formAlumno, email: e.target.value })}
              maxLength={80}
              className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.email ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="correo@ejemplo.com"
            />
            {erroresAlumno.email && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.email}</span>}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              DNI
              <input
                required
                inputMode="numeric"
                value={formAlumno.dni}
                onChange={(e) => setFormAlumno({ ...formAlumno, dni: soloNumeros(e.target.value).slice(0, 8) })}
                maxLength={8}
                className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.dni ? 'border-rose-400' : 'border-slate-200'}`}
                placeholder="Ej. 32456789"
              />
              {erroresAlumno.dni && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.dni}</span>}
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
              Celular
              <input
                required
                type="tel"
                inputMode="numeric"
                value={formAlumno.celular}
                onChange={(e) => setFormAlumno({ ...formAlumno, celular: soloNumeros(e.target.value).slice(0, 13) })}
                maxLength={13}
                className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.celular ? 'border-rose-400' : 'border-slate-200'}`}
                placeholder="Ej. 5491112345678"
              />
              {erroresAlumno.celular && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.celular}</span>}
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-bold text-slate-700">
            Plan asignado
            <Select
              required
              value={formAlumno.plan}
              onValueChange={(v) => {
                const planObj = planes.find((p) => p.nombre === v);
                setFormAlumno((prev) => ({ ...prev, plan: v ?? '', planId: planObj?.id ?? '' }));
              }}
            >
              <SelectTrigger className={`h-12 rounded-xl bg-slate-50 font-medium text-slate-900 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.plan ? 'border-rose-400' : 'border-slate-200'}`}>
                <SelectValue placeholder="Seleccioná un plan activo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                {planesActivos.map((p) => (
                  <SelectItem key={p.id} value={p.nombre} className="font-semibold focus:bg-blue-50 focus:text-blue-700 py-2.5">
                    {p.nombre} — ${p.precio.toLocaleString('es-AR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {erroresAlumno.plan && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.plan}</span>}
          </label>

          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCerrar} className="h-12 rounded-xl border-slate-200 px-6 font-bold text-slate-600 hover:bg-slate-50">Cancelar</Button>
            <Button type="submit" className="h-12 rounded-xl bg-blue-600 px-8 font-bold text-white shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95">Crear alumno</Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}