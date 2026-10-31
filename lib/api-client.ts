// lib/api-client.ts
// Cliente HTTP con soporte de autenticación JWT (Authorization: Bearer <token>)
// para conectar el store (lib/store.tsx) con el Backend Spring Boot mediante proxy same-origin (/backend-api)
// o URL externa normalizada automáticamente.

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

/**
 * Normaliza la URL base de la API para evitar errores de configuración:
 * - Si está vacía o no definida -> usa "/backend-api" (proxy same-origin compatible con celulares en LAN, tablet Tótem y HTTPS).
 * - Si es ruta relativa (ej. "/backend-api/") -> quita barras finales.
 * - Si es URL absoluta sin sufijo "/api" (ej. "http://localhost:8080" o "https://api.atlasgym.com.ar/") -> agrega "/api" automáticamente.
 */
export function normalizarApiBaseUrl(rawUrl?: string): string {
  const limpia = (rawUrl || "").trim();
  if (!limpia) {
    return "/backend-api";
  }

  const sinBarraFinal = limpia.replace(/\/+$/, "");
  if (sinBarraFinal.startsWith("/")) {
    return sinBarraFinal || "/backend-api";
  }

  try {
    const parsed = new URL(sinBarraFinal);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "") {
      return `${sinBarraFinal}/api`;
    }
    return sinBarraFinal;
  } catch {
    return sinBarraFinal;
  }
}

/**
 * Resuelve la URL raíz interna del Backend Spring Boot para el proxy server-side (/backend-api/*).
 * Quita barras finales y sufijos "/api" redundantes para construir `${upstream}/api/${subRuta}`.
 */
export function resolverUrlUpstreamBackend(rawBackendUrl?: string): string {
  const base = (rawBackendUrl || "http://127.0.0.1:8080").trim();
  const sinBarraFinal = base.replace(/\/+$/, "");
  if (sinBarraFinal.endsWith("/api")) {
    return sinBarraFinal.slice(0, -4);
  }
  return sinBarraFinal;
}

export const API_BASE_URL = normalizarApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

const TOKEN_STORAGE_KEY = "atlas_jwt_token";
export const TOTEM_DEVICE_SECRET_KEY = "atlas_totem_device_secret";

export function getStoredTotemSecret(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(TOTEM_DEVICE_SECRET_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setStoredTotemSecret(secret: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const limpio = (secret || "").trim();
    if (limpio) {
      localStorage.setItem(TOTEM_DEVICE_SECRET_KEY, limpio);
    } else {
      localStorage.removeItem(TOTEM_DEVICE_SECRET_KEY);
    }
  } catch {}
}

export function isApiRuntimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof process !== "undefined" && process.env?.VITEST) return false;
  return true;
}

/**
 * Determina si está permitido caer al modo demo local sin backend durante el login.
 * En producción (o una vez que el navegador ya sincronizó datos reales desde MySQL),
 * NUNCA abre una sesión fantasma local con "admin123".
 */
export function esFallbackOfflineDemoPermitido(opciones?: {
  nodeEnv?: string;
  allowOfflineDemoEnv?: string;
  yaSincronizadoConBackend?: boolean;
  apiRuntimeActivo?: boolean;
}): boolean {
  const apiActiva = opciones?.apiRuntimeActivo ?? isApiRuntimeEnabled();
  if (!apiActiva) return true;

  const flagExplicito =
    opciones?.allowOfflineDemoEnv ?? process.env.NEXT_PUBLIC_ALLOW_OFFLINE_DEMO;
  if (flagExplicito === "true") return true;
  if (flagExplicito === "false") return false;

  const entorno = opciones?.nodeEnv ?? process.env.NODE_ENV;
  if (entorno === "production") return false;

  if (opciones?.yaSincronizadoConBackend) return false;

  return true;
}

/**
 * Determina si un error corresponde a caída de red / backend inaccesible (modo offline),
 * diferenciándolo de rechazos HTTP explícitos del servidor (400, 401, 403, 404, 409, 429, 500).
 */
export function esErrorDeRed(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("BACKEND_UNREACHABLE") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("ERR_NETWORK") ||
    msg.includes("fetch failed")
  );
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
    if (response.headers.get("x-atlas-upstream-offline") === "1") {
      throw new Error(
        "BACKEND_UNREACHABLE: No se pudo conectar con el servidor central del gimnasio."
      );
    }
    let mensajeError = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data?.codigo === "BACKEND_UNREACHABLE") {
        throw new Error(
          `BACKEND_UNREACHABLE: ${data?.mensaje || "Servidor central inaccesible."}`
        );
      }
      if (data?.mensaje) mensajeError = data.mensaje;
      else if (data?.message) mensajeError = data.message;
    } catch (innerErr) {
      if (innerErr instanceof Error && innerErr.message.includes("BACKEND_UNREACHABLE")) {
        throw innerErr;
      }
    }
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

export async function apiBlanquearClaveAlumno(id: number): Promise<BackendAlumnoDto> {
  return apiFetch<BackendAlumnoDto>(`/alumnos/${id}/blanquear-clave`, {
    method: "POST",
  });
}

export interface RespuestaImportacionMasivaDto {
  procesados: number;
  creados: number;
  actualizados: number;
  pagosInicialesRegistrados: number;
  omitidos: number;
  advertencias: string[];
}

export async function apiImportarAlumnosMasivo(
  filas: {
    nombre: string;
    dni: string;
    celular?: string;
    email?: string;
    planNombre?: string;
    ultimoPeriodoPago?: string;
    montoUltimoPago?: number;
    metodoPago?: string;
  }[]
): Promise<RespuestaImportacionMasivaDto> {
  return apiFetch<RespuestaImportacionMasivaDto>("/alumnos/importar", {
    method: "POST",
    body: JSON.stringify({ filas }),
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

export async function apiCompletarSaldoPago(
  id: number,
  metodo?: string,
  comprobante?: string
): Promise<BackendPagoDto> {
  return apiFetch<BackendPagoDto>(`/pagos/${id}/completar`, {
    method: "POST",
    body: JSON.stringify({ metodo: metodo || null, comprobante: comprobante || null }),
  });
}

export async function apiAnularPago(
  id: number,
  motivo: string
): Promise<BackendPagoDto> {
  return apiFetch<BackendPagoDto>(`/pagos/${id}/anular`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

export async function apiGetArqueoCaja(
  fecha?: string
): Promise<{
  fecha: string;
  totalRecaudado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  cantidadCobros: number;
  cantidadParciales: number;
  saldoPendienteParciales: number;
  cantidadAnulados: number;
  montoAnulado: number;
  porOperador: { operador: string; totalRecaudado: number; cantidadOperaciones: number }[];
}> {
  const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return apiFetch(`/pagos/arqueo${qs}`);
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

export interface FiltrosConsultaAsistencias {
  fecha?: string;
  desde?: string;
  hasta?: string;
}

export async function apiGetAsistencias(
  filtros?: FiltrosConsultaAsistencias
): Promise<BackendAsistenciaDto[]> {
  const params = new URLSearchParams();
  if (filtros?.fecha) {
    params.set("fecha", filtros.fecha);
  } else {
    if (filtros?.desde) params.set("desde", filtros.desde);
    if (filtros?.hasta) params.set("hasta", filtros.hasta);
  }
  const qs = params.toString();
  return apiFetch<BackendAsistenciaDto[]>(qs ? `/asistencias?${qs}` : "/asistencias");
}

export async function apiCheckInTotem(
  dni: string
): Promise<BackendTotemCheckInDto> {
  const headers: Record<string, string> = {};
  const secret = getStoredTotemSecret();
  if (secret) {
    headers["X-Totem-Secret"] = secret;
  }
  return apiFetch<BackendTotemCheckInDto>("/asistencias/totem", {
    method: "POST",
    headers,
    body: JSON.stringify({ dni }),
  });
}

export interface BackendTotemPadronItemDto {
  alumnoId: number;
  nombre: string;
  dni: string;
  planNombre: string;
  limiteDiasSemana: number | null;
  estadoCuenta: "AL_DIA" | "PENDIENTE" | "MOROSO" | "INACTIVO";
  activo: boolean;
}

export interface BackendTotemOfflineSyncItemDto {
  clientEventId: string;
  dni: string;
  fecha: string;
  hora: string;
}

export interface BackendTotemOfflineSyncResponseDto {
  recibidos: number;
  registradosNuevos: number;
  yaExistentes: number;
  rechazados: number;
  clientEventIdsProcesados: string[];
}

export async function apiGetTotemPadronCache(): Promise<BackendTotemPadronItemDto[]> {
  const headers: Record<string, string> = {};
  const secret = getStoredTotemSecret();
  if (secret) {
    headers["X-Totem-Secret"] = secret;
  }
  return apiFetch<BackendTotemPadronItemDto[]>("/asistencias/totem/padron-cache", {
    method: "GET",
    headers,
  });
}

export async function apiSyncTotemOutbox(
  eventos: BackendTotemOfflineSyncItemDto[]
): Promise<BackendTotemOfflineSyncResponseDto> {
  const headers: Record<string, string> = {};
  const secret = getStoredTotemSecret();
  if (secret) {
    headers["X-Totem-Secret"] = secret;
  }
  return apiFetch<BackendTotemOfflineSyncResponseDto>("/asistencias/totem/sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ eventos }),
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
