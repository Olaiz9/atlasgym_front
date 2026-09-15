// lib/plan-utils.ts
import { Plan, Alumno, Pago, Rutina } from "./types";

/**
 * Filtra los planes activos disponibles para selección, permitiendo conservar
 * un plan pausado si el alumno ya lo tiene previamente asignado.
 */
export function filtrarPlanesDisponibles(
  planes: Plan[],
  alumnoPlanId?: string,
  alumnoPlanNombre?: string
): Plan[] {
  return planes.filter(
    (p) => p.activo || (alumnoPlanId && p.id === alumnoPlanId) || (alumnoPlanNombre && p.nombre === alumnoPlanNombre)
  );
}

/**
 * Sincroniza el nombre del plan en la lista de alumnos cuando el plan es renombrado.
 */
export function sincronizarNombrePlanEnAlumnos(
  alumnos: Alumno[],
  planId: string,
  nuevoNombre: string
): Alumno[] {
  return alumnos.map((a) => (a.planId === planId ? { ...a, plan: nuevoNombre } : a));
}

/**
 * Verifica si un plan puede eliminarse de forma segura.
 * Bloquea la eliminación si existen alumnos asignados al plan.
 */
export function puedeEliminarPlan(
  planId: string,
  alumnos: { planId?: string }[]
): { ok: boolean; motivo?: string } {
  const asociados = alumnos.filter((a) => a.planId === planId);
  if (asociados.length > 0) {
    return {
      ok: false,
      motivo: `No se puede eliminar: hay ${asociados.length} alumno(s) asignados a este plan. Reasignalos o pausá el plan.`,
    };
  }
  return { ok: true };
}

/**
 * Ejecuta la baja de un alumno aplicando eliminación en cascada segura:
 * 1. Preserva el nombre histórico en sus pagos para auditoría.
 * 2. Desvincula rutinas asignadas al alumno.
 * 3. Remueve al alumno del padrón activo.
 */
export function ejecutarBajaAlumno(
  alumnoId: string,
  alumnos: Alumno[],
  pagos: Pago[],
  rutinas: Rutina[]
): { alumnos: Alumno[]; pagos: Pago[]; rutinas: Rutina[] } {
  const alumnoBaja = alumnos.find((a) => a.id === alumnoId);
  const nombreHistorico = alumnoBaja?.nombre || "Alumno Atlas";

  const nuevosPagos = pagos.map((p) => {
    if (p.alumnoId === alumnoId && !p.alumnoNombreHistorico) {
      return { ...p, alumnoNombreHistorico: nombreHistorico };
    }
    return p;
  });

  const nuevasRutinas = rutinas.map((r) =>
    r.alumnoIdAsignado === alumnoId ? { ...r, alumnoIdAsignado: undefined } : r
  );

  const nuevosAlumnos = alumnos.filter((a) => a.id !== alumnoId);

  return {
    alumnos: nuevosAlumnos,
    pagos: nuevosPagos,
    rutinas: nuevasRutinas,
  };
}

/**
 * Resuelve el nombre para mostrar de un pago, indicando si el alumno fue dado de baja.
 */
export function resolverNombreParaMostrarPago(pago: Pago, alumno?: Alumno): string {
  if (alumno) return alumno.nombre;
  if (pago.alumnoNombreHistorico) return `${pago.alumnoNombreHistorico} (Baja)`;
  return "Alumno Atlas (Baja)";
}
