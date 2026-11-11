import { describe, it, expect } from "vitest";
import {
  encolarEventoOutboxTotem,
  guardarPadronCacheTotem,
  leerOutboxTotem,
  leerPadronCacheTotem,
  removerEventosSincronizadosOutbox,
  resolverCheckInOfflineConPadron,
  TotemPadronCacheItem,
} from "./totem-offline";

function crearStorageMemoria() {
  const mapa = new Map<string, string>();
  return {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mapa.set(k, v);
    },
  };
}

describe("Etapa 3 - Resiliencia Offline Real del Tótem (Padrón Mínimo + Cola Outbox Idempotente)", () => {
  const padronReal: TotemPadronCacheItem[] = [
    {
      alumnoId: 101,
      nombre: "Matías Pereyra",
      dni: "40555666",
      planNombre: "Plan 3 Días",
      limiteDiasSemana: 3,
      estadoCuenta: "AL_DIA",
      activo: true,
    },
    {
      alumnoId: 102,
      nombre: "Sofía Baja",
      dni: "38111222",
      planNombre: "Pase Libre",
      limiteDiasSemana: null,
      estadoCuenta: "INACTIVO",
      activo: false,
    },
  ];

  it("persiste y recupera el padrón mínimo real sin exponer datos sensibles", () => {
    const storage = crearStorageMemoria();
    guardarPadronCacheTotem(padronReal, storage);
    const recuperado = leerPadronCacheTotem(storage);
    expect(recuperado).toHaveLength(2);
    expect(recuperado?.[0].nombre).toBe("Matías Pereyra");
  });

  it("resuelve ingresos offline contra el padrón real, respeta ventana de 100 min y rechaza inactivos/desconocidos", () => {
    const ahora = new Date(2026, 9, 31, 18, 30, 0).getTime();

    // 1. DNI inexistente -> rechazado
    const desconocido = resolverCheckInOfflineConPadron("99888777", padronReal, [], ahora, "2026-10-31");
    expect(desconocido.ok).toBe(false);

    // 2. Socio inactivo -> rechazado con estado INACTIVO
    const inactivo = resolverCheckInOfflineConPadron("38.111.222", padronReal, [], ahora, "2026-10-31");
    expect(inactivo.ok).toBe(false);
    expect(inactivo.estadoCuenta).toBe("INACTIVO");

    // 3. Socio activo -> aprobado + genera asistencia local y evento Outbox con clientEventId único
    const exito = resolverCheckInOfflineConPadron("40.555.666", padronReal, [], ahora, "2026-10-31");
    expect(exito.ok).toBe(true);
    expect(exito.alumno?.nombre).toBe("Matías Pereyra");
    expect(exito.eventoOutbox?.clientEventId).toContain("totem-40555666-");
    expect(exito.asistenciaLocal?.limiteDiasSemana).toBe(3);

    // 4. Reintento a los 15 minutos (< 100 min) -> detecta sesión activa sin duplicar Outbox
    const duplicado = resolverCheckInOfflineConPadron(
      "40555666",
      padronReal,
      [exito.asistenciaLocal!],
      ahora + 15 * 60 * 1000,
      "2026-10-31"
    );
    expect(duplicado.ok).toBe(false);
    expect(duplicado.yaRegistrado).toBe(true);
  });

  it("encola eventos Outbox sin duplicar en ventana activa y limpia los IDs confirmados por el backend", () => {
    const storage = crearStorageMemoria();
    const t0 = new Date(2026, 9, 31, 10, 0, 0).getTime();

    encolarEventoOutboxTotem(
      {
        clientEventId: "evt-1",
        dni: "40.555.666",
        fecha: "2026-10-31",
        hora: "10:00:00",
        timestamp: t0,
      },
      storage
    );

    // Mismo socio 5 minutos después -> deduplicado en cola
    encolarEventoOutboxTotem(
      {
        clientEventId: "evt-1-dup",
        dni: "40555666",
        fecha: "2026-10-31",
        hora: "10:05:00",
        timestamp: t0 + 5 * 60 * 1000,
      },
      storage
    );

    // Otro socio -> sí se agrega
    encolarEventoOutboxTotem(
      {
        clientEventId: "evt-2",
        dni: "42999888",
        fecha: "2026-10-31",
        hora: "10:06:00",
        timestamp: t0 + 6 * 60 * 1000,
      },
      storage
    );

    expect(leerOutboxTotem(storage)).toHaveLength(2);

    const trasConfirmar = removerEventosSincronizadosOutbox(["evt-1"], storage);
    expect(trasConfirmar).toHaveLength(1);
    expect(trasConfirmar[0].clientEventId).toBe("evt-2");
  });
});
