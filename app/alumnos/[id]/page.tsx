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
  Check,
  X,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { AccesoRestringido } from "@/components/acceso-restringido";
import { ModalEditarAlumno } from "@/components/modal-editar-alumno";
import { formatFechaAR, calcularDiasDesde, fechaLocalHoy } from "@/lib/date-utils";
import { construirLinkWhatsapp } from "@/lib/validators";
import { ESTADO_CUENTA_LABEL, ESTADO_CUENTA_STYLES, DiaRutina, Ejercicio, Pago, Alumno, EstadoCuenta } from "@/lib/types";

const ESTADO_PAGO_STYLES = {
  PAGADO: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-700 border border-amber-200",
  VENCIDO: "bg-red-50 text-red-700 border border-red-200",
};

function TarjetaRutina({ rutina }: { rutina: any }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-slate-900">
          <Dumbbell className="w-4 h-4 text-blue-600" />
          Rutina asignada
        </h2>
        <Link
          href="/rutinas"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {rutina ? "Cambiar rutina →" : "Asignar rutina →"}
        </Link>
      </div>

      {rutina ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">{rutina.nombre}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
              {rutina.objetivo}
            </span>
          </div>
          {rutina.descripcion && (
            <p className="text-xs text-slate-500">{rutina.descripcion}</p>
          )}

          <div className="pt-2 space-y-2">
            {rutina.dias.map((dia: DiaRutina) => (
              <div key={dia.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="font-bold text-slate-800 mb-1">{dia.nombre}</p>
                <div className="space-y-0.5 text-slate-500">
                  {dia.ejercicios.slice(0, 3).map((ej: Ejercicio) => (
                    <p key={ej.id} className="truncate">
                      • {ej.nombre} ({ej.series}x{ej.repeticiones})
                    </p>
                  ))}
                  {dia.ejercicios.length > 3 && (
                    <p className="text-[11px] font-medium text-slate-400">
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
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-slate-900">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold">Historial de pagos</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="font-bold px-6 py-3.5">Plan</th>
              <th className="font-bold px-6 py-3.5">Monto</th>
              <th className="font-bold px-6 py-3.5">Fecha</th>
              <th className="font-bold px-6 py-3.5">Método</th>
              <th className="font-bold px-6 py-3.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id} className="border-b border-slate-50 last:border-0">
                <td className="px-6 py-4 text-slate-500 font-medium">{pago.plan}</td>
                <td className="px-6 py-4 font-black text-slate-900">
                  ${pago.monto.toLocaleString("es-AR")}
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">
                  {formatFechaAR(pago.fecha)}
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium">{pago.metodo}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ESTADO_PAGO_STYLES[pago.estado]}`}>
                    {pago.estado}
                  </span>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
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
  onEditar,
}: {
  alumno: Alumno;
  estadoCuenta: EstadoCuenta;
  onEditar: () => void;
}) {
  const iniciales = alumno.nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const mensajeWhatsApp =
    estadoCuenta === "MOROSO"
      ? `Hola ${alumno.nombre}, te escribimos desde Atlas Gym para recordarte que tenés cuotas pendientes. ¿Podrías confirmarnos si precisás el link de pago o pasás por recepción? ¡Muchas gracias!`
      : `Hola ${alumno.nombre}, te escribimos desde Atlas Gym. ¡Esperamos que estés teniendo una excelente semana de entrenamiento!`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 text-slate-900 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 text-xl font-black">
            {iniciales}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{alumno.nombre}</h1>
            <p className="text-sm text-slate-500 font-medium">{alumno.plan || "Sin plan asignado"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${ESTADO_CUENTA_STYLES[estadoCuenta]}`}>
            {ESTADO_CUENTA_LABEL[estadoCuenta]}
          </span>
          {alumno.celular && (
            <a
              href={construirLinkWhatsapp(alumno.celular, mensajeWhatsApp)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Enviar WhatsApp a ${alumno.nombre}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
          <button
            onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 active:scale-95"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <CreditCard className="w-4 h-4 text-slate-400" />
          {alumno.dni ? `DNI: ${alumno.dni}` : "Sin DNI"}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Mail className="w-4 h-4 text-slate-400" />
          {alumno.email || "Sin email"}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="w-4 h-4 text-slate-400" />
          {alumno.celular || "Sin celular"}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          Alta: {formatFechaAR(alumno.fechaAlta)}
        </div>
      </div>
    </div>
  );
}

function AvisoAcceso({ estadoCuenta }: { estadoCuenta: EstadoCuenta }) {
  if (estadoCuenta === "MOROSO") {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 text-red-800">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm">No habilitar ingreso</p>
          <p className="text-sm mt-0.5 text-red-700">
            Este alumno tiene cuotas vencidas. Este aviso es solo informativo — la decisión de
            permitirle entrenar la toma el coach o recepción a mano; no hay ningún control de
            acceso físico conectado a esto todavía.
          </p>
        </div>
      </div>
    );
  }

  if (estadoCuenta === "AL_DIA") {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <p className="font-bold text-sm">Cuenta al día — ingreso habilitado</p>
      </div>
    );
  }

  if (estadoCuenta === "INACTIVO") {
    return (
      <div className="flex items-start gap-3 bg-slate-100 border border-slate-300 rounded-2xl p-5 text-slate-800">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
        <div>
          <p className="font-bold text-sm">Socio inactivo o dado de baja</p>
          <p className="text-sm mt-0.5 text-slate-600">
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
    marcarAsistenciaAlumno,
    desmarcarAsistenciaAlumno,
    actualizarAlumno,
    usuarioActual,
  } = useAppData();
  const { toast } = useToast();
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);

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
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 font-medium">
          No encontramos este alumno. Puede que haya sido eliminado.
        </div>
      </div>
    );
  }

  const estadoCuenta = getEstadoCuenta(alumno.id);
  const pagos = getPagosDeAlumno(alumno.id);
  const diasAusente = alumno.ultimaAsistencia ? calcularDiasDesde(alumno.ultimaAsistencia) : null;

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
        onEditar={() => setModalEditarAbierto(true)}
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Asistencia
              </h2>
              {alumno.ultimaAsistencia === fechaLocalHoy() || diasAusente === 0 ? (
                <button
                  onClick={() => {
                    desmarcarAsistenciaAlumno(alumno.id);
                    toast(`Asistencia anulada para ${alumno.nombre}`, "info");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors active:scale-95 border border-rose-200 cursor-pointer"
                  title="Anular asistencia de hoy si hubo un error"
                >
                  <X className="w-3.5 h-3.5" />
                  Anular presencia hoy
                </button>
              ) : (
                <button
                  onClick={() => {
                    marcarAsistenciaAlumno(alumno.id);
                    toast(`Asistencia registrada hoy para ${alumno.nombre}`, "success");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors active:scale-95 border border-emerald-200 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Marcar presencia hoy
                </button>
              )}
            </div>
            {alumno.ultimaAsistencia ? (
              <div className="mt-3">
                <p className="text-sm text-slate-500">Última visita registrada</p>
                <p className="text-lg font-bold mt-0.5">
                  {formatFechaAR(alumno.ultimaAsistencia)}
                </p>
                <p className={`text-xs font-bold mt-2 ${diasAusente === 0 ? "text-emerald-600" : diasAusente && diasAusente > 14 ? "text-rose-600" : "text-slate-400"}`}>
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
