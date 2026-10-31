// app/alumnos/[id]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Dumbbell,
  CreditCard,
  Pencil,
  MessageSquare,
  KeyRound,
  Send,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { formatFechaAR, calcularDiasDesde } from "@/lib/date-utils";
import {
  construirUrlWaMe,
  mensajeCredencialesBienvenidaWhatsapp,
  mensajeRecordatorioCuotaWhatsapp,
  tieneCelularWhatsappValido,
} from "@/lib/whatsapp-utils";
import {
  ESTADO_CUENTA_LABEL,
  ESTADO_CUENTA_STYLES,
  DiaRutina,
  Ejercicio,
  Pago,
  Alumno,
  EstadoCuenta,
  EstadoPago,
  obtenerMontoRecaudadoPago,
  obtenerSaldoPendientePago,
} from "@/lib/types";

const ESTADO_PAGO_STYLES: Record<EstadoPago, string> = {
  PAGADO: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PARCIAL: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  PENDIENTE: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  VENCIDO: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  ANULADO: "bg-slate-800 text-slate-400 border border-slate-700",
};

function TarjetaRutina({ rutina }: { rutina: any }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-white">
          <Dumbbell className="w-4 h-4 text-blue-500" />
          Rutina asignada
        </h2>
        <Link
          href="/rutinas"
          className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
        >
          {rutina ? "Cambiar rutina →" : "Asignar rutina →"}
        </Link>
      </div>

      {rutina ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">{rutina.nombre}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {rutina.objetivo}
            </span>
          </div>
          {rutina.descripcion && (
            <p className="text-xs text-slate-400">{rutina.descripcion}</p>
          )}

          <div className="pt-2 space-y-2">
            {rutina.dias.map((dia: DiaRutina) => (
              <div key={dia.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <p className="font-bold text-slate-200 mb-1">{dia.nombre}</p>
                <div className="space-y-0.5 text-slate-400">
                  {dia.ejercicios.slice(0, 3).map((ej: Ejercicio) => (
                    <div key={ej.id} className="flex items-center gap-1.5 truncate">
                      <span className="truncate">• {ej.nombre} ({ej.series}x{ej.repeticiones})</span>
                      {ej.tipoSerie === "BI_SERIE" && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                          Bi-serie
                        </span>
                      )}
                      {ej.tipoSerie === "DROP_SET" && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          Drop Set
                        </span>
                      )}
                    </div>
                  ))}
                  {dia.ejercicios.length > 3 && (
                    <p className="text-[11px] font-medium text-slate-500">
                      + {dia.ejercicios.length - 3} ejercicios más
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center py-4">
          <p className="text-xs text-slate-400">Este alumno todavía no tiene una rutina asignada.</p>
          <Link
            href="/rutinas"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold hover:bg-blue-600/30 transition-colors"
          >
            Elegir una rutina de la biblioteca
          </Link>
        </div>
      )}
    </div>
  );
}

function TablaPagos({ pagos }: { pagos: Pago[] }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden text-white shadow-sm">
      <div className="p-6 border-b border-slate-800">
        <h2 className="font-bold text-white">Historial de pagos</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-800 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-3.5">Plan / Período</th>
              <th className="px-6 py-3.5">Monto</th>
              <th className="px-6 py-3.5">Fecha</th>
              <th className="px-6 py-3.5">Método</th>
              <th className="px-6 py-3.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => {
              const esAnulado = pago.estado === "ANULADO";
              const esParcial = pago.estado === "PARCIAL";
              const abonado = obtenerMontoRecaudadoPago(pago);
              const saldo = obtenerSaldoPendientePago(pago);

              return (
                <tr
                  key={pago.id}
                  className={`border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors ${
                    esAnulado ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-6 py-4 text-slate-300 font-medium">
                    <div>{pago.plan}</div>
                    {pago.periodoMes && (
                      <div className="text-[11px] text-slate-500">Período: {pago.periodoMes}</div>
                    )}
                    {esAnulado && pago.motivoAnulacion && (
                      <div className="text-[11px] text-rose-400/90 mt-0.5">
                        Anulado{pago.anuladoPor ? ` por ${pago.anuladoPor}` : ""}: {pago.motivoAnulacion}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-white">
                    <span className={esAnulado ? "line-through text-slate-500" : ""}>
                      ${(esParcial ? abonado : pago.monto).toLocaleString("es-AR")}
                    </span>
                    {esParcial && (
                      <div className="text-[11px] font-bold text-amber-400">
                        Resta ${saldo.toLocaleString("es-AR")} (de ${pago.monto.toLocaleString("es-AR")})
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {formatFechaAR(pago.fecha)}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{pago.metodo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_PAGO_STYLES[pago.estado]}`}>
                      {pago.estado === "PARCIAL" ? "SEÑA PARCIAL" : pago.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                  Este alumno todavía no tiene pagos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderAlumno({
  alumno,
  estadoCuenta,
  montoPlan,
  blanqueando,
  onEditar,
  onBlanquearClave,
}: {
  alumno: Alumno;
  estadoCuenta: EstadoCuenta;
  montoPlan?: number;
  blanqueando: boolean;
  onEditar: () => void;
  onBlanquearClave: () => void;
}) {
  const iniciales = alumno.nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const celularValido = tieneCelularWhatsappValido(alumno.celular);
  const mensajeWhatsApp =
    estadoCuenta === "MOROSO" || estadoCuenta === "PENDIENTE"
      ? mensajeRecordatorioCuotaWhatsapp({
          nombre: alumno.nombre,
          plan: alumno.plan,
          estadoCuenta,
          montoTotal: montoPlan,
        })
      : `Hola ${alumno.nombre.split(" ")[0]}! Te escribimos desde ATLAS Gym. ¡Que tengas una excelente semana de entrenamiento!`;

  const claveInicialRef = alumno.dni ? alumno.dni.replace(/\D/g, "") : "tu DNI";
  const usuarioRef = alumno.usuario || alumno.dni || "-";
  const urlPortal = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const mensajeAccesoWhatsApp = mensajeCredencialesBienvenidaWhatsapp({
    nombre: alumno.nombre,
    usuario: usuarioRef,
    claveInicial: claveInicialRef,
    urlPortal,
  });

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 md:p-8 text-white shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 border border-blue-500/20 text-blue-400 text-xl font-black">
            {iniciales}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{alumno.nombre}</h1>
            <p className="text-sm text-slate-400 font-medium">{alumno.plan || "Sin plan asignado"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${ESTADO_CUENTA_STYLES[estadoCuenta]}`}>
            {ESTADO_CUENTA_LABEL[estadoCuenta]}
          </span>
          {celularValido && alumno.celular && (
            <>
              <a
                href={construirUrlWaMe(alumno.celular, mensajeWhatsApp)}
                target="atlas_whatsapp_tab"
                rel="noopener noreferrer"
                aria-label={`Enviar WhatsApp a ${alumno.nombre}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors border border-emerald-500/30 active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {estadoCuenta === "MOROSO" || estadoCuenta === "PENDIENTE" ? "Recordar cuota" : "WhatsApp"}
              </a>
              <a
                href={construirUrlWaMe(alumno.celular, mensajeAccesoWhatsApp)}
                target="atlas_whatsapp_tab"
                rel="noopener noreferrer"
                title="Enviar usuario y clave inicial (DNI) por WhatsApp"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-300 text-xs font-bold hover:bg-blue-500/25 transition-colors border border-blue-500/30 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar acceso
              </a>
            </>
          )}
          <button
            type="button"
            disabled={blanqueando}
            onClick={onBlanquearClave}
            title="Restablece la contraseña al DNI del socio y le solicita elegir una nueva clave privada al ingresar"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors border border-amber-500/30 active:scale-95 disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {blanqueando ? "Blanqueando..." : "Blanquear clave a DNI"}
          </button>
          <button
            onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <span>
            {alumno.dni ? `DNI: ${alumno.dni}` : "Sin DNI"}
            {alumno.usuario && (
              <span className="ml-2 inline-flex items-center rounded-md bg-blue-500/15 px-2 py-0.5 font-mono text-xs font-bold text-blue-400 border border-blue-500/30">
                @{alumno.usuario}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Mail className="w-4 h-4 text-slate-500" />
          {alumno.email || `Usuario: ${alumno.usuario || "Sin email"}`}
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Phone className="w-4 h-4 text-slate-500" />
          {alumno.celular || "Sin celular"}
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4 text-slate-500" />
          Alta: {formatFechaAR(alumno.fechaAlta)}
        </div>
      </div>
    </div>
  );
}

function AvisoAcceso({ estadoCuenta }: { estadoCuenta: EstadoCuenta }) {
  if (estadoCuenta === "MOROSO") {
    return (
      <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-rose-300">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
        <div>
          <p className="font-bold text-sm text-rose-200">Cuota vencida (Moroso)</p>
          <p className="text-sm mt-0.5 text-rose-300/90">
            Este socio registra cuotas vencidas. El Tótem alerta visualmente a recepción al ingresar.
          </p>
        </div>
      </div>
    );
  }

  if (estadoCuenta === "AL_DIA") {
    return (
      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
        <p className="font-bold text-sm text-emerald-200">Cuenta al día — ingreso habilitado</p>
      </div>
    );
  }

  if (estadoCuenta === "INACTIVO") {
    return (
      <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-slate-300">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" />
        <div>
          <p className="font-bold text-sm text-slate-200">Socio inactivo o dado de baja</p>
          <p className="text-sm mt-0.5 text-slate-400">
            Este alumno no cuenta con una membresía activa o lleva más de 60 días sin registrar pagos.
            Regularizar su inscripción antes de habilitar el ingreso al gimnasio.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function FichaAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    alumnos,
    planes,
    getAlumno,
    getEstadoCuenta,
    getPagosDeAlumno,
    getRutinaDeAlumno,
    actualizarAlumno,
    blanquearClaveAlumno,
    usuarioActual,
  } = useAppData();
  const { toast } = useToast();
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [blanqueando, setBlanqueando] = useState(false);

  if (!usuarioActual || usuarioActual.rol === "ALUMNO") {
    return (
      <AccesoRestringido
        titulo="Ficha de Alumno Restringida"
        mensaje="Las fichas individuales de alumnos, asistencias y pagos solo pueden ser consultadas por entrenadores y administradores."
      />
    );
  }

  const alumno = getAlumno(id);
  const rutinaAsignada = alumno ? getRutinaDeAlumno(alumno.id) : undefined;

  if (!alumno) {
    return (
      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-10 md:py-10">
        <Link href="/alumnos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Alumnos
        </Link>
        <div className="mt-8 bg-slate-900/80 rounded-2xl border border-slate-800 p-10 text-center text-slate-400 font-medium">
          No encontramos este alumno. Puede que haya sido eliminado.
        </div>
      </div>
    );
  }

  const estadoCuenta = getEstadoCuenta(alumno.id);
  const pagos = getPagosDeAlumno(alumno.id);
  const diasAusente = alumno.ultimaAsistencia ? calcularDiasDesde(alumno.ultimaAsistencia) : null;
  const planObj = planes.find(
    (p) => p.id === alumno.planId || p.nombre.toLowerCase() === (alumno.plan || "").toLowerCase()
  );

  const handleBlanquearClave = async () => {
    setBlanqueando(true);
    const res = await blanquearClaveAlumno(alumno.id);
    setBlanqueando(false);
    if (res.ok) {
      toast(
        `Contraseña de ${alumno.nombre} restablecida a su DNI (${res.claveTemporal}). Se le pedirá cambiarla al ingresar.`,
        "success"
      );
    } else {
      toast(res.error || "No se pudo blanquear la contraseña", "error");
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-10 md:py-10 space-y-6">
      <Link href="/alumnos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Alumnos
      </Link>

      {/* Header con datos principales */}
      <HeaderAlumno
        alumno={alumno}
        estadoCuenta={estadoCuenta}
        montoPlan={planObj?.precio}
        blanqueando={blanqueando}
        onEditar={() => setModalEditarAbierto(true)}
        onBlanquearClave={handleBlanquearClave}
      />

      {/* Modal de edición */}
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

      {/* Aviso de acceso — si está moroso o al día */}
      <AvisoAcceso estadoCuenta={estadoCuenta} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asistencia */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 text-white flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-slate-400" />
                Asistencia
              </h2>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Registrado por Tótem
              </span>
            </div>
            {alumno.ultimaAsistencia ? (
              <div className="mt-3">
                <p className="text-sm text-slate-400">Última visita registrada</p>
                <p className="text-lg font-bold mt-0.5 text-white">
                  {formatFechaAR(alumno.ultimaAsistencia)}
                </p>
                <p className={`text-xs font-bold mt-2 ${diasAusente === 0 ? "text-emerald-400" : diasAusente && diasAusente > 14 ? "text-rose-400" : "text-slate-400"}`}>
                  {diasAusente === 0 ? "✓ Vino hoy" : `Hace ${diasAusente} día${diasAusente === 1 ? "" : "s"}`}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                Todavía no hay registro de asistencia para este alumno.
              </p>
            )}
          </div>
        </div>

        {/* Rutina Asignada */}
        <TarjetaRutina rutina={rutinaAsignada} />
      </div>

      {/* Historial de pagos */}
      <TablaPagos pagos={pagos} />
    </div>
  );
}
