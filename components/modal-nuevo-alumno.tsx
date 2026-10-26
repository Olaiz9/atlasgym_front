'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { soloLetras, soloNumeros, emailValido, validarDatosAlumno, generarUsernameAlumno } from '@/lib/validators'
import { fechaLocalHoy } from '@/lib/date-utils'
import { useToast } from '@/components/ui/toast'
import { useEscapeKey } from '@/lib/use-escape-key'

interface ModalNuevoAlumnoProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalNuevoAlumno({ isOpen, onClose }: ModalNuevoAlumnoProps) {
  const { agregarAlumno, planes, alumnos } = useAppData()
  const { toast } = useToast()
  const [formAlumno, setFormAlumno] = useState({ nombre: '', email: '', dni: '', celular: '', plan: '', planId: '' })
  const [erroresAlumno, setErroresAlumno] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDialogElement>(null)

  const planesActivos = planes.filter((p) => p.activo)
  const usuarioAutogenerado =
    formAlumno.nombre.trim().length >= 2 && formAlumno.dni.length >= 3
      ? generarUsernameAlumno(formAlumno.nombre, formAlumno.dni)
      : ''

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

  useEscapeKey(handleCerrar, isOpen)

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCerrar}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleCerrar()
      }}
      aria-labelledby="modal-nuevo-alumno-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-none bg-slate-950/80 p-4 backdrop-blur-sm backdrop:bg-transparent transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md scale-100 rounded-3xl border border-slate-800 bg-slate-900 p-7 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="modal-nuevo-alumno-title" className="text-2xl font-black text-white">Nuevo alumno</h2>
            <p className="mt-1 text-xs text-slate-400">Agregá los datos personales para crear su perfil y usuario automático en ATLAS.</p>
          </div>
          <button onClick={handleCerrar} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            <X className="size-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!validarAlumno()) return
            const creado = agregarAlumno({
              nombre: formAlumno.nombre,
              dni: formAlumno.dni,
              usuario: generarUsernameAlumno(formAlumno.nombre, formAlumno.dni),
              email: formAlumno.email.trim() || undefined,
              celular: formAlumno.celular,
              planId: formAlumno.planId || undefined,
              plan: formAlumno.plan,
              fechaAlta: fechaLocalHoy(),
              activo: true,
            })
            toast(`Alumno "${formAlumno.nombre}" registrado (Usuario: ${creado.usuario} - Clave inicial: DNI)`, 'success')
            handleCerrar()
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Nombre completo
            <input
              required
              autoFocus
              value={formAlumno.nombre}
              onChange={(e) => setFormAlumno({ ...formAlumno, nombre: soloLetras(e.target.value) })}
              maxLength={60}
              className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.nombre ? 'border-rose-500' : 'border-slate-700'}`}
              placeholder="Ej. Martín Gómez"
            />
            {erroresAlumno.nombre && <span className="text-xs font-semibold text-rose-400">{erroresAlumno.nombre}</span>}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
              DNI
              <input
                required
                inputMode="numeric"
                value={formAlumno.dni}
                onChange={(e) => setFormAlumno({ ...formAlumno, dni: soloNumeros(e.target.value).slice(0, 8) })}
                maxLength={8}
                className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.dni ? 'border-rose-500' : 'border-slate-700'}`}
                placeholder="Ej. 32456789"
              />
              {erroresAlumno.dni && <span className="text-xs font-semibold text-rose-400">{erroresAlumno.dni}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
              Celular
              <input
                required
                type="tel"
                inputMode="numeric"
                value={formAlumno.celular}
                onChange={(e) => setFormAlumno({ ...formAlumno, celular: soloNumeros(e.target.value).slice(0, 13) })}
                maxLength={13}
                className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.celular ? 'border-rose-500' : 'border-slate-700'}`}
                placeholder="Ej. 5491112345678"
              />
              {erroresAlumno.celular && <span className="text-xs font-semibold text-rose-400">{erroresAlumno.celular}</span>}
            </label>
          </div>

          {usuarioAutogenerado && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Usuario autogenerado:</span>
                <span className="font-mono font-black text-blue-400 text-sm">{usuarioAutogenerado}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                El socio podrá iniciar sesión con este usuario (o su DNI) y su número de DNI como contraseña inicial.
              </p>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Correo electrónico <span className="font-normal text-slate-500">(opcional)</span>
            <input
              type="email"
              value={formAlumno.email}
              onChange={(e) => setFormAlumno({ ...formAlumno, email: e.target.value })}
              maxLength={80}
              className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm text-white placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.email ? 'border-rose-500' : 'border-slate-700'}`}
              placeholder="correo@ejemplo.com"
            />
            {erroresAlumno.email && <span className="text-xs font-semibold text-rose-400">{erroresAlumno.email}</span>}
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
            Plan asignado
            <select
              aria-label="Plan asignado"
              required
              value={formAlumno.planId || formAlumno.plan}
              onChange={(e) => {
                const val = e.target.value
                const planObj = planes.find((p) => p.id === val || p.nombre === val)
                setFormAlumno((prev) => ({
                  ...prev,
                  plan: planObj?.nombre ?? val,
                  planId: planObj?.id ?? val,
                }))
                if (erroresAlumno.plan) {
                  setErroresAlumno((prev) => ({ ...prev, plan: '' }))
                }
              }}
              className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer ${erroresAlumno.plan ? 'border-rose-500' : 'border-slate-700'}`}
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">Seleccioná un plan activo</option>
              {planesActivos.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white font-semibold py-2">
                  {p.nombre} — ${p.precio.toLocaleString('es-AR')}
                </option>
              ))}
            </select>
            {erroresAlumno.plan && <span className="text-xs font-semibold text-rose-400">{erroresAlumno.plan}</span>}
          </label>

          <div className="mt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCerrar} className="h-11 rounded-xl border-slate-700 bg-transparent px-5 font-bold text-slate-300 hover:bg-slate-800 hover:text-white">Cancelar</Button>
            <Button type="submit" className="h-11 rounded-xl bg-blue-600 px-7 font-bold text-white shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95">Crear alumno</Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}