// app/alumnos/[id]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, Send } from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { EstadoCuentaEtiqueta } from "@/components/estado-cuenta-etiqueta";
import { WhatsAppIcon } from "@/components/icons/brand-icons";
import { ModalConfirmarBaja } from "@/components/modal-confirmar-baja";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { calcularSemanaAlumno } from "@/lib/asistencia-utils";
import { calcularDiasDesde, formatearMes, formatFechaAR } from "@/lib/date-utils";
import { inicialesDe } from "@/lib/utils";
import {
  construirUrlWaMe,
  mensajeCredencialesBienvenidaWhatsapp,
  mensajeRecordatorioCuotaWhatsapp,
  tieneCelularWhatsappValido,
} from "@/lib/whatsapp-utils";
import {
  DiaRutina,
  Ejercicio,
  ESTADO_PAGO_STYLES,
  EstadoPago,
  mesesAdeudados,
  obtenerMontoRecaudadoPago,
  obtenerSaldoPendientePago,
  Pago,
  Rutina,
} from "@/lib/types";

const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  PAGADO: "Pagado",
  PARCIAL: "Seña parcial",
  PENDIENTE: "Pendiente",
  VENCIDO: "Vencido",
  ANULADO: "Anulado",
};

const claseTarjeta = "rounded-2xl bg-[#162A50] p-4";
const claseBotonLinea =
  "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#2A4677] px-3 text-center text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-900";
const claseBotonAzul =
  "flex h-[52px] items-center justify-center rounded-xl bg-blue-600 px-4 text-base font-bold text-white transition-colors hover:bg-blue-500";

const pesos = (monto: number) => `$${monto.toLocaleString("es-AR")}`;

function Separador() {
  return <span aria-hidden="true" className="mx-1.5 text-slate-600">|</span>;
}

function FilaDato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#22396A] py-3 text-[15px] last:border-0">
      <span className="shrink-0 text-slate-400">{etiqueta}</span>
      <span className="min-w-0 break-words text-right text-slate-100">{children}</span>
    </div>
  );
}

function TarjetaRutina({ rutina }: { rutina?: Rutina }) {
  return (
    <section aria-labelledby="titulo-rutina" className={claseTarjeta}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-rutina" className="text-[17px] font-bold text-white">Rutina asignada</h2>
        <Link href="/rutinas" className="flex h-11 items-center text-sm text-blue-300 hover:text-blue-200">
          {rutina ? "Cambiar rutina" : "Asignar rutina"}
        </Link>
      </div>
      {rutina ? (
        <div className="mt-1 flex flex-col gap-3">
          <p className="text-[15px] text-slate-100">
            {rutina.nombre}
            <Separador />
            <span className="text-slate-400">{rutina.objetivo}</span>
          </p>
          {rutina.descripcion && <p className="text-sm text-slate-400">{rutina.descripcion}</p>}
          {rutina.dias.map((dia: DiaRutina) => (
            <div key={dia.id} className="rounded-xl bg-[#0E1B36] p-3 text-[13px]">
              <p className="mb-1 font-semibold text-slate-200">{dia.nombre}</p>
              <ul className="flex flex-col gap-0.5 text-slate-400">
                {dia.ejercicios.slice(0, 3).map((ej: Ejercicio) => (
                  <li key={ej.id} className="truncate">
                    {ej.nombre} ({ej.series}x{ej.repeticiones})
                    {ej.tipoSerie === "BI_SERIE" && <span className="ml-1.5 text-slate-200">Bi-serie</span>}
                    {ej.tipoSerie === "DROP_SET" && <span className="ml-1.5 text-slate-200">Drop Set</span>}
                  </li>
                ))}
              </ul>
              {dia.ejercicios.length > 3 && (
                <p className="mt-0.5 text-slate-500">+ {dia.ejercicios.length - 3} ejercicios más</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Este alumno todavía no tiene una rutina asignada.</p>
      )}
    </section>
  );
}

function HistorialPagos({ pagos }: { pagos: Pago[] }) {
  const importe = (pago: Pago) => (pago.estado === "PARCIAL" ? obtenerMontoRecaudadoPago(pago) : pago.monto);
  const detalleAnulado = (pago: Pago) =>
    pago.estado === "ANULADO" && pago.motivoAnulacion
      ? `Anulado${pago.anuladoPor ? ` por ${pago.anuladoPor}` : ""}: ${pago.motivoAnulacion}`
      : null;
  const resta = (pago: Pago) =>
    `Resta ${pesos(obtenerSaldoPendientePago(pago))} (de ${pesos(pago.monto)})`;

  return (
    <section aria-labelledby="titulo-pagos" className="flex flex-col gap-3">
      <h2 id="titulo-pagos" className="text-xl font-semibold text-white">Historial de pagos</h2>
      {pagos.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 px-5 py-8 text-center text-sm text-slate-500">
          Este alumno todavía no tiene pagos registrados.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 md:block">
            <table className="w-full min-w-[680px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-slate-900/60 text-left text-[13px] text-slate-500">
                  <th className="px-5 py-3 font-medium">Plan y período</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Método</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id} className={`border-t border-slate-800 ${pago.estado === "ANULADO" ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3.5 text-slate-200">
                      {pago.plan}
                      {pago.periodoMes && <span className="block text-[13px] text-slate-500">{formatearMes(pago.periodoMes)}</span>}
                      {detalleAnulado(pago) && <span className="block text-[13px] text-rose-400">{detalleAnulado(pago)}</span>}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-white">
                      <span className={pago.estado === "ANULADO" ? "line-through" : ""}>{pesos(importe(pago))}</span>
                      {pago.estado === "PARCIAL" && <span className="block text-[13px] text-amber-400">{resta(pago)}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{formatFechaAR(pago.fecha)}</td>
                    <td className="px-5 py-3.5 text-slate-300">{pago.metodo}</td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${ESTADO_PAGO_STYLES[pago.estado]}`}>{ETIQUETA_PAGO[pago.estado]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden">
            {pagos.map((pago) => (
              <li key={pago.id} className={`flex items-start gap-3 border-b border-slate-800 py-3 last:border-0 ${pago.estado === "ANULADO" ? "opacity-60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{pago.periodoMes ? formatearMes(pago.periodoMes) : pago.plan}</p>
                  <p className="text-[13px] text-slate-400">
                    {formatFechaAR(pago.fecha)}
                    <Separador />
                    {pago.metodo}
                  </p>
                  {detalleAnulado(pago) && <p className="text-[13px] text-rose-400">{detalleAnulado(pago)}</p>}
                  {pago.estado === "PARCIAL" && <p className="text-[13px] text-amber-400">{resta(pago)}</p>}
                </div>
                <div className="text-right">
                  <p className={`tabular-nums text-white ${pago.estado === "ANULADO" ? "line-through" : ""}`}>{pesos(importe(pago))}</p>
                  <p className={`text-[13px] font-semibold ${ESTADO_PAGO_STYLES[pago.estado]}`}>{ETIQUETA_PAGO[pago.estado]}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function FichaAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    alumnos,
    planes,
    pagos: todosLosPagos,
    asistencias,
    datosCobro,
    getAlumno,
    getEstadoCuenta,
    getPagosDeAlumno,
    getRutinaDeAlumno,
    actualizarAlumno,
    eliminarAlumno,
    blanquearClaveAlumno,
    usuarioActual,
  } = useAppData();
  const { toast } = useToast();
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [blanqueando, setBlanqueando] = useState(false);
  const [credencialTemporal, setCredencialTemporal] = useState<{ usuario: string; clave: string }>();
  // null = todos los meses adeudados marcados
  const [mesesMarcados, setMesesMarcados] = useState<number | null>(null);

  if (!usuarioActual || usuarioActual.rol === "ALUMNO") {
    return (
      <AccesoRestringido
        titulo="Ficha de Alumno Restringida"
        mensaje="Las fichas individuales de alumnos, asistencias y pagos solo pueden ser consultadas por entrenadores y administradores."
      />
    );
  }

  const alumno = getAlumno(id);

  if (!alumno) {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-10 md:py-10">
        <Link href="/alumnos" className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white">
          <ChevronLeft className="size-5" />
          Volver a Alumnos
        </Link>
        <p className="mt-8 rounded-2xl border border-slate-800 p-10 text-center text-slate-400">
          No encontramos este alumno. Puede que haya sido eliminado.
        </p>
      </div>
    );
  }

  const estadoCuenta = getEstadoCuenta(alumno.id);
  const pagos = getPagosDeAlumno(alumno.id);
  const rutina = getRutinaDeAlumno(alumno.id);
  const planObj = planes.find(
    (p) => p.id === alumno.planId || p.nombre.toLowerCase() === (alumno.plan || "").toLowerCase()
  );
  const semana = calcularSemanaAlumno(asistencias, alumno.id, planObj?.diasPorSemana);
  const diasAusente = alumno.ultimaAsistencia ? calcularDiasDesde(alumno.ultimaAsistencia) : null;
  const primerNombre = alumno.nombre.split(" ")[0];

  const debeCuota = estadoCuenta === "MOROSO" || estadoCuenta === "PENDIENTE";
  const meses = debeCuota ? mesesAdeudados(alumno.id, todosLosPagos, alumno.fechaAlta) : [];
  const cantidadMarcada = mesesMarcados ?? meses.length;
  const totalACobrar = (planObj?.precio ?? 0) * cantidadMarcada;
  const senia = pagos.find((p) => p.estado === "PARCIAL");
  const urlCobro = `/finanzas?cobrar=${encodeURIComponent(alumno.id)}`;

  const celular = alumno.celular && tieneCelularWhatsappValido(alumno.celular) ? alumno.celular : null;
  const mensajeWhatsApp = debeCuota
    ? mensajeRecordatorioCuotaWhatsapp({
        nombre: alumno.nombre,
        plan: alumno.plan,
        estadoCuenta,
        montoTotal: planObj?.precio,
        aliasPago: datosCobro.alias,
      })
    : `Hola ${primerNombre}! Te escribimos desde ATLAS Gym. ¡Que tengas una excelente semana de entrenamiento!`;
  const urlPortal = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const mensajeAcceso = (usuario: string, clave: string) =>
    mensajeCredencialesBienvenidaWhatsapp({ nombre: alumno.nombre, usuario, claveInicial: clave, urlPortal });

  const handleBlanquearClave = async () => {
    setBlanqueando(true);
    const res = await blanquearClaveAlumno(alumno.id);
    setBlanqueando(false);
    if (res.ok && res.claveTemporal) {
      setCredencialTemporal({ usuario: res.usuario || alumno.usuario || "-", clave: res.claveTemporal });
      toast(`Clave temporal generada para ${alumno.nombre}. Pasásela ahora: no se vuelve a mostrar.`, "success");
    } else {
      toast(res.error || "No se pudo generar la clave temporal", "error");
    }
  };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5 px-5 pb-28 pt-4 md:gap-6 md:px-14 md:pb-16 md:pt-10">
      <header className="-mx-2 flex items-center justify-between">
        <Link href="/alumnos" aria-label="Volver a alumnos" className="flex size-11 items-center justify-center rounded-xl text-slate-100 hover:bg-slate-900">
          <ChevronLeft className="size-[22px]" />
        </Link>
        <button
          type="button"
          onClick={() => setModalEditarAbierto(true)}
          className="h-11 rounded-[10px] bg-[#162A50] px-3.5 text-sm font-semibold text-slate-100 hover:bg-slate-800"
        >
          Editar
        </button>
      </header>

      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#1E3663] text-xl font-bold text-blue-200">
          {inicialesDe(alumno.nombre)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[34px] font-extrabold uppercase leading-[.95] text-white md:text-[40px]">{alumno.nombre}</h1>
          <p className="mt-1 text-sm text-slate-400">{alumno.plan || "Sin plan asignado"}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {alumno.dni ? `DNI ${alumno.dni}` : "Sin DNI"}
            {alumno.usuario && (
              <>
                <Separador />@{alumno.usuario}
              </>
            )}
          </p>
        </div>
      </div>

      {celular && (
        <div className="grid grid-cols-2 gap-2.5 md:max-w-md">
          <a href={construirUrlWaMe(celular, mensajeWhatsApp)} target="atlas_whatsapp_tab" rel="noopener noreferrer" aria-label={`Enviar WhatsApp a ${alumno.nombre}`} className={claseBotonLinea}>
            <WhatsAppIcon className="size-[18px] shrink-0 fill-current" />
            {debeCuota ? "Recordar cuota" : "WhatsApp"}
          </a>
          <a
            href={construirUrlWaMe(celular, mensajeAcceso(alumno.usuario || alumno.dni || "-", alumno.dni ? alumno.dni.replace(/\D/g, "") : "tu DNI"))}
            target="atlas_whatsapp_tab"
            rel="noopener noreferrer"
            className={claseBotonLinea}
          >
            Enviar acceso (DNI)
          </a>
        </div>
      )}

      {credencialTemporal && (
        <section aria-label="Clave temporal generada" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-bold text-amber-300">Acceso para {primerNombre}</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-slate-200">
            <span>Usuario: <strong data-testid="usuario-socio" className="font-mono">{credencialTemporal.usuario}</strong></span>
            <span>Clave temporal: <strong data-testid="clave-temporal" className="font-mono">{credencialTemporal.clave}</strong></span>
          </div>
          <p className="mt-2 text-[13px] text-slate-400">
            Pasásela al socio ahora: por seguridad no se vuelve a mostrar. En su primer ingreso va a tener que elegir una clave propia. Si la pierde, generá otra.
          </p>
          {celular && (
            <a href={construirUrlWaMe(celular, mensajeAcceso(credencialTemporal.usuario, credencialTemporal.clave))} target="atlas_whatsapp_tab" rel="noopener noreferrer" className={`mt-3 ${claseBotonLinea}`}>
              <Send className="size-4" />
              Enviar acceso por WhatsApp
            </a>
          )}
        </section>
      )}

      <div className="grid items-start gap-3.5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3.5 md:gap-6">
          <section aria-labelledby="titulo-cuota" className="flex flex-col gap-3 rounded-2xl border border-[#22396A] bg-[#162A50] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-cuota" className="text-[17px] font-bold text-white">
                {meses.length > 0
                  ? `Debe ${meses.length} ${meses.length === 1 ? "mes" : "meses"}`
                  : senia
                  ? "Seña sin completar"
                  : estadoCuenta === "INACTIVO"
                  ? "Socio inactivo"
                  : debeCuota
                  ? "Cuota pendiente"
                  : "Cuota al día"}
              </h2>
              <EstadoCuentaEtiqueta estado={estadoCuenta} conSenia={!!senia && meses.length === 0} />
            </div>

            {meses.length > 0 && (
              <>
                <p className="text-sm text-slate-400">
                  Sugerimos cobrar en orden, del más viejo al más nuevo, para no dejar meses salteados.
                </p>
                {meses.map((mes, i) => (
                  <label key={mes} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[#0E1B36] p-3 text-[15px] text-slate-100">
                    <input
                      type="checkbox"
                      checked={i < cantidadMarcada}
                      // Marcar o desmarcar arrastra a los demás: nunca queda un mes salteado.
                      onChange={(e) => setMesesMarcados(e.target.checked ? i + 1 : i)}
                      className="size-5 accent-blue-600"
                    />
                    <span className="flex-1">
                      <strong className="font-semibold">{formatearMes(mes).replace(` de ${new Date().getFullYear()}`, "")}</strong>
                      {meses.length > 1 && (
                        <span className="ml-1 text-[13px] text-slate-500">({i === 0 ? "primero" : "después"})</span>
                      )}
                    </span>
                    {planObj && <span className="tabular-nums">{pesos(planObj.precio)}</span>}
                  </label>
                ))}
                {cantidadMarcada > 0 ? (
                  <Link href={`${urlCobro}&periodo=${meses[0]}&meses=${cantidadMarcada}`} className={claseBotonAzul}>
                    {totalACobrar > 0 ? `Cobrar ${pesos(totalACobrar)}` : "Cobrar"}
                  </Link>
                ) : (
                  <p className="text-center text-sm text-slate-500">Marcá al menos un mes para cobrar.</p>
                )}
              </>
            )}

            {senia && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-amber-400">
                  Falta {pesos(obtenerSaldoPendientePago(senia))} de {senia.periodoMes ? formatearMes(senia.periodoMes) : senia.plan}.
                </p>
                <Link href={`/finanzas?completar=${encodeURIComponent(senia.id)}`} className={meses.length > 0 ? claseBotonLinea : claseBotonAzul}>
                  Completar saldo
                </Link>
              </div>
            )}

            {estadoCuenta === "INACTIVO" && (
              <p className="text-sm text-slate-400">
                Este alumno no cuenta con una membresía activa o lleva más de 60 días sin registrar pagos. Regularizá su inscripción antes de habilitar el ingreso al gimnasio.
              </p>
            )}
            {estadoCuenta === "AL_DIA" && !senia && <p className="text-sm text-slate-400">Ingreso habilitado.</p>}
            {meses.length === 0 && !senia && (
              <Link href={urlCobro} className={claseBotonLinea}>Registrar un pago</Link>
            )}
          </section>

          <section aria-labelledby="titulo-semana" className={claseTarjeta}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="titulo-semana" className="text-[17px] font-bold text-white">Esta semana</h2>
              <span className={`text-[13px] ${semana.excedido ? "text-amber-400" : "text-slate-400"}`}>
                {semana.diasAsistidos} {semana.diasAsistidos === 1 ? "visita" : "visitas"}
                <Separador />
                {semana.limite == null ? "plan libre" : `plan de ${semana.limite} ${semana.limite === 1 ? "día" : "días"}`}
              </span>
            </div>
            <ol aria-label="Días de esta semana" className="grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500">
              {semana.dias.map((dia) => (
                <li key={dia.fecha}>
                  <span
                    className={`mb-1 block h-[34px] rounded-lg ${
                      dia.fue ? "bg-blue-600" : dia.futuro ? "border border-dashed border-slate-700" : "bg-[#1E3663]"
                    }`}
                  />
                  {dia.letra}
                  <span className="sr-only">: {dia.fue ? "vino" : dia.futuro ? "todavía no llegó" : "no vino"}</span>
                </li>
              ))}
            </ol>
          </section>

          <HistorialPagos pagos={pagos} />
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 md:gap-6">
          <section aria-label="Datos del socio" className="rounded-2xl bg-[#162A50] px-4 py-1">
            <FilaDato etiqueta="Celular">{alumno.celular || "Sin celular"}</FilaDato>
            <FilaDato etiqueta="Email">{alumno.email || "Sin email"}</FilaDato>
            <FilaDato etiqueta="Rutina">
              <Link href="/rutinas" className="text-blue-300 hover:text-blue-200">{rutina?.nombre ?? "Sin rutina"}</Link>
            </FilaDato>
            <FilaDato etiqueta="Última visita">
              {alumno.ultimaAsistencia
                ? diasAusente === 0
                  ? "Hoy"
                  : `Hace ${diasAusente} ${diasAusente === 1 ? "día" : "días"}`
                : "Sin registros"}
            </FilaDato>
            <FilaDato etiqueta="Socio desde">{formatearMes(alumno.fechaAlta.slice(0, 7))}</FilaDato>
          </section>

          <TarjetaRutina rutina={rutina} />

          <section aria-label="Acceso y estado del socio" className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={blanqueando}
              onClick={handleBlanquearClave}
              title="Genera una clave al azar para darle acceso al socio (o si olvidó la suya). Se le pedirá elegir una propia al ingresar."
              className={`${claseBotonLinea} disabled:opacity-50`}
            >
              <KeyRound className="size-4" />
              {blanqueando ? "Generando..." : "Generar clave temporal"}
            </button>
            {alumno.activo === false ? (
              <button
                type="button"
                onClick={() => {
                  actualizarAlumno(alumno.id, { activo: true });
                  toast(`Alumno "${alumno.nombre}" reactivado con éxito`, "success");
                }}
                className={claseBotonLinea}
              >
                Reactivar socio
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmarBaja(true)} aria-label={`Dar de baja a ${alumno.nombre}`} className="flex h-11 items-center justify-center text-sm font-medium text-rose-400 hover:text-rose-300">
                Dar de baja
              </button>
            )}
          </section>
        </div>
      </div>

      {modalEditarAbierto && (
        <ModalEditarAlumno
          alumno={alumno}
          alumnos={alumnos}
          planes={planes}
          onClose={() => setModalEditarAbierto(false)}
          onSubmit={(cambios) => {
            actualizarAlumno(alumno.id, cambios);
            setModalEditarAbierto(false);
            toast(`Datos de ${cambios.nombre || alumno.nombre} actualizados con éxito`, "success");
          }}
        />
      )}

      {confirmarBaja && (
        <ModalConfirmarBaja
          alumno={alumno}
          onCancel={() => setConfirmarBaja(false)}
          onConfirm={() => {
            eliminarAlumno(alumno.id);
            setConfirmarBaja(false);
            toast(`Alumno "${alumno.nombre}" dado de baja (movido a Inactivos)`, "info");
          }}
        />
      )}
    </div>
  );
}
