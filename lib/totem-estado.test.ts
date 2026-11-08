import { describe, expect, it } from "vitest";
import { avisoTotemSinSenal, type TotemEstadoDto } from "./totem-estado";

const estado = (parcial: Partial<TotemEstadoDto>): TotemEstadoDto => ({
  estado: "SIN_SENAL",
  ultimoLatido: "2026-11-09T18:05:00",
  minutosSinSenal: 12,
  pendientesOffline: 0,
  minutosAlerta: 5,
  ...parcial,
});

describe("aviso de tótem sin señal", () => {
  it("avisa desde cuándo no hay señal y qué revisar", () => {
    const aviso = avisoTotemSinSenal(estado({}));
    expect(aviso?.titulo).toBe("El tótem no tiene señal");
    expect(aviso?.detalle).toContain("desde las 18:05 (hace 12 min)");
    expect(aviso?.detalle).toContain("prendida");
    expect(aviso?.clave).toBe("2026-11-09T18:05:00");
  });

  it("usa horas y días cuando la caída es larga, y cuenta los ingresos sin subir", () => {
    expect(avisoTotemSinSenal(estado({ minutosSinSenal: 135 }))?.detalle).toContain("hace 2 h 15 min");
    const dosDias = avisoTotemSinSenal(estado({ minutosSinSenal: 2 * 24 * 60 + 30, pendientesOffline: 4 }));
    expect(dosDias?.detalle).toContain("desde el 09/11 a las 18:05 (hace 2 días)");
    expect(dosDias?.detalle).toContain("4 ingreso(s) sin subir");
  });

  it("no alarma con la tablet en línea, de noche, sin vincular o sin respuesta", () => {
    expect(avisoTotemSinSenal(estado({ estado: "EN_LINEA" }))).toBeNull();
    expect(avisoTotemSinSenal(estado({ estado: "FUERA_DE_HORARIO" }))).toBeNull();
    expect(avisoTotemSinSenal(estado({ estado: "NUNCA_CONECTADO", ultimoLatido: null }))).toBeNull();
    expect(avisoTotemSinSenal(null)).toBeNull();
  });
});
