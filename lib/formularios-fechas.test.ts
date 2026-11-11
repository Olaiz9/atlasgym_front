import { describe, it, expect } from "vitest";
import { validarDatosAlumno, soloLetras, soloNumeros, emailValido, normalizarCelularArgentina, construirLinkWhatsapp } from "./validators";
import { formatFechaAR, parsearFechaLocal, calcularDiasDesde, formatDiasIngreso } from "./date-utils";

describe("Fase 2: Formularios, DNI y Fechas (lib/formularios-fechas.test.ts)", () => {
  describe("Validación unificada de Alumno (validarDatosAlumno)", () => {
    it("valida exitosamente un alumno con todos los campos correctos", () => {
      const errores = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "41234567",
        email: "martin@gmail.com",
        celular: "2615665067",
        plan: "Musculación",
      });
      expect(Object.keys(errores).length).toBe(0);
    });

    it("falla si el nombre tiene menos de 3 caracteres", () => {
      const errores = validarDatosAlumno({
        nombre: "Al",
        dni: "41234567",
        email: "martin@gmail.com",
        plan: "Musculación",
      });
      expect(errores.nombre).toBeDefined();
    });

    it("falla si el DNI tiene menos de 7 o más de 8 dígitos", () => {
      const errCorto = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "12345",
        email: "martin@gmail.com",
        plan: "Musculación",
      });
      expect(errCorto.dni).toBeDefined();

      const errLargo = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "123456789",
        email: "martin@gmail.com",
        plan: "Musculación",
      });
      expect(errLargo.dni).toBeDefined();
    });

    it("acepta DNI válido de 7 y 8 dígitos", () => {
      const err7 = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "7123456",
        email: "martin@gmail.com",
        plan: "Musculación",
      });
      expect(err7.dni).toBeUndefined();

      const err8 = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "41234567",
        email: "martin@gmail.com",
        plan: "Musculación",
      });
      expect(err8.dni).toBeUndefined();
    });

    it("falla si el email tiene formato inválido", () => {
      const errores = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "41234567",
        email: "correoinvalido",
        plan: "Musculación",
      });
      expect(errores.email).toBeDefined();
    });

    it("falla si falta el plan", () => {
      const errores = validarDatosAlumno({
        nombre: "Martín Gómez",
        dni: "41234567",
        email: "martin@gmail.com",
        plan: "",
      });
      expect(errores.plan).toBeDefined();
    });
  });

  describe("Inmunidad a Desplazamiento de Fecha por Timezone (date-utils)", () => {
    it("formatFechaAR formatea exactamente el día, mes y año sin restar horas por UTC", () => {
      expect(formatFechaAR("2026-09-04")).toBe("04/09/2026");
      expect(formatFechaAR("2026-01-01")).toBe("01/01/2026");
      expect(formatFechaAR("2026-12-31")).toBe("31/12/2026");
    });

    it("parsearFechaLocal genera una fecha con el día calendario exacto", () => {
      const fecha = parsearFechaLocal("2026-09-04");
      expect(fecha.getDate()).toBe(4);
      expect(fecha.getMonth()).toBe(8); // 0-indexed: 8 = Septiembre
      expect(fecha.getFullYear()).toBe(2026);
    });

    it("formatDiasIngreso formatea fechas relativas correctamente", () => {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = (hoy.getMonth() + 1).toString().padStart(2, "0");
      const dia = hoy.getDate().toString().padStart(2, "0");
      const strHoy = `${anio}-${mes}-${dia}`;

      expect(formatDiasIngreso(strHoy)).toBe("Hoy");
    });
  });

  describe("Unicidad de DNI (validarDatosAlumno con alumnosExistentes)", () => {
    const padronExistente = [
      { id: "a1", dni: "40111222" },
      { id: "a2", dni: "41333444" },
    ];

    it("falla al dar de alta un alumno con DNI ya registrado", () => {
      const errores = validarDatosAlumno(
        {
          nombre: "Nuevo Alumno",
          dni: "40111222",
          email: "nuevo@gmail.com",
          plan: "Musculación",
        },
        true,
        padronExistente
      );
      expect(errores.dni).toBe("Este DNI ya está registrado en el gimnasio");
    });

    it("permite actualizar un alumno manteniendo su propio DNI", () => {
      const errores = validarDatosAlumno(
        {
          nombre: "Alumno Modificado",
          dni: "40111222",
          email: "alumno1@gmail.com",
          plan: "Musculación",
        },
        false,
        padronExistente,
        "a1" // Su propio ID
      );
      expect(errores.dni).toBeUndefined();
    });

    it("falla al editar un alumno si ingresa el DNI de otro alumno existente", () => {
      const errores = validarDatosAlumno(
        {
          nombre: "Alumno Modificado",
          dni: "41333444",
          email: "alumno1@gmail.com",
          plan: "Musculación",
        },
        false,
        padronExistente,
        "a1"
      );
      expect(errores.dni).toBe("Este DNI ya está registrado en el gimnasio");
    });
  });

  describe("Normalización de Celular y Enlaces de WhatsApp", () => {
    it("normaliza celular de 10 dígitos locales agregando prefijo internacional 549", () => {
      expect(normalizarCelularArgentina("2611234567")).toBe("5492611234567");
    });

    it("normaliza celular de 11 dígitos con 0 inicial (remueve el 0 y agrega 549)", () => {
      expect(normalizarCelularArgentina("02611234567")).toBe("5492611234567");
    });

    it("normaliza celular de 12 dígitos con 54 sin 9 móvil (agrega el 9)", () => {
      expect(normalizarCelularArgentina("542611234567")).toBe("5492611234567");
    });

    it("mantiene intacto celular de 13 dígitos que ya incluye 549", () => {
      expect(normalizarCelularArgentina("5492611234567")).toBe("5492611234567");
    });

    it("elimina guiones, paréntesis y espacios antes de normalizar", () => {
      expect(normalizarCelularArgentina("+54 (261) 123-4567")).toBe("5492611234567");
    });

    it("construye un enlace de wa.me con mensaje codificado", () => {
      const link = construirLinkWhatsapp("2611234567", "Hola mundo! ¿Cómo estás?");
      expect(link).toBe("https://wa.me/5492611234567?text=Hola%20mundo!%20%C2%BFC%C3%B3mo%20est%C3%A1s%3F");
    });
  });
});

