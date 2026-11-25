// app/page.tsx
'use client'

import { HORARIOS_ATLAS } from '@/lib/constants'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Plus, ChevronRight, Dumbbell, Play, Clock, AlertCircle, MessageCircle } from 'lucide-react'
import { useAppData } from '@/lib/store'
import { Ejercicio, ESTADO_CUENTA_LABEL, obtenerMaxPeriodoCubiertoAlumno, obtenerMontoRecaudadoPago, obtenerSaldoPendientePago, UsuarioSesion } from '@/lib/types'
import { EstadoCuentaEtiqueta } from '@/components/estado-cuenta-etiqueta'
import { calcularVencimientoCuota, fechaLocalHoy } from '@/lib/date-utils'
import { diaInicialDeRutina } from '@/lib/rutina-utils'
import { construirUrlWaMe, mensajeRecordatorioCuotaWhatsapp, tieneCelularWhatsappValido } from '@/lib/whatsapp-utils'
import { obtenerCiudadPorCoordenadas } from '@/lib/geocoding'
import { ModalNuevoAlumno } from '@/components/modal-nuevo-alumno'
import { NotificacionesDropdown } from '@/components/notificaciones-dropdown'
import { BotonPerfilMovil } from '@/components/modal-perfil'
import { calcularConstanciaAlumno, calcularSemanaAlumno, filtrarAsistenciasActivas, type SemanaAlumno } from '@/lib/asistencia-utils'



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
    <div className="ml-auto flex items-center gap-1 sm:gap-6">
      <NotificacionesDropdown />
      <BotonPerfilMovil />
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

function Separador() {
  return <span aria-hidden="true" className="mx-1.5 opacity-60">|</span>
}

function TuSemana({ semana, entrenosMes, ultimaVisita }: { semana: SemanaAlumno; entrenosMes: number; ultimaVisita?: string | null }) {
  const resumen =
    semana.limite == null
      ? `Viniste ${semana.diasAsistidos} ${semana.diasAsistidos === 1 ? 'día' : 'días'} esta semana. Tu plan es libre.`
      : semana.excedido
      ? `Viniste ${semana.diasAsistidos} días y tu plan es de ${semana.limite}. Hablalo en el mostrador para cambiar de plan.`
      : semana.restantes === 0
      ? `Ya usaste los ${semana.limite} días de tu plan esta semana. El lunes se renuevan.`
      : `Te ${semana.restantes === 1 ? 'queda 1 día' : `quedan ${semana.restantes} días`} de tu plan esta semana.`

  return (
    <section aria-labelledby="titulo-tu-semana" className="rounded-2xl bg-[#162A50] p-4 md:rounded-[20px] md:border md:border-[#22396A] md:px-7 md:py-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-tu-semana" className="text-[17px] font-bold text-white md:text-lg md:font-semibold">Tu semana</h2>
        {semana.limite != null && (
          <span className={`font-display text-[26px] font-extrabold ${semana.excedido ? 'text-amber-400' : 'text-white'}`}>
            {semana.diasAsistidos} <span className="text-lg text-slate-500">/ {semana.limite}</span>
          </span>
        )}
      </div>
      <ol aria-label="Días de esta semana" className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500 md:mt-4 md:gap-2 md:text-[13px]">
        {semana.dias.map((d) => (
          <li key={d.fecha}>
            <span
              className={`mb-1 block h-[38px] rounded-lg md:mb-1.5 md:h-9 ${
                d.fue ? 'bg-blue-600' : d.futuro ? 'border border-dashed border-slate-700' : 'bg-[#1E3663]'
              } ${d.esHoy ? 'outline outline-2 outline-offset-2 outline-blue-400' : ''}`}
            />
            {d.esHoy ? <strong className="text-slate-100">Hoy</strong> : d.letra}
            <span className="sr-only">: {d.fue ? 'viniste' : d.futuro ? 'todavía no llegó' : 'no viniste'}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-400">
        {resumen} <span className="hidden md:inline">Este mes llevás {entrenosMes} {entrenosMes === 1 ? 'entrenamiento' : 'entrenamientos'}.</span>
      </p>
      {ultimaVisita && <p className="mt-1 hidden text-[13px] text-slate-500 md:block">Última visita: {ultimaVisita}</p>}
    </section>
  )
}

// ---------- Home personalizado para el Alumno ----------
function HomeAlumno({ usuario, fechaHoy }: { usuario: UsuarioSesion; fechaHoy: Date | null }) {
  const { alumnos, planes, asistencias, sesionesEntrenamiento, getEstadoCuenta, getPagosDeAlumno, getRutinaDeAlumno, getAvisosParaUsuario } = useAppData()
  const alumno = usuario.alumnoId ? alumnos.find((a) => a.id === usuario.alumnoId) : undefined
  const constancia = useMemo(
    () => calcularConstanciaAlumno(asistencias, alumno?.id),
    [asistencias, alumno?.id]
  )
  const plan =
    (alumno?.planId ? planes.find((p) => p.id === alumno.planId) : undefined) ||
    planes.find((p) => p.nombre.trim().toLowerCase() === (alumno?.plan || '').trim().toLowerCase())
  const semana = useMemo(
    () => calcularSemanaAlumno(asistencias, alumno?.id, plan?.diasPorSemana ?? alumno?.plan),
    [asistencias, alumno?.id, plan?.diasPorSemana, alumno?.plan]
  )
  const estadoCuenta = alumno ? getEstadoCuenta(alumno.id) : 'AL_DIA'
  const rutina = alumno ? getRutinaDeAlumno(alumno.id) : undefined
  const indiceDia = rutina && alumno ? diaInicialDeRutina(rutina, sesionesEntrenamiento, alumno.id, fechaLocalHoy()) : 0
  const dia = rutina?.dias[indiceDia]
  const avisos = getAvisosParaUsuario(usuario)
  const pagos = alumno ? getPagosDeAlumno(alumno.id).filter((p) => p.estado !== 'ANULADO') : []
  const vencimiento = calcularVencimientoCuota(estadoCuenta, fechaHoy || undefined, obtenerMaxPeriodoCubiertoAlumno(pagos))
  const planTexto = semana.limite ? `${semana.limite} ${semana.limite === 1 ? 'día' : 'días'}` : alumno?.plan || 'Sin plan'
  const detalleEjercicio = (ej: Ejercicio) =>
    ej.tipoSerie === 'BI_SERIE'
      ? `Bi-serie, ${ej.series} vueltas`
      : ej.tipoSerie === 'DROP_SET'
      ? `Drop set, ${ej.series} series`
      : `${ej.series} series de ${ej.repeticiones}`

  return (
    <>
      <header className="flex items-center justify-between px-5 pb-2 pt-5 md:hidden">
        <Image src="/logo-atlas-blanco.png" alt="ATLAS Gym" width={120} height={67} className="h-[26px] w-auto object-contain" priority />
        <BotonPerfilMovil />
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-5 pb-28 pt-1.5 md:gap-8 md:px-14 md:pb-16 md:pt-12">
        <header>
          <p className="mb-2 hidden text-sm text-[#8296BB] md:block">
            {fechaHoy
              ? capitalizar(fechaHoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }))
              : ' '}
          </p>
          <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px] md:font-bold md:leading-none">
            Hola, {usuario.nombre.split(' ')[0]}
          </h1>
        </header>

        <div className="flex flex-col gap-3.5 md:gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-col gap-3.5 md:gap-8 lg:flex-[2]">
            <div className="order-2 md:order-1">
              {/* Celular: la rutina es un solo botón grande */}
              <Link href="/rutinas" className="flex items-center gap-3.5 rounded-2xl bg-blue-600 p-4 text-white md:hidden">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Dumbbell className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] opacity-85">Mi rutina de hoy</span>
                  <span className="block truncate font-display text-2xl font-bold uppercase">{dia?.nombre ?? rutina?.nombre ?? 'Sin rutina asignada'}</span>
                  <span className="block text-[13px] opacity-85">
                    {dia ? `${dia.ejercicios.length} ejercicios` : 'Consultá a tu profesor'}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </Link>

              <section aria-labelledby="titulo-rutina-hoy" className="hidden flex-col gap-5 rounded-[20px] border border-[#22396A] bg-[#162A50] p-7 md:flex">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#8296BB]">
                      Mi rutina de hoy{rutina && rutina.dias.length > 1 ? `, día ${indiceDia + 1} de ${rutina.dias.length}` : ''}
                    </p>
                    <h2 id="titulo-rutina-hoy" className="mt-1.5 text-[26px] font-semibold text-white">{dia?.nombre ?? rutina?.nombre ?? 'Sin rutina asignada'}</h2>
                    <p className="mt-1 text-sm text-[#8296BB]">{dia ? `${dia.ejercicios.length} ejercicios` : 'Consultá a tu profesor'}</p>
                  </div>
                  <Link href="/rutinas" className="flex h-[52px] items-center gap-2.5 rounded-[14px] bg-blue-600 px-5 font-semibold text-white transition-colors hover:bg-blue-500">
                    <Play className="size-4 fill-current" />
                    {rutina ? 'Empezar entrenamiento' : 'Ver rutinas'}
                  </Link>
                </div>
                {dia && dia.ejercicios.length > 0 && (
                  <ol className="border-t border-[#22396A]">
                    {dia.ejercicios.slice(0, 5).map((ej, i) => (
                      <li key={ej.id} className="flex min-h-12 items-center gap-4 border-b border-[#22396A] last:border-0">
                        <span className="w-6 text-sm text-[#8296BB]">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-100">{ej.nombre}</span>
                        <span className="text-sm text-[#8296BB]">{detalleEjercicio(ej)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <div className="order-1 md:order-2">
              <TuSemana semana={semana} entrenosMes={constancia.entrenosMes} ultimaVisita={constancia.ultimaVisita} />
            </div>
          </div>

          <aside aria-label="Tu cuenta y el gimnasio" className="flex min-w-0 flex-col gap-3.5 md:gap-8 lg:flex-1">
            <section aria-labelledby="titulo-mi-cuota" className="flex flex-col gap-2.5 rounded-2xl bg-[#162A50] p-4 md:border md:border-[#22396A] md:bg-transparent md:px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 id="titulo-mi-cuota" className="text-[17px] font-bold text-white md:text-lg md:font-semibold">Mi cuota</h2>
                <EstadoCuentaEtiqueta estado={estadoCuenta} />
              </div>
              <div className="flex justify-between gap-3 text-[15px]">
                <span className="text-slate-400">Plan</span>
                <span className="text-right text-slate-100">
                  {planTexto}
                  {plan && (
                    <>
                      <Separador />${plan.precio.toLocaleString('es-AR')} / mes
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-[15px]">
                <span className="text-slate-400">Próximo vencimiento</span>
                <span className="text-right text-slate-100">{vencimiento}</span>
              </div>
              <Link href="/finanzas" className="flex min-h-11 items-center text-sm font-semibold text-blue-400 hover:text-blue-300">
                Ver mis pagos y cómo transferir
              </Link>
            </section>

            {avisos.length > 0 && (
              <section aria-labelledby="titulo-avisos-inicio" className="flex flex-col gap-3">
                <div className="hidden items-baseline justify-between md:flex">
                  <h2 id="titulo-avisos-inicio" className="text-lg font-semibold text-white">Avisos</h2>
                  <Link href="/avisos" className="text-sm text-blue-400 hover:text-blue-300">Ver todos</Link>
                </div>
                {avisos.slice(0, 2).map((aviso, i) => (
                  <Link
                    key={aviso.id}
                    href="/avisos"
                    className={`rounded-2xl border border-[#2A4677] bg-[#13254A] px-4 py-3.5 md:border-[#22396A] md:bg-transparent md:px-5 md:py-4 ${i > 0 ? 'hidden md:block' : 'block'}`}
                  >
                    <span className="block text-[13px] font-bold uppercase tracking-[.06em] text-amber-400 md:font-normal md:normal-case md:tracking-normal md:text-[#8296BB]">
                      <span className="md:hidden">Aviso del gimnasio</span>
                      <span className="hidden md:inline">{aviso.fecha}</span>
                    </span>
                    <span className="mt-1 block text-[15px] text-slate-100">{aviso.titulo}</span>
                  </Link>
                ))}
              </section>
            )}

            <section aria-labelledby="titulo-horarios" className="hidden flex-col gap-2 md:flex">
              <h2 id="titulo-horarios" className="text-lg font-semibold text-white">Horarios</h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Lunes a viernes de {HORARIOS_ATLAS.semana}
                <br />
                Sábados de {HORARIOS_ATLAS.sabado}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}

export default function Page() {
  const { usuarioActual, alumnos, pagos, planes, rutinas, asistencias, datosCobro, getCantidadAvisosNoLeidos, getEstadoCuenta } = useAppData()
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

  // Estilo 3 (panel "Hoy"): cifras del día y la lista de cosas para resolver
  const hoyIso = fechaLocalHoy();
  const { cobradoHoy, saldoSenias } = useMemo(() => {
    let cobrado = 0;
    let senias = 0;
    for (const p of pagos) {
      if (p.estado === 'ANULADO') continue;
      if (p.fecha === hoyIso) cobrado += obtenerMontoRecaudadoPago(p);
      if (p.estado === 'PARCIAL') senias += obtenerSaldoPendientePago(p);
    }
    return { cobradoHoy: cobrado, saldoSenias: senias };
  }, [pagos, hoyIso]);

  // Primero las señas (completar saldo), después los socios con cuota impaga (recordar por WhatsApp)
  const paraResolver = useMemo(() => {
    const filas: {
      id: string;
      alumno: (typeof alumnos)[number] | undefined;
      nombre: string;
      plan: string;
      tipo: 'SENIA' | 'DEUDA';
      detalle: string;
      monto: number;
      pago?: (typeof pagos)[number];
      estadoCuenta?: ReturnType<typeof getEstadoCuenta>;
    }[] = [];
    const conSenia = new Set<string>();
    const deudas: typeof filas = [];
    // Mismo criterio que la métrica "Cuotas impagas": comprobantes abiertos + socios PENDIENTE/MOROSO sin comprobante
    for (const p of pagos) {
      if (p.estado !== 'PENDIENTE' && p.estado !== 'VENCIDO') continue;
      const al = alumnosMap.get(p.alumnoId);
      conSenia.add(p.alumnoId);
      deudas.push({
        id: `p-${p.id}`,
        alumno: al,
        nombre: al ? al.nombre : p.alumnoNombreHistorico || 'Alumno Atlas',
        plan: p.plan,
        tipo: 'DEUDA',
        detalle: p.estado === 'VENCIDO' ? 'Cuota vencida' : 'Cuota pendiente',
        monto: obtenerSaldoPendientePago(p),
        pago: p,
        estadoCuenta: p.estado === 'VENCIDO' ? 'MOROSO' : 'PENDIENTE',
      });
    }
    for (const p of pagos) {
      if (p.estado !== 'PARCIAL') continue;
      const al = alumnosMap.get(p.alumnoId);
      conSenia.add(p.alumnoId);
      filas.push({
        id: `p-${p.id}`,
        alumno: al,
        nombre: al ? al.nombre : p.alumnoNombreHistorico || 'Alumno Atlas',
        plan: p.plan,
        tipo: 'SENIA',
        detalle: p.periodoMes || p.fecha.slice(0, 7),
        monto: obtenerSaldoPendientePago(p),
        pago: p,
      });
    }
    for (const a of alumnos) {
      if (!a.activo || conSenia.has(a.id)) continue;
      const estado = getEstadoCuenta(a.id);
      if (estado !== 'PENDIENTE' && estado !== 'MOROSO') continue;
      filas.push({
        id: `a-${a.id}`,
        alumno: a,
        nombre: a.nombre,
        plan: a.plan,
        tipo: 'DEUDA',
        detalle: estado === 'MOROSO' ? 'Cuota vencida' : 'Cuota pendiente',
        monto: planes.find((pl) => pl.id === a.planId)?.precio ?? 0,
        estadoCuenta: estado,
      });
    }
    return [...filas.filter((f) => f.tipo === 'SENIA'), ...deudas, ...filas.filter((f) => f.tipo === 'DEUDA')];
  }, [pagos, alumnos, alumnosMap, planes, getEstadoCuenta]);

  const ingresosHoy = useMemo(
    () => asistencias.filter((a) => a.fecha === hoyIso).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [asistencias, hoyIso]
  );

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
    return <HomeAlumno usuario={usuarioActual} fechaHoy={fechaHoy} />
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en pagos recientes..."
            aria-label="Buscar en pagos recientes"
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-sm text-slate-200 outline-none transition-[border-color,background-color] duration-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-slate-900"
          />
        </div>
        <HeaderStatusSection
          cantNoLeidos={cantAvisosNoLeidos}
          fechaHoy={fechaHoy}
          ubicacion={ubicacion}
        />
      </header>

      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-5 pb-28 pt-8 md:gap-12 md:px-14 md:pb-16 md:pt-12">

        {/* TÍTULO Y ACCIONES */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm text-slate-500">
              {fechaHoy
                ? capitalizar(
                    fechaHoy.toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })
                  )
                : ' '}
            </p>
            <h1 className="text-4xl font-bold uppercase text-white md:text-[40px]">
              <span className="md:hidden">Hola, {usuarioActual.nombre.split(' ')[0]}</span>
              <span className="hidden md:inline">Hoy en ATLAS</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowModal(true)}
              className="h-11 rounded-xl border border-slate-800 bg-transparent px-4 font-medium text-slate-300 hover:bg-slate-900"
            >
              <Plus data-icon="inline-start" className="mr-1.5 size-4" />Nuevo alumno
            </Button>
            <Link
              href="/finanzas"
              className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus className="size-4" />Cobrar
            </Link>
          </div>
        </div>

        {/* FRANJA DE MÉTRICAS: chica y neutra, la tabla es lo importante */}
        <section aria-label="Resumen de hoy" className="grid grid-cols-2 border-y border-slate-800 lg:grid-cols-4">
          {[
            { href: '/asistencias', label: 'En sala ahora', valor: String(sociosEnSala.length) },
            { href: '/finanzas', label: 'Cobrado hoy', valor: `$${cobradoHoy.toLocaleString('es-AR')}` },
            { href: '#para-resolver', label: 'Saldos por completar', valor: `$${saldoSenias.toLocaleString('es-AR')}` },
            {
              href: '#para-resolver',
              label: 'Cuotas impagas',
              valor: `${sociosQueDeben} ${sociosQueDeben === 1 ? 'socio' : 'socios'}`,
            },
          ].map((m, i) => (
            <Link
              key={m.label}
              href={m.href}
              className={`flex min-w-0 flex-col gap-1 py-4 text-white transition-colors hover:bg-slate-900/40 md:py-5 ${
                i % 2 === 1 ? 'border-l border-slate-800 pl-4 md:pl-6' : 'pr-4 lg:pr-6'
              } ${i === 2 ? 'border-t border-slate-800 lg:border-l lg:border-t-0 lg:pl-6' : ''} ${
                i === 3 ? 'border-t lg:border-t-0' : ''
              }`}
            >
              <span className="text-[13px] text-slate-500">{m.label}</span>
              <span className="truncate text-xl font-semibold md:text-2xl">{m.valor}</span>
            </Link>
          ))}
        </section>

        {/* PARA RESOLVER HOY */}
        <section id="para-resolver" aria-labelledby="titulo-resolver" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="titulo-resolver" className="text-xl font-semibold text-white">Para resolver hoy</h2>
            <Link href="/finanzas" className="text-sm text-blue-300 hover:text-blue-200">Ver todos en Finanzas</Link>
          </div>
          {paraResolver.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 px-5 py-8 text-center text-sm text-slate-500">
              No hay señas ni cuotas impagas. Todo al día.
            </p>
          ) : (
            <>
            {/* Celular: filas simples con la acción al lado */}
            <ul className="md:hidden">
              {paraResolver.slice(0, 5).map((f) => (
                <li key={f.id} className="flex items-center gap-3 border-b border-slate-800 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{f.nombre}</p>
                    <p
                      className={`mt-0.5 flex items-center gap-1.5 text-sm ${
                        f.tipo === 'SENIA' || f.estadoCuenta === 'PENDIENTE' ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {f.tipo === 'SENIA' ? <Clock className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                      {f.tipo === 'SENIA' ? `Resta $${f.monto.toLocaleString('es-AR')} de la seña` : f.detalle}
                    </p>
                  </div>
                  {f.tipo === 'SENIA' ? (
                    <Link href="/finanzas" className="flex h-11 items-center rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white">
                      Completar
                    </Link>
                  ) : f.alumno?.celular && tieneCelularWhatsappValido(f.alumno.celular) ? (
                    <a
                      href={construirUrlWaMe(
                        f.alumno.celular,
                        mensajeRecordatorioCuotaWhatsapp({
                          nombre: f.nombre,
                          plan: f.plan,
                          estadoCuenta: f.estadoCuenta,
                          montoTotal: f.monto,
                          aliasPago: datosCobro.alias,
                        })
                      )}
                      target="atlas_whatsapp_tab"
                      rel="noopener noreferrer"
                      aria-label={`Recordar cuota por WhatsApp a ${f.nombre}`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-200"
                    >
                      <MessageCircle className="size-5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
              <table className="w-full min-w-[680px] border-collapse text-[15px]">
                <thead>
                  <tr className="bg-slate-900/60 text-left text-[13px] text-slate-500">
                    <th className="px-5 py-3 font-medium">Socio</th>
                    <th className="px-5 py-3 font-medium">Situación</th>
                    <th className="px-5 py-3 text-right font-medium">Monto</th>
                    <th className="px-5 py-3"><span className="sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paraResolver.slice(0, 5).map((f) => (
                    <tr key={f.id} className="border-t border-slate-800">
                      <td className="px-5 py-4">
                        <span className="block font-semibold text-white">{f.nombre}</span>
                        <span className="mt-0.5 block text-[13px] text-slate-500">{f.plan}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm ${
                            f.tipo === 'SENIA' || f.estadoCuenta === 'PENDIENTE' ? 'text-amber-400' : 'text-rose-400'
                          }`}
                        >
                          {f.tipo === 'SENIA' ? <Clock className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                          {f.tipo === 'SENIA' ? 'Dejó seña' : f.detalle}
                        </span>
                        {f.tipo === 'SENIA' && <span className="mt-0.5 block text-[13px] text-slate-500">{f.detalle}</span>}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <span className="block text-white">${f.monto.toLocaleString('es-AR')}</span>
                        {f.tipo === 'SENIA' && <span className="mt-0.5 block text-[13px] text-slate-500">resta pagar</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {f.tipo === 'SENIA' ? (
                          <Link
                            href="/finanzas"
                            className="inline-flex h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
                          >
                            Completar saldo
                          </Link>
                        ) : f.alumno?.celular && tieneCelularWhatsappValido(f.alumno.celular) ? (
                          <a
                            href={construirUrlWaMe(
                              f.alumno.celular,
                              mensajeRecordatorioCuotaWhatsapp({
                                nombre: f.nombre,
                                plan: f.plan,
                                estadoCuenta: f.estadoCuenta,
                                montoTotal: f.monto,
                                aliasPago: datosCobro.alias,
                              })
                            )}
                            target="atlas_whatsapp_tab"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-medium text-slate-200 hover:bg-slate-900"
                          >
                            <MessageCircle className="size-4" />Recordar por WhatsApp
                          </a>
                        ) : (
                          <span className="text-[13px] text-slate-500">Sin celular cargado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {paraResolver.length > 5 && (
            <p className="text-[13px] text-slate-500">
              Mostrando 5 de {paraResolver.length} pendientes. Primero los que dejaron seña, después las cuotas impagas.
            </p>
          )}
        </section>

        {/* ÚLTIMOS INGRESOS */}
        <section aria-labelledby="titulo-ingresos" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="titulo-ingresos" className="text-xl font-semibold text-white">Últimos ingresos</h2>
            <Link href="/asistencias" className="text-sm text-blue-300 hover:text-blue-200">Ver asistencias</Link>
          </div>
          {ingresosHoy.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 px-5 py-8 text-center text-sm text-slate-500">
              Todavía no entró nadie hoy.
            </p>
          ) : (
            <>
            <ul className="md:hidden">
              {ingresosHoy.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b border-slate-800 py-3 text-[15px]">
                  <span className="w-11 tabular-nums text-[13px] text-slate-500">{a.hora.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{a.alumnoNombre}</span>
                  {a.excedeLimiteSemanal ? (
                    <span className="flex items-center gap-1 text-[13px] text-amber-400"><Plus className="size-3.5" />Días extra</span>
                  ) : (
                    <span className={`text-[13px] ${a.estadoCuenta === 'AL_DIA' ? 'text-slate-400' : a.estadoCuenta === 'PENDIENTE' ? 'text-amber-400' : 'text-rose-400'}`}>
                      {ESTADO_CUENTA_LABEL[a.estadoCuenta]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
              <table className="w-full min-w-[600px] border-collapse text-[15px]">
                <thead>
                  <tr className="bg-slate-900/60 text-left text-[13px] text-slate-500">
                    <th className="px-5 py-3 font-medium">Hora</th>
                    <th className="px-5 py-3 font-medium">Socio</th>
                    <th className="px-5 py-3 font-medium">Semana</th>
                    <th className="px-5 py-3 font-medium">Cuota</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosHoy.map((a) => (
                    <tr key={a.id} className="border-t border-slate-800">
                      <td className="px-5 py-3.5 tabular-nums text-slate-500">{a.hora.slice(0, 5)}</td>
                      <td className="px-5 py-3.5 font-semibold text-white">{a.alumnoNombre}</td>
                      <td className="px-5 py-3.5">
                        {a.excedeLimiteSemanal ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-amber-400">
                            <Plus className="size-3.5" />
                            {a.asistenciasSemana} de {a.limiteDiasSemana} días
                          </span>
                        ) : (
                          <span className="text-slate-300">
                            {a.limiteDiasSemana ? `${a.asistenciasSemana ?? 1} de ${a.limiteDiasSemana} días` : 'Plan libre'}
                          </span>
                        )}
                      </td>
                      <td className={`px-5 py-3.5 ${a.estadoCuenta === 'AL_DIA' ? 'text-slate-300' : a.estadoCuenta === 'PENDIENTE' ? 'text-amber-400' : 'text-rose-400'}`}>
                        {ESTADO_CUENTA_LABEL[a.estadoCuenta]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        {/* PAGOS RECIENTES (lo que ya tenía el inicio, con el buscador de arriba) */}
        <section aria-labelledby="titulo-pagos" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="titulo-pagos" className="text-xl font-semibold text-white">Pagos recientes</h2>
            <Link href="/finanzas" className="text-sm text-blue-300 hover:text-blue-200">Ver finanzas</Link>
          </div>
          {ultimosPagos.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 px-5 py-8 text-center text-sm text-slate-500">No hay pagos registrados aún.</p>
          ) : (
            <ul className="rounded-2xl border border-slate-800">
              {ultimosPagos.map((p) => (
                <li key={p.id} className="flex items-center gap-4 border-t border-slate-800 px-5 py-3.5 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{p.name}</p>
                    <p className="text-[13px] text-slate-500">{p.plan} <span aria-hidden="true">|</span> {p.time}</p>
                  </div>
                  <p className="tabular-nums text-white">{p.amount}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ACCESOS A LO SECUNDARIO */}
        <nav aria-label="Más información" className="flex flex-wrap gap-3">
          {[
            { href: '/finanzas', label: 'Ir al arqueo de caja' },
            { href: '/asistencias', label: 'Ir al aforo de la semana' },
            { href: '/rutinas', label: `Ir a rutinas (${rutinas.length})` },
            { href: '/alumnos', label: `Ir a alumnos (${alumnosActivos} activos)` },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex h-11 items-center rounded-xl border border-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="border-t border-slate-800/50 pt-6 text-sm text-slate-500">Datos sincronizados con el servidor del gimnasio</p>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      <ModalNuevoAlumno isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}

