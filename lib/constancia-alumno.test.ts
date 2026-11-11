import { describe, expect, it } from "vitest";
import { calcularConstanciaAlumno } from "./asistencia-utils";
import type { RegistroAsistencia } from "./types";

const reg = (alumnoId: string, fecha: string): RegistroAsistencia =>
  ({ id: `${alumnoId}-${fecha}-${Math.random()}`, alumnoId, fecha, hora: "10:00" } as RegistroAsistencia);

describe("Portal del alumno — Mi constancia (datos reales, nunca fijos)", () => {
  it("sin asistencias muestra 0 y sin última visita", () => {
    expect(calcularConstanciaAlumno([], "1", "2026-10-31")).toEqual({ entrenosMes: 0, ultimaVisita: null });
  });

  it("cuenta días distintos del mes, solo del propio alumno", () => {
    const lista = [
      reg("1", "2026-10-31"),
      reg("1", "2026-10-31"), // doble check-in el mismo día
      reg("1", "2026-10-02"),
      reg("1", "2026-09-30"), // otro mes
      reg("2", "2026-10-15"), // otro alumno
    ];
    expect(calcularConstanciaAlumno(lista, "1", "2026-10-31")).toEqual({ entrenosMes: 2, ultimaVisita: "Hoy" });
  });

  it("calcula la última visita relativa (ayer / hace N días) aunque sea del mes anterior", () => {
    expect(calcularConstanciaAlumno([reg("1", "2026-10-30")], "1", "2026-10-31").ultimaVisita).toBe("Ayer");
    expect(calcularConstanciaAlumno([reg("1", "2026-09-28")], "1", "2026-10-03")).toEqual({
      entrenosMes: 0,
      ultimaVisita: "Hace 5 días",
    });
  });
});
