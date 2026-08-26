// app/page.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Bell, Plus, WalletCards, Users, ArrowUpRight, X, ChevronRight } from 'lucide-react'
import { soloLetras, soloNumeros, emailValido } from '@/lib/validators'

const payments = [
  { name: 'María González', plan: 'Plan Premium', amount: '$45.000', time: 'Hoy, 09:42', initials: 'MG' },
  { name: 'Carlos Ramírez', plan: 'Plan Mensual', amount: '$30.000', time: 'Hoy, 08:16', initials: 'CR' },
  { name: 'Sofía Torres', plan: 'Plan Premium', amount: '$45.000', time: 'Ayer, 18:35', initials: 'ST' },
]
const routines = [
  { name: 'Hipertrofia — Nivel 2', student: 'Lucas Fernández', progress: 78, tone: 'bg-blue-600' },
  { name: 'Fuerza y potencia', student: 'Ana Martínez', progress: 54, tone: 'bg-blue-500' },
  { name: 'Acondicionamiento', student: 'Diego Silva', progress: 32, tone: 'bg-blue-400' },
]

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {action && (
        <Link href="/finanzas" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          {action}<ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  )
}

export default function Page() {
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')

  const [formAlumno, setFormAlumno] = useState({ nombre: '', email: '', dni: '', celular: '', plan: '' })
  const [erroresAlumno, setErroresAlumno] = useState<Record<string, string>>({})

  function validarAlumno() {
    const errores: Record<string, string> = {}
    if (formAlumno.nombre.trim().length < 3) errores.nombre = 'Ingresá el nombre completo'
    if (!emailValido(formAlumno.email)) errores.email = 'Correo inválido'
    if (formAlumno.dni.length < 7 || formAlumno.dni.length > 8) errores.dni = 'El DNI debe tener 7 u 8 dígitos'
    if (formAlumno.celular.length < 8 || formAlumno.celular.length > 13) errores.celular = 'Celular inválido'
    if (!formAlumno.plan) errores.plan = 'Seleccioná un plan'
    setErroresAlumno(errores)
    return Object.keys(errores).length === 0
  }

  function cerrarModalAlumno() {
    setShowModal(false)
    setFormAlumno({ nombre: '', email: '', dni: '', celular: '', plan: '' })
    setErroresAlumno({})
  }

  return (
    <>
      {/* HEADER SUPERIOR OSCURO */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-950 px-5 md:px-10">
        <div className="flex items-center gap-3 md:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">A</span>
          <span className="font-black tracking-[0.15em] text-white">ATLAS</span>
        </div>
        <div className="relative hidden w-80 sm:block group">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar alumnos, rutinas, pagos..." className="h-10 w-full rounded-full border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10" />
        </div>
        <div className="ml-auto flex items-center gap-6">
          <button className="relative text-slate-400 transition-all hover:text-white hover:scale-110" aria-label="Notificaciones">
            <Bell className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-slate-950 bg-blue-500" />
          </button>
          <div className="hidden h-8 w-px bg-slate-800 sm:block" />
          <p className="hidden text-right text-sm font-semibold sm:block text-slate-200">Martes, 24 de junio<br /><span className="text-xs font-medium text-slate-500">Buenos Aires, AR</span></p>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10">

        {/* SECCIÓN BIENVENIDA */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">Resumen de actividad</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Hola, Coach <span className="text-blue-500">Julián.</span></h1>
            <p className="mt-2 text-base text-slate-400">Esto es lo que está pasando en tu gimnasio hoy.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 border-transparent transition-all duration-300 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95">
            <Plus data-icon="inline-start" className="mr-2 size-5" />Nuevo Alumno
          </Button>
        </div>

        {/* TARJETAS SUPERIORES (BLANCAS Y FLOTANTES) */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 text-slate-900 border border-slate-200 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Alumnos activos</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">128</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600"><ArrowUpRight className="size-4" />12.5% <span className="font-medium text-slate-400">vs. mes anterior</span></p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-100"><Users className="size-7" /></div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-[72%] bg-blue-600 transition-all duration-500 group-hover:w-[75%]" />
          </article>

          <article className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-900/10 text-slate-900 border border-slate-200 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Cuotas pendientes</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">$186.400</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-500"><ArrowUpRight className="size-4" />8 pendientes <span className="font-medium text-slate-400">requieren atención</span></p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-rose-100"><WalletCards className="size-7" /></div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-[34%] bg-rose-500 transition-all duration-500 group-hover:w-[36%]" />
          </article>
        </section>

        {/* LISTAS INFERIORES (BLANCAS Y FLOTANTES) */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg text-slate-900 border border-slate-200">
            <SectionHeader title="Pagos recientes" action="Ver finanzas" />
            <div className="mt-2 flex flex-col">
              {payments.map((p) => (
                <div key={p.name} className="group flex items-center gap-4 border-b border-slate-100 py-4 last:border-0 hover:bg-slate-50 -mx-4 px-4 rounded-xl transition-colors">
                  <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600 transition-colors group-hover:bg-blue-100">{p.initials}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-slate-900">{p.name}</p>
                    <p className="text-sm font-medium text-slate-500">{p.plan} · {p.time}</p>
                  </div>
                  <p className="text-base font-black text-slate-900">{p.amount}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg text-slate-900 border border-slate-200">
            <SectionHeader title="Rutinas activas" action="Ver todas" />
            <div className="mt-4 flex flex-col gap-6">
              {routines.map((r) => (
                <div key={r.name} className="group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-bold text-slate-900">{r.name}</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-500">{r.student}</p>
                    </div>
                    <span className="text-sm font-black text-blue-600">{r.progress}%</span>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${r.tone} transition-all duration-1000 ease-out`} style={{ width: `${r.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-between border-t border-slate-800/50 pt-6 text-sm font-medium text-slate-500">
          <p>Última actualización hace 3 min</p>
          <p>ATLAS Admin · v2.4.0</p>
        </div>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="w-full max-w-md scale-100 rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl transition-transform">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="modal-title" className="text-2xl font-black text-slate-900">Nuevo alumno</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Agrega los datos para crear un perfil.</p>
              </div>
              <button onClick={cerrarModalAlumno} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!validarAlumno()) return
                cerrarModalAlumno()
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
                  className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.nombre ? 'border-rose-400' : 'border-slate-200'}`}
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
                  className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.email ? 'border-rose-400' : 'border-slate-200'}`}
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
                    className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.dni ? 'border-rose-400' : 'border-slate-200'}`}
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
                    className={`h-12 rounded-xl border bg-slate-50 px-4 font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.celular ? 'border-rose-400' : 'border-slate-200'}`}
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
                  onValueChange={(v) => setFormAlumno((prev) => ({ ...prev, plan: v ?? '' }))}
                >
                  <SelectTrigger className={`h-12 rounded-xl bg-slate-50 font-medium text-slate-900 focus:ring-4 focus:ring-blue-500/10 ${erroresAlumno.plan ? 'border-rose-400' : 'border-slate-200'}`}>
                    <SelectValue placeholder="Seleccioná un plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-xl">
                    <SelectItem value="mensual" className="font-semibold focus:bg-blue-50 focus:text-blue-700 py-2.5">Plan Mensual — $30.000</SelectItem>
                    <SelectItem value="premium" className="font-semibold focus:bg-blue-50 focus:text-blue-700 py-2.5">Plan Premium — $45.000</SelectItem>
                    <SelectItem value="trimestral" className="font-semibold focus:bg-blue-50 focus:text-blue-700 py-2.5">Plan Trimestral — $80.000</SelectItem>
                  </SelectContent>
                </Select>
                {erroresAlumno.plan && <span className="text-xs font-semibold text-rose-500">{erroresAlumno.plan}</span>}
              </label>

              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={cerrarModalAlumno} className="h-12 rounded-xl border-slate-200 px-6 font-bold text-slate-600 hover:bg-slate-50">Cancelar</Button>
                <Button type="submit" className="h-12 rounded-xl bg-blue-600 px-8 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95">Crear alumno</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}