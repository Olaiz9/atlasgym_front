// lib/auth-utils.ts
import { Alumno, Rutina, UsuarioSesion } from "./types";

export interface ValidacionCredencialesResult {
  ok: boolean;
  motivo?: string;
  alumno?: Alumno;
}

export const CLAVE_ADMIN_DEFAULT = "admin123";
export const CLAVE_ALUMNO_DEFAULT = "alumno123";

/**
 * Controla si un usuario con determinado rol puede acceder a una ruta del sistema.
 * - ADMIN tiene acceso a todas las rutas.
 * - ALUMNO solo tiene acceso a sus vistas (/rutinas, /finanzas, /avisos, /videoteca, /).
 *   No tiene acceso a /alumnos ni /planes.
 */
export function puedeAccederRuta(ruta: string, rol: "ADMIN" | "ALUMNO"): boolean {
  if (rol === "ADMIN") return true;
  if (ruta.startsWith("/alumnos") || ruta.startsWith("/planes")) {
    return false;
  }
  return true;
}

/**
 * Resuelve la rutina asignada a un alumno sin caer en el fallback ciego de rutinas[0].
 */
export function resolverRutinaAlumno(
  alumno: { rutinaId?: string } | undefined,
  rutinas: Rutina[]
): Rutina | undefined {
  if (!alumno || !alumno.rutinaId) return undefined;
  return rutinas.find((r) => r.id === alumno.rutinaId);
}

/**
 * Valida las credenciales ingresadas para Admin o Alumno.
 * - Admin: valida email (ej. admin@atlasgym.com o configurado) y contraseña.
 * - Alumno: comprueba que el email pertenezca a un alumno registrado en el gimnasio.
 *   Si no existe, devuelve error claro sin fallback ciego (Auditoría C1).
 *   Si existe, comprueba contraseña personalizada o default (alumno123) (Auditoría C2 y A4).
 */
export function validarCredenciales(
  email: string,
  clave: string,
  rol: "ADMIN" | "ALUMNO",
  credenciales: Record<string, string>,
  alumnos: Alumno[],
  adminEmail: string = "admin@atlasgym.com"
): ValidacionCredencialesResult {
  const emailNorm = (email || "").trim().toLowerCase();
  const claveNorm = (clave || "").trim();

  if (!emailNorm) {
    return { ok: false, motivo: "Por favor ingresá tu correo electrónico." };
  }
  if (!claveNorm) {
    return { ok: false, motivo: "Por favor ingresá tu contraseña." };
  }

  if (rol === "ADMIN") {
    const adminEmailNorm = adminEmail.trim().toLowerCase();
    if (emailNorm !== adminEmailNorm) {
      return { ok: false, motivo: "Correo no autorizado como Administrador." };
    }
    const claveEsperada = credenciales[adminEmailNorm] || CLAVE_ADMIN_DEFAULT;
    if (claveNorm !== claveEsperada) {
      return { ok: false, motivo: "Contraseña incorrecta para Administrador." };
    }
    return { ok: true };
  }

  // Rol ALUMNO
  const alumnoEncontrado = alumnos.find(
    (a) => (a.email || "").trim().toLowerCase() === emailNorm
  );

  if (!alumnoEncontrado) {
    return {
      ok: false,
      motivo: "No existe ningún socio registrado con este correo.",
    };
  }

  const claveEsperada = credenciales[emailNorm] || CLAVE_ALUMNO_DEFAULT;
  if (claveNorm !== claveEsperada) {
    return { ok: false, motivo: "Contraseña incorrecta para Alumno." };
  }

  return { ok: true, alumno: alumnoEncontrado };
}

/**
 * Construye el objeto de sesión para el alumno autenticado.
 */
export function construirSesionAlumno(alumno: Alumno): UsuarioSesion {
  return {
    id: `u_${alumno.id}`,
    nombre: alumno.nombre,
    email: alumno.email || `${alumno.id}@atlasgym.com`,
    rol: "ALUMNO",
    alumnoId: alumno.id,
    celular: alumno.celular,
  };
}

