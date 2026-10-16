'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Bell, Users, User, AlertCircle, Info, Clock } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { CategoriaAviso, CATEGORIA_AVISO_LABEL } from '@/lib/types'
import { fechaLocalHoy } from '@/lib/date-utils'
import { useToast } from '@/components/ui/toast'
import { useEscapeKey } from '@/lib/use-escape-key'

interface ModalNuevoAvisoProps {
  isOpen: boolean
  onClose: () => void
}

export function ModalNuevoAviso({ isOpen, onClose }: ModalNuevoAvisoProps) {
  const { crearAviso, alumnos } = useAppData()
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [categoria, setCategoria] = useState<CategoriaAviso>('IMPORTANTE')
  const [paraTodos, setParaTodos] = useState(true)
  const [alumnoId, setAlumnoId] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {}
    if (titulo.trim().length < 3) {
      nuevosErrores.titulo = 'El título debe tener al menos 3 caracteres'
    }
    if (mensaje.trim().length < 5) {
      nuevosErrores.mensaje = 'El mensaje debe tener al menos 5 caracteres'
    }
    if (!paraTodos && !alumnoId) {
      nuevosErrores.alumnoId = 'Debes seleccionar un alumno destinatario'
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function handleCerrar() {
    setTitulo('')
    setMensaje('')
    setCategoria('IMPORTANTE')
    setParaTodos(true)
    setAlumnoId('')
    setErrores({})
    onClose()
  }

  useEscapeKey(handleCerrar, isOpen)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return

    crearAviso({
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      categoria,
      fecha: fechaLocalHoy(),
      paraTodos,
      alumnoId: paraTodos ? undefined : alumnoId,
    })

    toast(`Aviso "${titulo.trim()}" publicado exitosamente`, 'success')
    handleCerrar()
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCerrar}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleCerrar()
      }}
      aria-labelledby="modal-nuevo-aviso-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-none bg-slate-950/60 p-4 backdrop-blur-sm backdrop:bg-transparent transition-opacity duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg scale-100 rounded-3xl border border-slate-800 bg-slate-900 p-7 text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 id="modal-nuevo-aviso-title" className="text-xl font-black text-white">
                Nuevo comunicado o aviso
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Publicá avisos generales o mensajes para alumnos específicos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            aria-label="Cerrar modal"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="aviso-titulo" className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Título del aviso
            </label>
            <input
              id="aviso-titulo"
              required
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
              placeholder="Ej. Feriado de Carnaval / Aviso de cuota pendiente"
              className={`h-11 rounded-xl border bg-slate-800/80 px-4 text-sm font-medium text-white placeholder-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 ${
                errores.titulo ? 'border-rose-500/60' : 'border-slate-700/80'
              }`}
            />
            {errores.titulo && (
              <span className="text-xs font-semibold text-rose-400">{errores.titulo}</span>
            )}
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="aviso-categoria" className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['IMPORTANTE', 'NOVEDAD', 'HORARIO'] as const).map((cat) => {
                const activo = categoria === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-[color,background-color,border-color] duration-150 ${
                      activo
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat === 'IMPORTANTE' && <AlertCircle className="size-3.5 text-rose-400" />}
                    {cat === 'NOVEDAD' && <Info className="size-3.5 text-blue-400" />}
                    {cat === 'HORARIO' && <Clock className="size-3.5 text-emerald-400" />}
                    {CATEGORIA_AVISO_LABEL[cat]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Destinatario: General vs Particular */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Destinatario
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setParaTodos(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-[color,background-color,border-color] duration-150 ${
                  paraTodos
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="size-4" />
                Todos los alumnos
              </button>
              <button
                type="button"
                onClick={() => setParaTodos(false)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-[color,background-color,border-color] duration-150 ${
                  !paraTodos
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <User className="size-4" />
                Alumno específico
              </button>
            </div>

            {!paraTodos && (
              <div className="mt-1 flex flex-col gap-1">
                <label htmlFor="aviso-alumno" className="text-xs font-semibold text-slate-400">
                  Seleccionar alumno
                </label>
                <select
                  id="aviso-alumno"
                  value={alumnoId}
                  onChange={(e) => setAlumnoId(e.target.value)}
                  className={`h-11 rounded-xl border bg-slate-800/80 px-3 text-sm font-medium text-white outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 ${
                    errores.alumnoId ? 'border-rose-500/60' : 'border-slate-700/80'
                  }`}
                >
                  <option value="" className="bg-slate-900 text-slate-300">-- Elegir alumno --</option>
                  {alumnos.map((al) => (
                    <option key={al.id} value={al.id} className="bg-slate-900 text-white">
                      {al.nombre} ({al.plan})
                    </option>
                  ))}
                </select>
                {errores.alumnoId && (
                  <span className="text-xs font-semibold text-rose-400">{errores.alumnoId}</span>
                )}
              </div>
            )}
          </div>

          {/* Mensaje */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="aviso-mensaje" className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contenido del aviso
            </label>
            <textarea
              id="aviso-mensaje"
              required
              rows={4}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribí aquí el mensaje o comunicado detallado..."
              className={`rounded-xl border bg-slate-800/80 p-3 text-sm font-medium text-white placeholder-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-blue-500 focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/10 resize-none ${
                errores.mensaje ? 'border-rose-500/60' : 'border-slate-700/80'
              }`}
            />
            {errores.mensaje && (
              <span className="text-xs font-semibold text-rose-400">{errores.mensaje}</span>
            )}
          </div>

          {/* Botones de acción */}
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCerrar}
              className="h-11 rounded-xl border-slate-700 bg-slate-800/50 px-5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-95"
            >
              Publicar aviso
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
