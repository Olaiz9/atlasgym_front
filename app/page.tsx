// app/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Bell, Plus, WalletCards, Users, ArrowUpRight, ChevronRight, Dumbbell, PlayCircle, Sparkles, Calendar } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { ESTADO_CUENTA_LABEL } from '@/lib/types'
import { obtenerCiudadPorCoordenadas } from '@/lib/geocoding'
import { ModalNuevoAlumno } from '@/components/modal-nuevo-alumno'

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

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function HeaderStatusSection({
  cantNoLeidos,
  fechaHoy,
  ubicacion,
}: {
  cantNoLeidos: number
  fechaHoy: Date | null
  ubicacion: string
}) {
  return (
    <div className="ml-auto flex items-center gap-6">
      <Link
        href="/avisos"
        title={cantNoLeidos > 0 ? `${cantNoLeidos} avisos sin leer` : 'Avisos y Comunicados'}
        className="relative text-slate-400 transition-[color,transform] duration-200 hover:text-white hover:scale-110"
        aria-label={cantNoLeidos > 0 ? `${cantNoLeidos} avisos sin leer` : 'Avisos'}
      >
        <Bell className="size-5" />
        {cantNoLeidos > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-slate-950">
            {cantNoLeidos}
          </span>
        )}
      </Link>
      <div className="hidden h-8 w-px bg-slate-800 sm:block" />
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
  )
}

function AvisoBannerDestacado({ aviso }: { aviso: { fecha: string; titulo: string } }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
          <Bell className="size-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              Aviso del Gimnasio
            </span>
            <span className="text-xs text-slate-400 font-medium">{aviso.fecha}</span>
          </div>
          <p className="text-sm font-bold text-white mt-0.5">{aviso.titulo}</p>
        </div>
      </div>
      <Link
        href="/avisos"
        className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
      >
        Leer aviso completo <ChevronRight className="size-3.5" />
      </Link>
    </div>
  )
}

function AlumnoCardsSection({
  alumno,
  estadoCuenta,
  rutina,
}: {
  alumno: any
  estadoCuenta: string
  rutina: any
}) {
  const diaUno = rutina?.dias[0]
  const nombreRutina = rutina ? rutina.nombre : 'Sin rutina asignada'
  const subtituloRutina = diaUno ? diaUno.nombre : (rutina ? 'Rutina activa' : 'Consultá a tu profesor')
  const detalleRutina = diaUno
    ? `${diaUno.ejercicios.length} ejercicios para hoy`
    : (rutina ? `${rutina.dias.length} días de plan` : 'Pedí tu rutina en recepción')

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Tarjeta 1: Mi Rutina */}
      <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mi Rutina de hoy</span>
            <p className="mt-2 text-2xl font-black text-slate-900">{nombreRutina}</p>
            <p className="mt-1 text-sm font-semibold text-blue-600">{subtituloRutina}</p>
            <p className="mt-4 text-xs font-medium text-slate-500">{detalleRutina}</p>
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
      <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado de mi cuota</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {ESTADO_CUENTA_LABEL[estadoCuenta as keyof typeof ESTADO_CUENTA_LABEL] || estadoCuenta}
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
      <div className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl text-slate-900 border border-slate-200">
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
  const { alumnos, getEstadoCuenta, getRutinaDeAlumno, getCantidadAvisosNoLeidos, getAvisosParaUsuario } = useAppData()
  const alumno = alumnos.find((a) => a.id === usuario.alumnoId) || alumnos[0]
  const estadoCuenta = alumno ? getEstadoCuenta(alumno.id) : 'AL_DIA'
  const rutina = alumno ? getRutinaDeAlumno(alumno.id) : undefined

  const cantAvisosNoLeidos = getCantidadAvisosNoLeidos(usuario)
  const avisosAlumno = getAvisosParaUsuario(usuario)
  const ultimoAvisoNoLeido = avisosAlumno.find((av) => !av.leidoPor.includes(usuario.id))

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
        <HeaderStatusSection
          cantNoLeidos={cantAvisosNoLeidos}
          fechaHoy={fechaHoy}
          ubicacion={ubicacion}
        />
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-10 md:py-10 space-y-8">
        {/* Banner de Aviso no leído si existe */}
        {ultimoAvisoNoLeido && <AvisoBannerDestacado aviso={ultimoAvisoNoLeido} />}

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
            href="/rutinas"
            className="inline-flex items-center gap-2 h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 active:scale-95 text-sm"
          >
            <Dumbbell className="size-4" />
            Empezar entrenamiento
          </Link>
        </div>

        {/* 3 Tarjetas de Impacto */}
        <AlumnoCardsSection
          alumno={alumno}
          estadoCuenta={estadoCuenta}
          rutina={rutina}
        />

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
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 transition-[transform,box-shadow,border-color] duration-300 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20"
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
  const { usuarioActual, alumnos, pagos, rutinas, getCantidadAvisosNoLeidos } = useAppData()
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')
  const cantAvisosNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  // Cálculos dinámicos en base a los datos reales del Store
  const alumnosActivos = alumnos.filter((a) => a.activo).length
  const pagosPendientes = pagos.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'VENCIDO')
  const totalPendiente = pagosPendientes.reduce((acc, p) => acc + p.monto, 0)
  const ultimosPagos = useMemo(() => {
    const alumnosMap = new Map(alumnos.map((a) => [a.id, a]))
    const ordenados = [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha))
    const res = []
    const q = query.trim().toLowerCase()

    for (const p of ordenados) {
      if (res.length >= 5) break
      const al = alumnosMap.get(p.alumnoId)
      const nombre = al ? al.nombre : 'Alumno Atlas'
      if (!q || nombre.toLowerCase().includes(q) || p.plan.toLowerCase().includes(q)) {
        res.push({
          id: p.id,
          name: nombre,
          plan: p.plan,
          amount: `$${p.monto.toLocaleString('es-AR')}`,
          time: p.fecha,
          initials: (al ? al.nombre : 'AT')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join(''),
        })
      }
    }
    return res
  }, [pagos, alumnos, query])

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
    const controller = new AbortController();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        obtenerCiudadPorCoordenadas(latitude, longitude, controller.signal).then((loc) => {
          if (!controller.signal.aborted) {
            setUbicacion(loc);
          }
        });
      },
      () => setUbicacion("Ubicación no disponible"),
      { timeout: 8000 }
    );
    return () => controller.abort();
  }, []);

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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en pagos recientes..."
            aria-label="Buscar en pagos recientes"
            className="h-10 w-full rounded-full border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-sm text-slate-200 outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <HeaderStatusSection
          cantNoLeidos={cantAvisosNoLeidos}
          fechaHoy={fechaHoy}
          ubicacion={ubicacion}
        />
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10">

        {/* SECCIÓN BIENVENIDA */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-500">Resumen de actividad</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Hola, <span className="text-blue-500">{usuarioActual.nombre}.</span></h1>
            <p className="mt-2 text-base text-slate-400">Esto es lo que está pasando en tu gimnasio hoy.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 border-transparent transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-blue-500/30 active:scale-95">
            <Plus data-icon="inline-start" className="mr-2 size-5" />Nuevo Alumno
          </Button>
        </div>

        {/* TARJETAS SUPERIORES (BLANCAS Y FLOTANTES) */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 text-slate-900 border border-slate-200 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Alumnos activos</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">{alumnosActivos}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600"><ArrowUpRight className="size-4" />{alumnos.length} registrados <span className="font-medium text-slate-400">en total</span></p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-100"><Users className="size-7" /></div>
            </div>
            <div
              className="absolute bottom-0 left-0 h-1.5 bg-blue-600 transition-[width] duration-500"
              style={{ width: `${alumnos.length > 0 ? Math.round((alumnosActivos / alumnos.length) * 100) : 0}%` }}
            />
          </article>

          <article className="group relative overflow-hidden rounded-2xl bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-900/10 text-slate-900 border border-slate-200 cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">Cuotas pendientes</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">${totalPendiente.toLocaleString('es-AR')}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-bold text-rose-500"><ArrowUpRight className="size-4" />{pagosPendientes.length} pendientes <span className="font-medium text-slate-400">requieren atención</span></p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-rose-100"><WalletCards className="size-7" /></div>
            </div>
            <div
              className="absolute bottom-0 left-0 h-1.5 bg-rose-500 transition-[width] duration-500"
              style={{ width: `${pagos.length > 0 ? Math.round((pagosPendientes.length / pagos.length) * 100) : 0}%` }}
            />
          </article>
        </section>

        {/* LISTAS INFERIORES (BLANCAS Y FLOTANTES) */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-lg text-slate-900 border border-slate-200">
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

          <div className="rounded-2xl bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-lg text-slate-900 border border-slate-200">
            <SectionHeader title="Rutinas activas" action="Ver todas" href="/rutinas" />
            <div className="mt-4 flex flex-col gap-5">
              {rutinas.slice(0, 3).map((r, idx) => {
                const alumnosAsignados = alumnos.filter((a) => a.rutinaId === r.id);
                const nombresAlumnos = alumnosAsignados.length > 0 
                  ? alumnosAsignados.map(a => a.nombre).join(', ')
                  : 'Sin alumnos asignados';
                const colores = ['bg-blue-600', 'bg-blue-500', 'bg-blue-400'];
                const porcentajes = [85, 60, 40];
                return (
                  <div key={r.id} className="group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">{r.nombre}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 truncate max-w-[240px]">{nombresAlumnos}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">{r.objetivo}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${colores[idx % colores.length]} transition-[width] duration-1000 ease-out`} style={{ width: `${porcentajes[idx % porcentajes.length]}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-between border-t border-slate-800/50 pt-6 text-sm font-medium text-slate-500">
          <p>Última actualización hace 3 min</p>
          <p>ATLAS Admin · v2.4.0</p>
        </div>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      <ModalNuevoAlumno isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}