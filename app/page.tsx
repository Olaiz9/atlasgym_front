// app/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Bell, Plus, WalletCards, Users, ArrowUpRight, ChevronRight, Dumbbell, Sparkles, Calendar, UserCheck, CheckCircle2 } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { ESTADO_CUENTA_LABEL, obtenerMontoRecaudadoPago, obtenerSaldoPendientePago } from '@/lib/types'
import { calcularVencimientoCuota } from '@/lib/date-utils'
import { obtenerCiudadPorCoordenadas } from '@/lib/geocoding'
import { ModalNuevoAlumno } from '@/components/modal-nuevo-alumno'
import { NotificacionesDropdown } from '@/components/notificaciones-dropdown'
import { calcularConstanciaAlumno, calcularSemanaAlumno, filtrarAsistenciasActivas, type ConstanciaAlumno } from '@/lib/asistencia-utils'


function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="text-3xl font-black text-white">{title}</h2>
      {action && (
        <Link href={href || "/finanzas"} className="flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
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
  cantNoLeidos?: number
  fechaHoy: Date | null
  ubicacion: string
}) {
  return (
    <div className="ml-auto flex items-center gap-6">
      <NotificacionesDropdown />
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
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              Aviso del gimnasio
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
  fechaHoy,
  constancia,
}: {
  alumno: any
  estadoCuenta: string
  rutina: any
  fechaHoy?: Date | null
  constancia: ConstanciaAlumno
}) {
  const diaUno = rutina?.dias[0]
  const nombreRutina = rutina ? rutina.nombre : 'Sin rutina asignada'
  const subtituloRutina = diaUno ? diaUno.nombre : (rutina ? 'Rutina activa' : 'Consultá a tu profesor')
  const detalleRutina = diaUno
    ? `${diaUno.ejercicios.length} ejercicios para hoy`
    : (rutina ? `${rutina.dias.length} días de plan` : 'Pedí tu rutina en recepción')

  const etiquetaEstadoCuota =
    estadoCuenta === 'MOROSO'
      ? 'Vencido'
      : (ESTADO_CUENTA_LABEL[estadoCuenta as keyof typeof ESTADO_CUENTA_LABEL] || estadoCuenta)

  const colorSubtituloCuota =
    estadoCuenta === 'AL_DIA'
      ? 'text-emerald-600'
      : estadoCuenta === 'PENDIENTE'
      ? 'text-amber-600'
      : 'text-rose-600'

  return (
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))]">
      {/* Tarjeta 1: Mi Rutina */}
      <Link
        href="/rutinas"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900/60 p-7 shadow-sm transition-[transform,border-color] duration-200 hover:shadow-xl hover:shadow-blue-950/30 text-slate-100 border border-slate-800 hover:border-blue-500/40 cursor-pointer backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-400">Mi rutina de hoy</span>
            <p className="mt-2 text-2xl font-black text-white break-words text-balance">{nombreRutina}</p>
            <p className="mt-1 text-sm font-semibold text-blue-400">{subtituloRutina}</p>
            <p className="mt-4 text-xs font-medium text-slate-400">{detalleRutina}</p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/25 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 group-hover:bg-blue-600 group-hover:text-white shadow-sm shrink-0">
            <Dumbbell className="size-7" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
          <span>{rutina ? 'Ver ejercicios y series' : 'Explorar rutinas'}</span>
          <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-blue-500" />
      </Link>

      {/* Tarjeta 2: Mi Cuota */}
      <Link
        href="/finanzas"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900/60 p-7 shadow-sm transition-[transform,border-color] duration-200 hover:shadow-xl hover:shadow-emerald-950/30 text-slate-100 border border-slate-800 hover:border-emerald-500/40 cursor-pointer backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-400">Estado de mi cuota</span>
            <p className="mt-2 text-2xl font-black text-white">{etiquetaEstadoCuota}</p>
            <p className={`mt-1 text-sm font-semibold ${colorSubtituloCuota}`}>{alumno?.plan || 'Plan Musculación'}</p>
            <p className="mt-4 text-xs font-medium text-slate-400">
              Vence el {calcularVencimientoCuota(estadoCuenta, fechaHoy || undefined)}
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 group-hover:bg-emerald-600 group-hover:text-white shadow-sm shrink-0">
            <WalletCards className="size-7" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
          <span>Ver mis pagos y datos de cuota</span>
          <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-emerald-500" />
      </Link>

      {/* Tarjeta 3: Mi Constancia */}
      <Link
        href="/rutinas"
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900/60 p-7 shadow-sm transition-[transform,border-color] duration-200 hover:shadow-xl hover:shadow-amber-950/30 text-slate-100 border border-slate-800 hover:border-amber-500/40 cursor-pointer backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-400">Mi constancia</span>
            <p className="mt-2 text-2xl font-black text-white">
              {constancia.entrenosMes} {constancia.entrenosMes === 1 ? 'entreno' : 'entrenos'}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-400">registrados este mes</p>
            <p className="mt-4 text-xs font-medium text-slate-500">
              {constancia.ultimaVisita ? `Última visita: ${constancia.ultimaVisita}` : 'Todavía no registraste ingresos'}
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25 transition-[color,background-color,border-color,opacity,transform,translate,scale,rotate] duration-200 group-hover:bg-amber-500 group-hover:text-white shadow-sm shrink-0">
            <Sparkles className="size-7" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
          <span>¡Mantené el ritmo esta semana!</span>
          <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-amber-500" />
      </Link>
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
  const { alumnos, planes, asistencias, getEstadoCuenta, getRutinaDeAlumno, getCantidadAvisosNoLeidos, getAvisosParaUsuario } = useAppData()
  const alumno = usuario.alumnoId ? alumnos.find((a) => a.id === usuario.alumnoId) : undefined
  const constancia = useMemo(
    () => calcularConstanciaAlumno(asistencias, alumno?.id),
    [asistencias, alumno?.id]
  )
  const planDelAlumno =
    (alumno?.planId ? planes.find((p) => p.id === alumno.planId) : undefined) ||
    planes.find((p) => p.nombre.trim().toLowerCase() === (alumno?.plan || '').trim().toLowerCase())
  const semana = useMemo(
    () => calcularSemanaAlumno(asistencias, alumno?.id, planDelAlumno?.diasPorSemana ?? alumno?.plan),
    [asistencias, alumno?.id, planDelAlumno?.diasPorSemana, alumno?.plan]
  )
  const estadoCuenta = alumno ? getEstadoCuenta(alumno.id) : 'AL_DIA'
  const rutina = alumno ? getRutinaDeAlumno(alumno.id) : undefined

  const cantAvisosNoLeidos = getCantidadAvisosNoLeidos(usuario)
  const avisosAlumno = getAvisosParaUsuario(usuario)
  const ultimoAvisoNoLeido = avisosAlumno.find((av) => !av.leidoPor.includes(usuario.id))


  return (
    <>
      {/* Header Superior */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-950 px-4 sm:px-6 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center md:hidden shrink-0">
            <Image
              src="/logo-atlas-blanco.png"
              alt="ATLAS GYM"
              width={120}
              height={67}
              className="h-8 w-auto object-contain"
              priority
            />
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-600/15 text-blue-400 border border-blue-500/20 text-xs font-bold shrink-0">
            Portal del alumno
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
            <p className="mb-2 text-sm font-semibold text-slate-400">Mi panel de entrenamiento</p>
            <h1 className="text-5xl font-black text-white md:text-7xl">
              ¡Hola, {usuario.nombre.split(' ')[0]}!
            </h1>
            <p className="mt-2 text-base text-slate-400">
              Tenés todo listo para romperla en tu entrenamiento de hoy.
            </p>
          </div>
          <Link
            href="/rutinas"
            className="inline-flex items-center gap-2 h-12 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition-[color,background-color,transform] duration-200 hover:bg-blue-500 active:scale-95 text-sm"
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
          fechaHoy={fechaHoy}
          constancia={constancia}
        />

        {/* Tu semana: qué días vino y cuántos le quedan según su plan (misma cuenta que el tótem) */}
        <section aria-labelledby="titulo-tu-semana" className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 md:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="titulo-tu-semana" className="text-4xl font-black text-white">Tu semana</h2>
              <p className="mt-1 text-sm text-slate-400">
                {semana.limite == null
                  ? `Viniste ${semana.diasAsistidos} ${semana.diasAsistidos === 1 ? 'día' : 'días'} esta semana. Tu plan es libre.`
                  : semana.excedido
                  ? `Viniste ${semana.diasAsistidos} días y tu plan es de ${semana.limite}. Hablalo en el mostrador para cambiar de plan.`
                  : semana.restantes === 0
                  ? `Ya usaste los ${semana.limite} días de tu plan esta semana. El lunes se renuevan.`
                  : `Te ${semana.restantes === 1 ? 'queda 1 día' : `quedan ${semana.restantes} días`} de los ${semana.limite} de tu plan.`}
              </p>
            </div>
            {semana.limite != null && (
              <p className={`font-display text-5xl font-black leading-none tabular-nums ${semana.excedido ? 'text-amber-400' : 'text-white'}`}>
                {semana.diasAsistidos}
                <span className="text-2xl text-slate-500">/{semana.limite}</span>
              </p>
            )}
          </div>

          <ol className="mt-6 grid grid-cols-7 gap-2" aria-label="Días de esta semana">
            {semana.dias.map((d) => (
              <li key={d.fecha} className="flex flex-col items-center gap-2">
                <span className={`text-xs font-bold ${d.esHoy ? 'text-blue-400' : 'text-slate-500'}`}>{d.letra}</span>
                <span
                  aria-label={`${d.fecha}: ${d.fue ? 'viniste' : d.futuro ? 'todavía no llegó' : 'no viniste'}${d.esHoy ? ' (hoy)' : ''}`}
                  className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-xl border-2 text-sm font-bold ${
                    d.fue
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : d.esHoy
                      ? 'border-blue-500 border-dashed text-blue-300'
                      : d.futuro
                      ? 'border-slate-800 text-slate-600'
                      : 'border-slate-700 bg-slate-950/60 text-slate-500'
                  }`}
                >
                  {d.fue ? <CheckCircle2 className="size-5" /> : Number(d.fecha.slice(8))}
                </span>
              </li>
            ))}
          </ol>
        </section>

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
  const { usuarioActual, alumnos, pagos, planes, rutinas, asistencias, getCantidadAvisosNoLeidos, getEstadoCuenta } = useAppData()
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')
  const cantAvisosNoLeidos = getCantidadAvisosNoLeidos(usuarioActual)

  // Cálculos dinámicos en base a los datos reales del Store
  const alumnosActivos = alumnos.filter((a) => a.activo).length
  const sociosEnSala = useMemo(() => {
    return filtrarAsistenciasActivas(asistencias)
  }, [asistencias])
  // Lo que se debe = saldos de comprobantes abiertos (señas, pendientes, vencidos) + la cuota del plan
  // de cada socio activo PENDIENTE/MOROSO que no tiene ningún comprobante abierto (el caso más común:
  // todavía no pagó nada este mes, así que no existe comprobante que sumar).
  const { totalPendiente, sociosQueDeben } = useMemo(() => {
    const abiertos = pagos.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'VENCIDO' || p.estado === 'PARCIAL')
    let total = abiertos.reduce((acc, p) => acc + obtenerSaldoPendientePago(p), 0)
    const conComprobanteAbierto = new Set(abiertos.map((p) => p.alumnoId))
    const deudores = new Set(conComprobanteAbierto)
    for (const a of alumnos) {
      if (!a.activo) continue
      const estado = getEstadoCuenta(a.id)
      if (estado !== 'PENDIENTE' && estado !== 'MOROSO') continue
      deudores.add(a.id)
      if (!conComprobanteAbierto.has(a.id)) {
        total += planes.find((pl) => pl.id === a.planId)?.precio ?? 0
      }
    }
    return { totalPendiente: total, sociosQueDeben: deudores.size }
  }, [pagos, alumnos, planes, getEstadoCuenta])
  const pagosOrdenados = useMemo(
    () => [...pagos.filter((p) => p.estado === 'PAGADO' || p.estado === 'PARCIAL')].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [pagos]
  );
  const alumnosMap = useMemo(
    () => new Map(alumnos.map((a) => [a.id, a])),
    [alumnos]
  );
  const ultimosPagos = useMemo(() => {
    const res = [];
    const q = query.trim().toLowerCase();

    for (const p of pagosOrdenados) {
      if (res.length >= 5) break;
      const al = alumnosMap.get(p.alumnoId);
      const nombre = al ? al.nombre : (p.alumnoNombreHistorico || 'Alumno Atlas');
      if (!q || nombre.toLowerCase().includes(q) || p.plan.toLowerCase().includes(q)) {
        res.push({
          id: p.id,
          name: nombre,
          plan: p.plan,
          amount: `$${obtenerMontoRecaudadoPago(p).toLocaleString('es-AR')}`,
          time: p.fecha,
          initials: (al ? al.nombre : (p.alumnoNombreHistorico || 'AT'))
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join(''),
        });
      }
    }
    return res;
  }, [pagosOrdenados, alumnosMap, query]);

  const [fechaHoy, setFechaHoy] = useState<Date | null>(null);
  const [ubicacion, setUbicacion] = useState("Detectando ubicación...")

  useEffect(() => {
    setFechaHoy(new Date());
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

  if (!usuarioActual) {
    return null;
  }

  if (usuarioActual.rol === 'ALUMNO') {
    return <HomeAlumno usuario={usuarioActual} fechaHoy={fechaHoy} ubicacion={ubicacion} />
  }

  return (

    <>
      {/* HEADER SUPERIOR OSCURO */}
      <header className="flex h-20 items-center justify-between border-b border-slate-800/50 bg-slate-950 px-5 md:px-10">
        <div className="flex items-center md:hidden">
          <Image
            src="/logo-atlas-blanco.png"
            alt="ATLAS GYM"
            width={120}
            height={67}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <div className="relative hidden w-80 sm:block group">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en pagos recientes..."
            aria-label="Buscar en pagos recientes"
            className="h-10 w-full rounded-full border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-sm text-slate-200 outline-none transition-[border-color,background-color] duration-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10"
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
            <p className="mb-2 text-sm font-semibold text-slate-400">Resumen de actividad</p>
            <h1 className="text-5xl font-black text-white md:text-7xl">Hola, {usuarioActual.nombre}.</h1>
            <p className="mt-2 text-base text-slate-400">Esto es lo que está pasando en tu gimnasio hoy.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="h-12 rounded-xl bg-blue-600 px-6 font-bold text-white border-transparent transition-colors duration-200 hover:bg-blue-500 active:scale-95">
            <Plus data-icon="inline-start" className="mr-2 size-5" />Nuevo alumno
          </Button>
        </div>

        {/* MARCADOR: lo que falta cobrar, quiénes están y el padrón */}
        <section
          aria-label="Resumen de hoy"
          className="mt-10 grid border-y-2 border-slate-700 lg:grid-cols-3"
        >
          <Link
            href="/finanzas"
            className="group block min-w-0 py-6 pr-6 text-slate-100 transition-colors hover:bg-slate-900/40 lg:pl-0"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <WalletCards className="size-4 text-rose-400" />
              Cuotas pendientes
            </p>
            <p className="mt-2 font-display text-5xl font-black leading-[0.9] text-rose-400 break-all xl:text-7xl">
              ${totalPendiente.toLocaleString('es-AR')}
            </p>
            <p className="mt-3 flex items-center gap-1 text-sm text-slate-400">
              {sociosQueDeben} {sociosQueDeben === 1 ? 'socio' : 'socios'} con cuota impaga
              <ArrowUpRight className="size-4 text-slate-500 transition-transform group- group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            href="/asistencias"
            className="group block border-t border-slate-800 py-6 text-slate-100 transition-colors hover:bg-slate-900/40 lg:border-l lg:border-t-0 lg:px-6"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
              </span>
              En sala ahora
            </p>
            <p className="mt-2 font-display text-5xl font-black leading-[0.9] text-white xl:text-7xl">{sociosEnSala.length}</p>
            <p className="mt-3 flex items-center gap-1 text-sm text-slate-400">
              Sesión activa &lt; 1h 40m
              <ArrowUpRight className="size-4 text-slate-500 transition-transform group- group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            href="/alumnos"
            className="group block border-t border-slate-800 py-6 text-slate-100 transition-colors hover:bg-slate-900/40 lg:border-l lg:border-t-0 lg:px-6"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Users className="size-4 text-blue-400" />
              Alumnos activos
            </p>
            <p className="mt-2 font-display text-5xl font-black leading-[0.9] text-white xl:text-7xl">{alumnosActivos}</p>
            <p className="mt-3 flex items-center gap-1 text-sm text-slate-400">
              {alumnos.length} registrados en total
              <ArrowUpRight className="size-4 text-slate-500 transition-transform group- group-hover:translate-x-0.5" />
            </p>
          </Link>
        </section>

        {/* LISTAS INFERIORES */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-900 p-6 text-slate-100 md:p-7">
            <SectionHeader title="Pagos recientes" action="Ver finanzas" />
            <div className="mt-2 flex flex-col">
              {ultimosPagos.length === 0 ? (
                <p className="py-6 text-sm text-slate-500 text-center font-medium">No hay pagos registrados aún.</p>
              ) : (
                ultimosPagos.map((p) => (
                  <div key={p.id} className="group flex items-center gap-4 border-b border-slate-800/60 py-4 last:border-0 hover:bg-slate-800/40 -mx-4 px-4 rounded-xl transition-colors">
                    <span className="flex size-11 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20 text-sm font-black text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">{p.initials}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-white">{p.name}</p>
                      <p className="text-sm font-medium text-slate-400">{p.plan} · {p.time}</p>
                    </div>
                    <p className="text-base font-black text-white">{p.amount}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-slate-100 md:p-7">
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
                        <p className="text-base font-bold text-white">{r.nombre}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400 truncate max-w-[240px]">{nombresAlumnos}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">{r.objetivo}</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full ${colores[idx % colores.length]} transition-[width] duration-1000 ease-out`} style={{ width: `${porcentajes[idx % porcentajes.length]}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-between border-t border-slate-800/50 pt-6 text-sm font-medium text-slate-500">
          <p>Datos sincronizados con el servidor del gimnasio</p>
          <p>ATLAS Admin · v2.4.0</p>
        </div>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      <ModalNuevoAlumno isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
