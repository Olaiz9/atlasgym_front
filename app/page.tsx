// app/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Bell, Plus, WalletCards, Users, ArrowUpRight, X, ChevronRight, Dumbbell, PlayCircle, Sparkles, Calendar } from 'lucide-react'
import { useAppData } from '@/lib/store'
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

const VIDEOS_DESTACADOS = [
  {
    titulo: 'Press de Banca con Mancuernas',
    categoria: 'Pecho',
    duracion: '01:45',
    nivel: 'Técnica estricta',
    thumbnail: 'bg-gradient-to-br from-blue-900/60 to-slate-900',
  },
  {
    titulo: 'Sentadilla Profunda y Postura',
    categoria: 'Piernas',
    duracion: '02:10',
    nivel: 'Biomecánica',
    thumbnail: 'bg-gradient-to-br from-indigo-900/60 to-slate-900',
  },
  {
    titulo: 'Remo con Barra Agarre Prono',
    categoria: 'Espalda',
    duracion: '01:30',
    nivel: 'Activación dorsal',
    thumbnail: 'bg-gradient-to-br from-cyan-900/60 to-slate-900',
  },
]

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {action && (
        <Link href={href || "/finanzas"} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          {action}<ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  )
}

// ---------- Home personalizado para el Alumno ----------
function HomeAlumno({
  usuario,
  fechaHoy,
  ubicacion,
}: {
  usuario: any
  fechaHoy: Date | null
  ubicacion: string
}) {
  const { alumnos, getEstadoCuenta, getRutinaDeAlumno } = useAppData()
  const alumno = alumnos.find((a) => a.id === usuario.alumnoId) || alumnos[0]
  const estadoCuenta = alumno ? getEstadoCuenta(alumno.id) : 'AL_DIA'
  const rutina = alumno ? getRutinaDeAlumno(alumno.id) : undefined
  const diaUno = rutina?.dias[0]

  function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }

  return (
    <>
      {/* Header Superior */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-950 px-5 md:px-10">
        <div className="flex items-center gap-3 md:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">A</span>
          <span className="font-black tracking-[0.15em] text-white">ATLAS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-600/15 text-blue-400 border border-blue-500/20 text-xs font-bold">
            Portal del Alumno
          </span>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <p className="hidden text-right text-sm font-semibold sm:block text-slate-200">
            {fechaHoy
              ? capitalizar(
                  fechaHoy.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'America/Argentina/Buenos_Aires',
                  })
                )
              : 'Cargando fecha...'}
            <br />
            <span className="text-xs font-medium text-slate-500">{ubicacion}</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-10 space-y-10">
        {/* Bienvenida Alumno */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-500">Mi Panel de Entrenamiento</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              ¡Hola, <span className="text-blue-500">{usuario.nombre.split(' ')[0]}</span>! 💪
            </h1>
            <p className="mt-2 text-base text-slate-400">
              Tenés todo listo para romperla en tu entrenamiento de hoy.
            </p>
          </div>
          <Link
            href={`/alumnos/${usuario.alumnoId || 'a1'}`}
            className="inline-flex items-center gap-2 h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95 text-sm"
          >
            <Dumbbell className="size-4" />
            Empezar entrenamiento
          </Link>
        </div>

        {/* 3 Tarjetas de Impacto */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Tarjeta 1: Mi Rutina */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mi Rutina de hoy</span>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {rutina ? rutina.nombre : 'Sin rutina asignada'}
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-600">
                  {diaUno ? diaUno.nombre : (rutina ? 'Rutina activa' : 'Consultá a tu profesor')}
                </p>
                <p className="mt-4 text-xs font-medium text-slate-500">
                  {diaUno ? `${diaUno.ejercicios.length} ejercicios para hoy` : (rutina ? `${rutina.dias.length} días de plan` : 'Pedí tu rutina en recepción')}
                </p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110">
                <Dumbbell className="size-7" />
              </div>
            </div>
            <Link
              href="/rutinas"
              className="mt-5 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {rutina ? 'Ver ejercicios y series' : 'Explorar rutinas'} <ChevronRight className="size-3.5" />
            </Link>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-blue-600" />
          </div>

          {/* Tarjeta 2: Mi Cuota */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado de mi cuota</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {estadoCuenta === 'AL_DIA' ? 'Al día' : estadoCuenta}
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">{alumno?.plan || 'Plan Musculación'}</p>
                <p className="mt-1 text-xs text-slate-500 font-medium">Vence el 10 de Septiembre</p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
                <WalletCards className="size-7" />
              </div>
            </div>
            <Link
              href="/finanzas"
              className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Ver mis pagos y datos de cuota <ChevronRight className="size-3.5" />
            </Link>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-emerald-500" />
          </div>

          {/* Tarjeta 3: Mi Asistencia */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mi Constancia</span>
                <p className="mt-2 text-2xl font-black text-slate-900">12 entrenos</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">registrados este mes</p>
                <p className="mt-4 text-xs font-medium text-slate-500">Última visita: Hace 2 días</p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110">
                <Sparkles className="size-7" />
              </div>
            </div>
            <div className="mt-5 text-xs font-bold text-slate-500">
              ¡Mantené el ritmo esta semana! 🔥
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-amber-500" />
          </div>
        </div>

        {/* Sección: Videoteca Destacada */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                <PlayCircle className="size-4" />
                Videoteca ATLAS
              </div>
              <h2 className="text-2xl font-black text-white">Técnica y Ejecución de Ejercicios</h2>
              <p className="text-sm text-slate-400 mt-1">
                Mirá los videos de técnica correcta para optimizar tu entrenamiento y prevenir lesiones.
              </p>
            </div>
            <Link
              href="/videoteca"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors shrink-0"
            >
              Explorar videoteca completa <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VIDEOS_DESTACADOS.map((v) => (
              <Link
                key={v.titulo}
                href="/videoteca"
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20"
              >
                <div className={`h-36 w-full rounded-xl ${v.thumbnail} flex items-center justify-center relative overflow-hidden border border-slate-800 group-hover:border-blue-500/30 transition-colors`}>
                  <div className="size-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <PlayCircle className="size-6" />
                  </div>
                  <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-300 border border-slate-800">
                    {v.duracion}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-600/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                      {v.categoria}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{v.nivel}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {v.titulo}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sección: Información & Horarios de ATLAS */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="font-bold text-slate-200">Horarios de atención de ATLAS Gym</p>
              <p className="text-xs text-slate-500">Lunes a Viernes: 07:00 a 22:00 hs · Sábados: 09:00 a 14:00 hs</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500">ATLAS Gym · Tu mejor versión cada día</p>
        </div>
      </div>
    </>
  )
}

export default function Page() {
  const { usuarioActual, agregarAlumno, alumnos, pagos, rutinas, planes } = useAppData()
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')

  const [formAlumno, setFormAlumno] = useState({ nombre: '', email: '', dni: '', celular: '', plan: '' })
  const [erroresAlumno, setErroresAlumno] = useState<Record<string, string>>({})

  // Cálculos dinámicos en base a los datos reales del Store
  const alumnosActivos = alumnos.filter((a) => a.activo).length
  const pagosPendientes = pagos.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'VENCIDO')
  const totalPendiente = pagosPendientes.reduce((acc, p) => acc + p.monto, 0)
  const ultimosPagos = [...pagos]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 3)
    .map((p) => {
      const al = alumnos.find((a) => a.id === p.alumnoId)
      return {
        id: p.id,
        name: al ? al.nombre : 'Alumno Atlas',
        plan: p.plan,
        amount: `$${p.monto.toLocaleString('es-AR')}`,
        time: p.fecha,
        initials: (al ? al.nombre : 'AT')
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join(''),
      }
    })

  const [fechaHoy, setFechaHoy] = useState<Date | null>(null);
  const [ubicacion, setUbicacion] = useState("Detectando ubicación...")

  useEffect(() => {
  setFechaHoy(new Date());
  // Por si la pestaña queda abierta hasta pasar la medianoche
  const intervalo = setInterval(() => setFechaHoy(new Date()), 60_000);
  return () => clearInterval(intervalo);
}, []);

useEffect(() => {
  if (!("geolocation" in navigator)) {
    setUbicacion("Ubicación no disponible");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
        );
        const data = await res.json();
        const ciudad = data.city || data.locality || data.principalSubdivision;
        setUbicacion(ciudad ? `${ciudad}, ${data.countryCode}` : "Ubicación no disponible");
      } catch {
        setUbicacion("Ubicación no disponible");
      }
    },
    () => setUbicacion("Ubicación no disponible"),
    { timeout: 8000 }
  );
}, []);

  function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

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

  if (usuarioActual.rol === 'ALUMNO') {
    return <HomeAlumno usuario={usuarioActual} fechaHoy={fechaHoy} ubicacion={ubicacion} />
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
          <p className="hidden text-right text-sm font-semibold sm:block text-slate-200">
            {fechaHoy
              ? capitalizar(
                  fechaHoy.toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "America/Argentina/Buenos_Aires",
                  })
                )
              : "Cargando fecha..."}
            <br />
            <span className="text-xs font-medium text-slate-500">{ubicacion}</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10">

        {/* SECCIÓN BIENVENIDA */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">Resumen de actividad</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Hola, <span className="text-blue-500">{usuarioActual.nombre}.</span></h1>
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
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">{alumnosActivos}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600"><ArrowUpRight className="size-4" />{alumnos.length} registrados <span className="font-medium text-slate-400">en total</span></p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-100"><Users className="size-7" /></div>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-[72%] bg-blue-600 transition-all duration-500 group-hover:w-[75%]" />
          </article>

          <article className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-900/10 text-slate-900 border border-slate-200 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Cuotas pendientes</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">${totalPendiente.toLocaleString('es-AR')}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-500"><ArrowUpRight className="size-4" />{pagosPendientes.length} pendientes <span className="font-medium text-slate-400">requieren atención</span></p>
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
              {ultimosPagos.length === 0 ? (
                <p className="py-6 text-sm text-slate-400 text-center font-medium">No hay pagos registrados aún.</p>
              ) : (
                ultimosPagos.map((p) => (
                  <div key={p.id} className="group flex items-center gap-4 border-b border-slate-100 py-4 last:border-0 hover:bg-slate-50 -mx-4 px-4 rounded-xl transition-colors">
                    <span className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600 transition-colors group-hover:bg-blue-100">{p.initials}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-slate-900">{p.name}</p>
                      <p className="text-sm font-medium text-slate-500">{p.plan} · {p.time}</p>
                    </div>
                    <p className="text-base font-black text-slate-900">{p.amount}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg text-slate-900 border border-slate-200">
            <SectionHeader title="Rutinas activas" action="Ver todas" href="/rutinas" />
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
                agregarAlumno({
                  nombre: formAlumno.nombre,
                  email: formAlumno.email,
                  celular: formAlumno.celular,
                  plan: formAlumno.plan,
                  fechaAlta: new Date().toISOString().split('T')[0],
                  activo: true,
                })
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
                    {planes.map((p) => (
                      <SelectItem key={p.id} value={p.nombre} className="font-semibold focus:bg-blue-50 focus:text-blue-700 py-2.5">
                        {p.nombre} — ${p.precio.toLocaleString('es-AR')}
                      </SelectItem>
                    ))}
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