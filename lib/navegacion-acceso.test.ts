import { describe, it, expect } from "vitest";
import { Rutina, UsuarioSesion } from "./types";
import { RUTINAS_MOCK } from "./mock-data";

import { puedeAccederRuta, resolverRutinaAlumno } from "./auth-utils";

describe("Fase 1: Navegación y Control de Acceso (lib/navegacion-acceso.test.ts)", () => {
  describe("Control de Acceso por Rol (puedeAccederRuta)", () => {
    it("el ADMIN tiene acceso a todas las rutas del sistema", () => {
      expect(puedeAccederRuta("/", "ADMIN")).toBe(true);
      expect(puedeAccederRuta("/alumnos", "ADMIN")).toBe(true);
      expect(puedeAccederRuta("/alumnos/a1", "ADMIN")).toBe(true);
      expect(puedeAccederRuta("/planes", "ADMIN")).toBe(true);
      expect(puedeAccederRuta("/rutinas", "ADMIN")).toBe(true);
      expect(puedeAccederRuta("/finanzas", "ADMIN")).toBe(true);
    });

    it("el ALUMNO no puede acceder a /alumnos ni a subrutas de alumnos", () => {
      expect(puedeAccederRuta("/alumnos", "ALUMNO")).toBe(false);
      expect(puedeAccederRuta("/alumnos/a1", "ALUMNO")).toBe(false);
      expect(puedeAccederRuta("/alumnos/nuevo", "ALUMNO")).toBe(false);
    });

    it("el ALUMNO no puede acceder a la gestión de /planes", () => {
      expect(puedeAccederRuta("/planes", "ALUMNO")).toBe(false);
    });

    it("el ALUMNO sí tiene acceso a su panel, rutinas, cuotas y videoteca", () => {
      expect(puedeAccederRuta("/", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/rutinas", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/finanzas", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/avisos", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/videoteca", "ALUMNO")).toBe(true);
    });
  });

  describe("Resolución de Rutina de Alumno (resolverRutinaAlumno)", () => {
    it("retorna la rutina asignada si el alumno tiene rutinaId válido", () => {
      const alumnoConRutina = { rutinaId: "r1" };
      const rutina = resolverRutinaAlumno(alumnoConRutina, RUTINAS_MOCK);
      expect(rutina).toBeDefined();
      expect(rutina?.id).toBe("r1");
    });

    it("retorna undefined cuando el alumno no tiene rutina asignada (NO fallback a rutinas[0])", () => {
      const alumnoSinRutina = { rutinaId: undefined };
      const rutina = resolverRutinaAlumno(alumnoSinRutina, RUTINAS_MOCK);
      expect(rutina).toBeUndefined();
    });

    it("retorna undefined cuando el alumno es undefined", () => {
      expect(resolverRutinaAlumno(undefined, RUTINAS_MOCK)).toBeUndefined();
    });
  });
});
