// lib/types.ts
// Tipos compartidos entre módulos. Un alumno se crea UNA sola vez acá
// y el resto de los módulos (Finanzas, Rutinas, etc.) lo referencian por id
// en vez de repetir el nombre como texto suelto.

export type EstadoPago = "PAGADO" | "PENDIENTE" | "VENCIDO";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "ALUMNO";
  alumnoId?: string;
}

export interface Alumno {
  id: string;
  nombre: string;
  email?: string;
  celular?: string;
  plan: string;
  fechaAlta: string; // "YYYY-MM-DD"
  activo: boolean;
  ultimaAsistencia?: string; // "YYYY-MM-DD" — null/undefined = todavía no registró asistencia
  tieneRutina?: boolean;
  rutinaId?: string;
}

export interface Ejercicio {
  id: string;
  nombre: string;
  series: number;
  repeticiones: string; // ej: "10-12", "8", "Al fallo"
  descansoSegundos?: number;
  notas?: string;
}

export interface DiaRutina {
  id: string;
  nombre: string; // ej: "Día 1 — Pecho y Tríceps"
  ejercicios: Ejercicio[];
}

export interface Rutina {
  id: string;
  nombre: string; // Nombre general puesto por el dueño (ej: "Hipertrofia 3 Días")
  descripcion?: string;
  objetivo: string; // "Hipertrofia" | "Fuerza" | "Definición" | "Adaptación"
  dias: DiaRutina[];
  esGenerica: boolean; // true si es plantilla para varios, false si es personalizada
  alumnoIdAsignado?: string;
}

export interface VideoTecnica {
  id: string;
  titulo: string;
  grupoMuscular: "Pecho" | "Espalda" | "Piernas" | "Hombros" | "Brazos" | "Core";
  duracion: string; // ej: "01:45"
  nivel: string; // ej: "Técnica estricta", "Básico", "Avanzado"
  videoUrl: string; // URL de YouTube, Vimeo o embed
  descripcion?: string;
  consejosClave?: string[];
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

// Estado de cuenta de un alumno, DERIVADO de sus pagos y actividad (no se guarda a mano).
export type EstadoCuenta = "AL_DIA" | "PENDIENTE" | "MOROSO" | "INACTIVO";

export function estadoCuentaDeAlumno(
  alumnoId: string,
  pagos: Pago[],
  fechaAlta?: string
): EstadoCuenta {
  const pagosDelAlumno = pagos.filter((p) => p.alumnoId === alumnoId);

  // Si no tiene pagos registrados
  if (pagosDelAlumno.length === 0) {
    if (fechaAlta) {
      const diasDesdeAlta = Math.floor(
        (Date.now() - new Date(fechaAlta).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasDesdeAlta > 60) return "INACTIVO";
    }
    return "PENDIENTE";
  }

  // Ordenamos pagos del más reciente al más antiguo
  const pagosOrdenados = [...pagosDelAlumno].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const masReciente = pagosOrdenados[0];
  const diasDesdeUltimoPago = Math.floor(
    (Date.now() - new Date(masReciente.fecha).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Si pasaron más de 60 días desde el último pago registrado, pasa automáticamente a INACTIVO
  if (diasDesdeUltimoPago > 60) {
    return "INACTIVO";
  }

  if (pagosDelAlumno.some((p) => p.estado === "VENCIDO")) return "MOROSO";
  if (pagosDelAlumno.some((p) => p.estado === "PENDIENTE")) return "PENDIENTE";
  return "AL_DIA";
}

export const ESTADO_CUENTA_LABEL: Record<EstadoCuenta, string> = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
  MOROSO: "Moroso",
  INACTIVO: "Inactivo (+60d)",
};

export const ESTADO_CUENTA_STYLES: Record<EstadoCuenta, string> = {
  AL_DIA: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDIENTE: "bg-amber-50 text-amber-700 border border-amber-200",
  MOROSO: "bg-red-50 text-red-700 border border-red-200",
  INACTIVO: "bg-slate-100 text-slate-500 border border-slate-200",
};
