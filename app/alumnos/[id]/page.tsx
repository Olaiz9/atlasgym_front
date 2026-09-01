// app/alumnos/[id]/page.tsx
"use client";

import { use } from "react";
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
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { ESTADO_CUENTA_LABEL, ESTADO_CUENTA_STYLES } from "@/lib/types";

const ESTADO_PAGO_STYLES = {
  PAGADO: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-700 border border-amber-200",
  VENCIDO: "bg-red-50 text-red-700 border border-red-200",
} as const;

function diasDesde(fecha: string) {
  const hoy = new Date();
  const desde = new Date(fecha);
  const diffMs = hoy.getTime() - desde.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function FichaAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getAlumno, getEstadoCuenta, getPagosDeAlumno } = useAppData();

  const alumno = getAlumno(id);

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
  const diasAusente = alumno.ultimaAsistencia ? diasDesde(alumno.ultimaAsistencia) : null;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-10 md:py-10 space-y-6">
      <Link href="/alumnos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Alumnos
      </Link>

      {/* Header con datos principales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 text-xl font-black">
              {alumno.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{alumno.nombre}</h1>
              <p className="text-sm text-slate-500 font-medium">{alumno.plan || "Sin plan asignado"}</p>
            </div>
          </div>
          <span
            className={`self-start px-3 py-1.5 rounded-full text-xs font-bold ${ESTADO_CUENTA_STYLES[estadoCuenta]}`}
          >
            {ESTADO_CUENTA_LABEL[estadoCuenta]}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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
            Alta: {new Date(alumno.fechaAlta).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>

      {/* Aviso de acceso — si está moroso */}
      {estadoCuenta === "MOROSO" && (
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
      )}
      {estadoCuenta === "AL_DIA" && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">Cuenta al día — ingreso habilitado</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asistencia */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-900">
          <h2 className="font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Asistencia
          </h2>
          {alumno.ultimaAsistencia ? (
            <div className="mt-3">
              <p className="text-sm text-slate-500">Última visita registrada</p>
              <p className="text-lg font-bold mt-0.5">
                {new Date(alumno.ultimaAsistencia).toLocaleDateString("es-AR")}
              </p>
              <p className={`text-xs font-bold mt-2 ${diasAusente && diasAusente > 14 ? "text-rose-600" : "text-slate-400"}`}>
                {diasAusente === 0 ? "Vino hoy" : `Hace ${diasAusente} día${diasAusente === 1 ? "" : "s"}`}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Todavía no hay registro de asistencia para este alumno.
            </p>
          )}
        </div>

        {/* Rutina — placeholder hasta que exista el módulo */}
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-slate-900">
          <h2 className="font-bold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-slate-400" />
            Rutina asignada
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Todavía no existe el módulo de Rutinas. Cuando esté listo, desde acá se va a poder
            asignar ejercicios a este alumno directamente.
          </p>
        </div>
      </div>

      {/* Historial de pagos */}
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
                    {new Date(pago.fecha).toLocaleDateString("es-AR")}
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
    </div>
  );
}
