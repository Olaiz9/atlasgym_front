// lib/types.ts
// Tipos compartidos entre módulos. Un alumno se crea UNA sola vez acá
// y el resto de los módulos (Finanzas, Rutinas, etc.) lo referencian por id
// en vez de repetir el nombre como texto suelto.

export type EstadoPago = "PAGADO" | "PENDIENTE" | "VENCIDO";

export interface Alumno {
  id: string;
  nombre: string;
  email?: string;
  celular?: string;
  plan: string;
  fechaAlta: string; // "YYYY-MM-DD"
  activo: boolean;
  ultimaAsistencia?: string; // "YYYY-MM-DD" — null/undefined = todavía no registró asistencia
}

export interface Pago {
  id: string;
  alumnoId: string;
  plan: string;
  monto: number;
  fecha: string; // "YYYY-MM-DD"
  metodo: string;
  estado: EstadoPago;
}

// Estado de cuenta de un alumno, DERIVADO de sus pagos (no se guarda a mano).
export type EstadoCuenta = "AL_DIA" | "PENDIENTE" | "MOROSO";

export function estadoCuentaDeAlumno(alumnoId: string, pagos: Pago[]): EstadoCuenta {
  const pagosDelAlumno = pagos.filter((p) => p.alumnoId === alumnoId);
  if (pagosDelAlumno.some((p) => p.estado === "VENCIDO")) return "MOROSO";
  if (pagosDelAlumno.some((p) => p.estado === "PENDIENTE")) return "PENDIENTE";
  return "AL_DIA";
}

export const ESTADO_CUENTA_LABEL: Record<EstadoCuenta, string> = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
  MOROSO: "Moroso",
};

export const ESTADO_CUENTA_STYLES: Record<EstadoCuenta, string> = {
  AL_DIA: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-700 border border-amber-200",
  MOROSO: "bg-red-50 text-red-700 border border-red-200",
};
