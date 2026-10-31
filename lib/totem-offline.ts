// lib/totem-offline.ts
// Resiliencia Offline Real del Kiosco Tótem:
// 1. Caché local del padrón mínimo real sincronizado desde MySQL (sin depender de ALUMNOS_MOCK).
// 2. Cola Outbox persistente e idempotente (clientEventId único) para reenviar fichajes cuando vuelve Internet.

import { Alumno, EstadoCuenta, RegistroAsistencia } from "./types";
import { estaSesionActiva, normalizarDni } from "./asistencia-utils";
import { fechaLocalHoy } from "./date-utils";

export const TOTEM_PADRON_CACHE_KEY = "atlas_totem_padron_cache_v1";
export const TOTEM_OUTBOX_KEY = "atlas_totem_outbox_v1";
const MAX_OUTBOX_ITEMS = 1000;

export interface TotemPadronCacheItem {
  alumnoId: number;
  nombre: string;
  dni: string;
  planNombre: string;
  limiteDiasSemana: number | null;
  estadoCuenta: EstadoCuenta;
  activo: boolean;
}

export interface TotemOutboxEvent {
  clientEventId: string;
  dni: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:mm:ss"
  timestamp: number;
}

export function generarClientEventIdTotem(dni: string, timestamp: number = Date.now()): string {
  const limpio = normalizarDni(dni);
  const rand = Math.random().toString(36).slice(2, 10);
  return `totem-${limpio}-${timestamp}-${rand}`;
}

export function guardarPadronCacheTotem(
  items: TotemPadronCacheItem[],
  storage?: Pick<Storage, "setItem">
): void {
  const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return;
  try {
    target.setItem(TOTEM_PADRON_CACHE_KEY, JSON.stringify(items));
  } catch {}
}

export function leerPadronCacheTotem(
  storage?: Pick<Storage, "getItem">
): TotemPadronCacheItem[] | null {
  const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return null;
  try {
    const raw = target.getItem(TOTEM_PADRON_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TotemPadronCacheItem[]) : null;
  } catch {
    return null;
  }
}

export function leerOutboxTotem(storage?: Pick<Storage, "getItem">): TotemOutboxEvent[] {
  const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!target) return [];
  try {
    const raw = target.getItem(TOTEM_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TotemOutboxEvent[]) : [];
  } catch {
    return [];
  }
}

export function encolarEventoOutboxTotem(
  evento: TotemOutboxEvent,
  storage?: Pick<Storage, "getItem" | "setItem">
): TotemOutboxEvent[] {
  const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const actual = leerOutboxTotem(target);
  const dniLimpio = normalizarDni(evento.dni);
  const yaExiste = actual.some(
    (e) =>
      e.clientEventId === evento.clientEventId ||
      (normalizarDni(e.dni) === dniLimpio &&
        e.fecha === evento.fecha &&
        estaSesionActiva(e.timestamp, evento.timestamp))
  );
  if (yaExiste) {
    return actual;
  }
  const actualizado = [...actual, { ...evento, dni: dniLimpio }].slice(-MAX_OUTBOX_ITEMS);
  if (target) {
    try {
      target.setItem(TOTEM_OUTBOX_KEY, JSON.stringify(actualizado));
    } catch {}
  }
  return actualizado;
}

export function removerEventosSincronizadosOutbox(
  clientEventIdsProcesados: string[],
  storage?: Pick<Storage, "getItem" | "setItem">
): TotemOutboxEvent[] {
  const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const actual = leerOutboxTotem(target);
  if (!clientEventIdsProcesados || clientEventIdsProcesados.length === 0) {
    return actual;
  }
  const procesadosSet = new Set(clientEventIdsProcesados);
  const restante = actual.filter((e) => !procesadosSet.has(e.clientEventId));
  if (target) {
    try {
      target.setItem(TOTEM_OUTBOX_KEY, JSON.stringify(restante));
    } catch {}
  }
  return restante;
}

export interface ResultadoCheckInOfflinePadron {
  ok: boolean;
  yaRegistrado?: boolean;
  alumno?: Alumno;
  estadoCuenta?: EstadoCuenta;
  motivo?: string;
  asistenciaLocal?: RegistroAsistencia;
  eventoOutbox?: TotemOutboxEvent;
}

/**
 * Resuelve un fichaje del Tótem durante un corte de red usando el padrón real cacheado.
 * Aplica la misma regla anti-fraude de 100 minutos y genera el evento Outbox idempotente.
 */
export function resolverCheckInOfflineConPadron(
  dniInput: string,
  padron: TotemPadronCacheItem[],
  asistenciasPrevias: RegistroAsistencia[],
  ahoraMs: number = Date.now(),
  fechaHoy: string = fechaLocalHoy()
): ResultadoCheckInOfflinePadron {
  const dniLimpio = normalizarDni(dniInput);
  if (!dniLimpio) {
    return { ok: false, motivo: "Por favor ingresá un DNI válido." };
  }

  const item = padron.find((p) => normalizarDni(p.dni) === dniLimpio);
  if (!item) {
    return { ok: false, motivo: "DNI no encontrado en el padrón sincronizado del gimnasio." };
  }

  const alumno: Alumno = {
    id: String(item.alumnoId),
    nombre: item.nombre,
    dni: item.dni,
    plan: item.planNombre || "Pase Libre",
    fechaAlta: fechaHoy,
    activo: item.activo,
    tieneRutina: false,
  };

  if (!item.activo || item.estadoCuenta === "INACTIVO") {
    return {
      ok: false,
      alumno,
      estadoCuenta: "INACTIVO",
      motivo: "El socio figura como inactivo en el sistema.",
    };
  }

  const sesionActiva = asistenciasPrevias.find(
    (a) =>
      (a.alumnoId === alumno.id || normalizarDni(a.alumnoDni) === dniLimpio) &&
      a.fecha === fechaHoy &&
      estaSesionActiva(a.timestamp, ahoraMs)
  );

  if (sesionActiva) {
    return {
      ok: false,
      yaRegistrado: true,
      alumno,
      estadoCuenta: item.estadoCuenta,
      motivo: "Tu sesión de entrenamiento continúa activa.",
    };
  }

  const fechaObj = new Date(ahoraMs);
  const hh = String(fechaObj.getHours()).padStart(2, "0");
  const mm = String(fechaObj.getMinutes()).padStart(2, "0");
  const ss = String(fechaObj.getSeconds()).padStart(2, "0");
  const clientEventId = generarClientEventIdTotem(dniLimpio, ahoraMs);

  const asistenciaLocal: RegistroAsistencia = {
    id: `asist-local-${clientEventId}`,
    alumnoId: alumno.id,
    alumnoNombre: alumno.nombre,
    alumnoDni: dniLimpio,
    fecha: fechaHoy,
    hora: `${hh}:${mm}`,
    timestamp: ahoraMs,
    estadoCuenta: item.estadoCuenta,
    planNombre: alumno.plan,
    metodo: "DNI_TOTEM",
    limiteDiasSemana: item.limiteDiasSemana,
  };

  const eventoOutbox: TotemOutboxEvent = {
    clientEventId,
    dni: dniLimpio,
    fecha: fechaHoy,
    hora: `${hh}:${mm}:${ss}`,
    timestamp: ahoraMs,
  };

  return {
    ok: true,
    alumno,
    estadoCuenta: item.estadoCuenta,
    asistenciaLocal,
    eventoOutbox,
  };
}
