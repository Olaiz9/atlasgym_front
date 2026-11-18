import { describe, expect, it } from "vitest";
import { indiceDiaDeRutina, ultimaSesionDeAlumno } from "./rutina-utils";

const rutina = { id: "r1", dias: [{ id: "d1" }, { id: "d2" }, { id: "d3" }] };
const hoy = "2026-11-18";
const sesion = (cambios: Partial<{ id: string; alumnoId: string; rutinaId: string; diaId: string; fecha: string }>) => ({
  id: "1",
  alumnoId: "a1",
  rutinaId: "r1",
  diaId: "d1",
  fecha: "2026-11-17",
  ...cambios,
});

describe("indiceDiaDeRutina", () => {
  it("sin sesión previa arranca en el primer día", () => {
    expect(indiceDiaDeRutina(rutina, undefined, hoy)).toBe(0);
  });

  it("si la última sesión es de otra rutina arranca en el primer día", () => {
    expect(indiceDiaDeRutina(rutina, sesion({ rutinaId: "r2", diaId: "d2" }), hoy)).toBe(0);
  });

  it("si ya entrenó hoy se queda en ese mismo día", () => {
    expect(indiceDiaDeRutina(rutina, sesion({ diaId: "d2", fecha: hoy }), hoy)).toBe(1);
  });

  it("si entrenó otro día pasa al siguiente", () => {
    expect(indiceDiaDeRutina(rutina, sesion({ diaId: "d2" }), hoy)).toBe(2);
  });

  it("después del último día vuelve al primero", () => {
    expect(indiceDiaDeRutina(rutina, sesion({ diaId: "d3" }), hoy)).toBe(0);
  });

  it("si el día ya no existe en la rutina arranca en el primero", () => {
    expect(indiceDiaDeRutina(rutina, sesion({ diaId: "borrado" }), hoy)).toBe(0);
  });
});

describe("ultimaSesionDeAlumno", () => {
  it("elige la fecha más nueva del alumno y, en la misma fecha, la última cargada", () => {
    const sesiones = [
      sesion({ id: "1", fecha: "2026-11-10" }),
      sesion({ id: "2", diaId: "d1", fecha: "2026-11-17" }),
      sesion({ id: "3", diaId: "d2", fecha: "2026-11-17" }),
      sesion({ id: "9", alumnoId: "otro", fecha: hoy }),
    ];
    expect(ultimaSesionDeAlumno(sesiones, "a1")?.id).toBe("3");
    expect(ultimaSesionDeAlumno([...sesiones, sesion({ id: "uuid-local", diaId: "d3", fecha: "2026-11-17" })], "a1")?.id).toBe("uuid-local");
  });
});
