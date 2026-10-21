// lib/api-client.ts
// Cliente HTTP con soporte de autenticación JWT (Authorization: Bearer <token>)
// para conectar el amortiguador (lib/store.tsx) con el Backend Spring Boot.

import {
  BackendAlumnoDto,
  BackendAsistenciaDto,
  BackendAvisoDto,
  BackendLoginResponse,
  BackendPagoDto,
  BackendPlanDto,
  BackendRutinaDto,
  BackendSesionResponseDto,
  BackendTotemCheckInDto,
  BackendVideoTecnicaDto,
} from "./api-mappers";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const TOKEN_STORAGE_KEY = "atlas_jwt_token";

export function isApiRuntimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof process !== "undefined" && process.env?.VITEST) return false;
  return true;
}

export function getStoredJwtToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredJwtToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredJwtToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let mensajeError = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data?.mensaje) mensajeError = data.mensaje;
      else if (data?.message) mensajeError = data.message;
    } catch {}
    throw new Error(mensajeError);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// ── Endpoints de Autenticación ──────────────────────────────────────────────

export async function apiLogin(
  email: string,
  password: string
): Promise<BackendLoginResponse> {
  return apiFetch<BackendLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiActualizarPerfil(
  cambios: Record<string, string | undefined>
): Promise<BackendLoginResponse> {
  return apiFetch<BackendLoginResponse>("/auth/perfil", {
    method: "PUT",
    body: JSON.stringify(cambios),
  });
}

// ── Endpoints de Alumnos ────────────────────────────────────────────────────

export async function apiGetAlumnos(): Promise<BackendAlumnoDto[]> {
  return apiFetch<BackendAlumnoDto[]>("/alumnos");
}

export async function apiCrearAlumno(
  body: Record<string, unknown>
): Promise<BackendAlumnoDto> {
  return apiFetch<BackendAlumnoDto>("/alumnos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiActualizarAlumno(
  id: number,
  body: Record<string, unknown>
): Promise<BackendAlumnoDto> {
  return apiFetch<BackendAlumnoDto>(`/alumnos/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDarDeBajaAlumno(id: number): Promise<void> {
  return apiFetch<void>(`/alumnos/${id}`, {
    method: "DELETE",
  });
}

export async function apiAsignarCredencialesAlumno(
  id: number,
  usuario: string,
  password: string
): Promise<BackendAlumnoDto> {
  return apiFetch<BackendAlumnoDto>(`/alumnos/${id}/credenciales`, {
    method: "POST",
    body: JSON.stringify({ usuario, password }),
  });
}

// ── Endpoints de Planes ─────────────────────────────────────────────────────

export async function apiGetPlanes(): Promise<BackendPlanDto[]> {
  return apiFetch<BackendPlanDto[]>("/planes");
}

export async function apiCrearPlan(
  body: Record<string, unknown>
): Promise<BackendPlanDto> {
  return apiFetch<BackendPlanDto>("/planes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiActualizarPlan(
  id: number,
  body: Record<string, unknown>
): Promise<BackendPlanDto> {
  return apiFetch<BackendPlanDto>(`/planes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiEliminarPlan(id: number): Promise<void> {
  return apiFetch<void>(`/planes/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Pagos ──────────────────────────────────────────────────────

export async function apiGetPagos(): Promise<BackendPagoDto[]> {
  return apiFetch<BackendPagoDto[]>("/pagos");
}

export async function apiGetPagosPorAlumno(
  alumnoId: number
): Promise<BackendPagoDto[]> {
  return apiFetch<BackendPagoDto[]>(`/pagos/alumno/${alumnoId}`);
}

export async function apiRegistrarPago(
  body: Record<string, unknown>
): Promise<BackendPagoDto> {
  return apiFetch<BackendPagoDto>("/pagos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiActualizarEstadoPago(
  id: number,
  estado: string
): Promise<BackendPagoDto> {
  return apiFetch<BackendPagoDto>(`/pagos/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export async function apiEliminarPago(id: number): Promise<void> {
  return apiFetch<void>(`/pagos/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Rutinas ────────────────────────────────────────────────────

export async function apiGetRutinas(): Promise<BackendRutinaDto[]> {
  return apiFetch<BackendRutinaDto[]>("/rutinas");
}

export async function apiGetRutinaDeAlumno(
  alumnoId: number
): Promise<BackendRutinaDto> {
  return apiFetch<BackendRutinaDto>(`/rutinas/alumno/${alumnoId}`);
}

export async function apiCrearRutina(
  body: Record<string, unknown>
): Promise<BackendRutinaDto> {
  return apiFetch<BackendRutinaDto>("/rutinas", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiActualizarRutina(
  id: number,
  body: Record<string, unknown>
): Promise<BackendRutinaDto> {
  return apiFetch<BackendRutinaDto>(`/rutinas/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiAsignarRutina(
  rutinaId: number,
  alumnoId: number
): Promise<void> {
  return apiFetch<void>(`/rutinas/${rutinaId}/asignar/${alumnoId}`, {
    method: "POST",
  });
}

export async function apiEliminarRutina(id: number): Promise<void> {
  return apiFetch<void>(`/rutinas/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Asistencias y Tótem ────────────────────────────────────────

export async function apiGetAsistencias(): Promise<BackendAsistenciaDto[]> {
  return apiFetch<BackendAsistenciaDto[]>("/asistencias");
}

export async function apiCheckInTotem(
  dni: string
): Promise<BackendTotemCheckInDto> {
  return apiFetch<BackendTotemCheckInDto>("/asistencias/totem", {
    method: "POST",
    body: JSON.stringify({ dni }),
  });
}

export async function apiEliminarAsistencia(id: number): Promise<void> {
  return apiFetch<void>(`/asistencias/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Videoteca ──────────────────────────────────────────────────

export async function apiGetVideoteca(): Promise<BackendVideoTecnicaDto[]> {
  return apiFetch<BackendVideoTecnicaDto[]>("/videoteca");
}

export async function apiCrearVideo(
  body: BackendVideoTecnicaDto
): Promise<BackendVideoTecnicaDto> {
  return apiFetch<BackendVideoTecnicaDto>("/videoteca", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiEliminarVideo(id: number): Promise<void> {
  return apiFetch<void>(`/videoteca/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Avisos ─────────────────────────────────────────────────────

export async function apiGetAvisosAdmin(): Promise<BackendAvisoDto[]> {
  return apiFetch<BackendAvisoDto[]>("/avisos");
}

export async function apiGetMisAvisos(): Promise<BackendAvisoDto[]> {
  return apiFetch<BackendAvisoDto[]>("/avisos/mis-avisos");
}

export async function apiCrearAviso(
  body: Record<string, unknown>
): Promise<BackendAvisoDto> {
  return apiFetch<BackendAvisoDto>("/avisos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiMarcarAvisoLeido(id: number): Promise<void> {
  return apiFetch<void>(`/avisos/${id}/leido`, {
    method: "PUT",
  });
}

export async function apiEliminarAviso(id: number): Promise<void> {
  return apiFetch<void>(`/avisos/${id}`, {
    method: "DELETE",
  });
}

// ── Endpoints de Sesiones de Entrenamiento ──────────────────────────────────

export async function apiGuardarSesion(
  body: Record<string, unknown>
): Promise<BackendSesionResponseDto> {
  return apiFetch<BackendSesionResponseDto>("/sesiones", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetHistorialSesiones(
  alumnoId: number
): Promise<BackendSesionResponseDto[]> {
  return apiFetch<BackendSesionResponseDto[]>(`/sesiones/historial/${alumnoId}`);
}
