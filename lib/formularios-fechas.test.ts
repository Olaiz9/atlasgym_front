import { describe, it, expect } from "vitest";
import { validarDatosAlumno, soloLetras, soloNumeros, emailValido } from "./validators";
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
});
