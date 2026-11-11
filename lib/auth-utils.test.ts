import { describe, it, expect } from "vitest";
import {
  validarCredenciales,
  construirSesionAlumno,
  CLAVE_ADMIN_DEFAULT,
  CLAVE_ALUMNO_DEFAULT,
} from "./auth-utils";
import { Alumno } from "./types";

const ALUMNOS_PRUEBA: Alumno[] = [
  {
    id: "a1",
    nombre: "Carlos Gómez",
    email: "carlos.gomez@mail.com",
    plan: "Musculación",
    fechaAlta: "2026-01-10",
    activo: true,
  },
  {
    id: "a2",
    nombre: "Lucía Fernández",
    email: "lucia.fernandez@mail.com",
    plan: "Musculación + Cardio",
    fechaAlta: "2026-02-01",
    activo: true,
  },
];

describe("auth-utils", () => {
  describe("validarCredenciales - Admin", () => {
    it("autentica exitosamente al admin con clave por defecto", () => {
      const res = validarCredenciales(
        "admin@atlasgym.com",
        CLAVE_ADMIN_DEFAULT,
        "ADMIN",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(true);
      expect(res.motivo).toBeUndefined();
    });

    it("falla si el correo no coincide con el del admin", () => {
      const res = validarCredenciales(
        "otro@mail.com",
        CLAVE_ADMIN_DEFAULT,
        "ADMIN",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(false);
      expect(res.motivo).toContain("Correo no autorizado");
    });

    it("falla si la contraseña del admin es incorrecta", () => {
      const res = validarCredenciales(
        "admin@atlasgym.com",
        "clave_erronea",
        "ADMIN",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(false);
      expect(res.motivo).toContain("Contraseña incorrecta");
    });

    it("autentica con clave de admin actualizada", () => {
      const credenciales = { "admin@atlasgym.com": "miNuevaClave2026" };
      const res = validarCredenciales(
        "admin@atlasgym.com",
        "miNuevaClave2026",
        "ADMIN",
        credenciales,
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(true);
    });
  });

  describe("validarCredenciales - Alumno [Auditoría C1 y C2]", () => {
    it("[Auditoría C1] rechaza emails que no pertenecen a ningún alumno sin hacer fallback ciego", () => {
      const res = validarCredenciales(
        "fantasma@noexiste.com",
        CLAVE_ALUMNO_DEFAULT,
        "ALUMNO",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(false);
      expect(res.motivo).toBe("No existe ningún socio registrado con este correo.");
      expect(res.alumno).toBeUndefined();
    });

    it("autentica alumno existente con clave por defecto", () => {
      const res = validarCredenciales(
        "lucia.fernandez@mail.com",
        CLAVE_ALUMNO_DEFAULT,
        "ALUMNO",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(true);
      expect(res.alumno?.id).toBe("a2");
      expect(res.alumno?.nombre).toBe("Lucía Fernández");
    });

    it("ignora mayúsculas y espacios en el correo del alumno", () => {
      const res = validarCredenciales(
        "  LUCIA.FERNANDEZ@MAIL.COM  ",
        CLAVE_ALUMNO_DEFAULT,
        "ALUMNO",
        {},
        ALUMNOS_PRUEBA
      );
      expect(res.ok).toBe(true);
      expect(res.alumno?.id).toBe("a2");
    });

    it("[Auditoría C2] rechaza contraseña incorrecta y respeta contraseña personalizada", () => {
      const credenciales = { "carlos.gomez@mail.com": "claveSecretaCarlos" };

      // Con clave vieja/default debe fallar
      const resFallo = validarCredenciales(
        "carlos.gomez@mail.com",
        CLAVE_ALUMNO_DEFAULT,
        "ALUMNO",
        credenciales,
        ALUMNOS_PRUEBA
      );
      expect(resFallo.ok).toBe(false);
      expect(resFallo.motivo).toBe("Contraseña incorrecta para Alumno.");

      // Con su nueva clave debe pasar
      const resExito = validarCredenciales(
        "carlos.gomez@mail.com",
        "claveSecretaCarlos",
        "ALUMNO",
        credenciales,
        ALUMNOS_PRUEBA
      );
      expect(resExito.ok).toBe(true);
      expect(resExito.alumno?.id).toBe("a1");
    });
  });

  describe("construirSesionAlumno [Auditoría C1]", () => {
    it("asigna id u_<id>, alumnoId, nombre y email del alumno real", () => {
      const alumno = ALUMNOS_PRUEBA[1]; // Lucía Fernández
      const sesion = construirSesionAlumno(alumno);
      expect(sesion.id).toBe("u_a2");
      expect(sesion.alumnoId).toBe("a2");
      expect(sesion.nombre).toBe("Lucía Fernández");
      expect(sesion.email).toBe("lucia.fernandez@mail.com");
      expect(sesion.rol).toBe("ALUMNO");
    });
  });
});
