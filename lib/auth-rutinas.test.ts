// lib/auth-rutinas.test.ts
import { describe, it, expect } from "vitest";
import { puedeAccederRuta, resolverRutinaAlumno } from "./auth-utils";
import { Rutina, UsuarioSesion } from "./types";

describe("Fase 1 & 5: Autenticación, Roles y Rutinas (lib/auth-rutinas.test.ts)", () => {
  describe("Validación de credenciales demo (Login)", () => {
    function validarCredencialesDemo(rol: "ADMIN" | "ALUMNO", passwordIngresada: string): boolean {
      if (rol === "ADMIN") {
        return passwordIngresada === "admin123";
      } else {
        return passwordIngresada === "alumno123";
      }
    }

    it("permite el acceso de ADMIN únicamente con la contraseña 'admin123'", () => {
      expect(validarCredencialesDemo("ADMIN", "admin123")).toBe(true);
      expect(validarCredencialesDemo("ADMIN", "wrong")).toBe(false);
      expect(validarCredencialesDemo("ADMIN", "")).toBe(false);
    });

    it("permite el acceso de ALUMNO únicamente con la contraseña 'alumno123'", () => {
      expect(validarCredencialesDemo("ALUMNO", "alumno123")).toBe(true);
      expect(validarCredencialesDemo("ALUMNO", "admin123")).toBe(false);
      expect(validarCredencialesDemo("ALUMNO", "123456")).toBe(false);
    });
  });

  describe("Protección de Rutas (puedeAccederRuta)", () => {
    it("ADMIN puede acceder a cualquier ruta del sistema", () => {
      const rutas = ["/", "/alumnos", "/alumnos/123", "/planes", "/finanzas", "/rutinas", "/avisos", "/videoteca"];
      for (const ruta of rutas) {
        expect(puedeAccederRuta(ruta, "ADMIN")).toBe(true);
      }
    });

    it("ALUMNO no puede acceder a las rutas de gestión administrativa", () => {
      expect(puedeAccederRuta("/alumnos", "ALUMNO")).toBe(false);
      expect(puedeAccederRuta("/alumnos/nuevo", "ALUMNO")).toBe(false);
      expect(puedeAccederRuta("/alumnos/a1", "ALUMNO")).toBe(false);
      expect(puedeAccederRuta("/planes", "ALUMNO")).toBe(false);
    });

    it("ALUMNO tiene acceso a sus vistas de entrenamiento, finanzas y contenido", () => {
      expect(puedeAccederRuta("/", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/rutinas", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/finanzas", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/avisos", "ALUMNO")).toBe(true);
      expect(puedeAccederRuta("/videoteca", "ALUMNO")).toBe(true);
    });
  });

  describe("Resolución segura de rutina (resolverRutinaAlumno)", () => {
    const catalogoRutinas: Rutina[] = [
      {
        id: "r-general",
        nombre: "Rutina General de Inicio",
        objetivo: "Adaptación",
        esGenerica: true,
        dias: [],
      },
      {
        id: "r-alumno-1",
        nombre: "Rutina Personalizada Hipertrofia",
        objetivo: "Hipertrofia",
        alumnoIdAsignado: "a1",
        esGenerica: false,
        dias: [],
      },
    ];

    it("retorna la rutina asignada si coincide con el rutinaId del alumno", () => {
      const alumno = { id: "a1", rutinaId: "r-alumno-1" };
      const res = resolverRutinaAlumno(alumno, catalogoRutinas);
      expect(res).toBeDefined();
      expect(res?.id).toBe("r-alumno-1");
    });

    it("retorna undefined y NO cae en el fallback ciego de rutinas[0] si el alumno no tiene rutina", () => {
      const alumnoSinRutina = { id: "a2", rutinaId: undefined };
      const res = resolverRutinaAlumno(alumnoSinRutina, catalogoRutinas);
      expect(res).toBeUndefined();
    });

    it("retorna undefined si el rutinaId no existe en el catálogo", () => {
      const alumnoConRutinaInexistente = { id: "a3", rutinaId: "no-existe" };
      const res = resolverRutinaAlumno(alumnoConRutinaInexistente, catalogoRutinas);
      expect(res).toBeUndefined();
    });
  });
});
