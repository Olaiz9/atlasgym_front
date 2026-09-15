// lib/auth-utils.ts
import { Rutina } from "./types";

/**
 * Rutas a las que solo el ADMIN puede ingresar.
 */
export const RUTAS_EXCLUSIVAS_ADMIN = ["/alumnos", "/planes"];

/**
 * Determina si un usuario con determinado rol puede acceder a una ruta específica.
 */
export function puedeAccederRuta(ruta: string, rol: "ADMIN" | "ALUMNO"): boolean {
  if (rol === "ADMIN") return true;
  const esRutaAdmin = RUTAS_EXCLUSIVAS_ADMIN.some(
    (prefix) => ruta === prefix || ruta.startsWith(`${prefix}/`)
  );
  return !esRutaAdmin;
}

/**
 * Resuelve la rutina asignada a un alumno sin realizar fallbacks ciegos.
 * Si el alumno no tiene rutina asignada o no se encuentra en el catálogo, retorna undefined.
 */
export function resolverRutinaAlumno(
  alumno: { rutinaId?: string } | undefined,
  rutinas: Rutina[]
): Rutina | undefined {
  if (!alumno?.rutinaId) return undefined;
  return rutinas.find((r) => r.id === alumno.rutinaId);
}
