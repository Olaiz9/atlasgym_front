import { describe, it, expect } from "vitest";
import {
  estadoCuentaDeAlumno,
  obtenerMaxPeriodoCubiertoAlumno,
  obtenerPeriodoFinCubierto,
  Pago,
  EstadoPago,
} from "./types";
import { calcularVencimientoCuota, fechaLocalHoy } from "./date-utils";

describe("Política Oficial de Cuotas Opción A y Multi-Mes (lib/cuotas-estados.test.ts)", () => {
  const alumnoId = "a-test-1";

  describe("Separación entre Socio Activo (socioActivo) y Estado de Cuota", () => {
    it("retorna INACTIVO si socioActivo es false, incluso si tiene pagos recientes pagados", () => {
      const pagosRecientes: Pago[] = [
        {
          id: "p1",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaLocalHoy(),
          metodo: "Efectivo",
          estado: "PAGADO",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosRecientes, "2026-01-01", false);
      expect(estado).toBe("INACTIVO");
    });

    it("clasifica como MOROSO a un socio activo si tiene una cuota explícitamente marcada como VENCIDO", () => {
      const pagosConVencido: Pago[] = [
        {
          id: "p1",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaLocalHoy(),
          metodo: "Efectivo",
          estado: "VENCIDO",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosConVencido, "2026-01-01", true);
      expect(estado).toBe("MOROSO");
    });

    it("clasifica como PENDIENTE si tiene cuota del mes actual en estado PENDIENTE", () => {
      const pagosPendientes: Pago[] = [
        {
          id: "p1",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaLocalHoy(),
          metodo: "Transferencia",
          estado: "PENDIENTE",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosPendientes, "2026-01-01", true);
      expect(estado).toBe("PENDIENTE");
    });

    it("clasifica como AL_DIA si la cuota del período actual está PAGADA", () => {
      const pagosAlDia: Pago[] = [
        {
          id: "p1",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaLocalHoy(),
          metodo: "Efectivo",
          estado: "PAGADO",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosAlDia, "2026-01-01", true);
      expect(estado).toBe("AL_DIA");
    });

    it("transiciona de MOROSO a AL_DIA al actualizar el estado de la cuota vencida a PAGADO", () => {
      let pagos: Pago[] = [
        {
          id: "p-vencido",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaLocalHoy(),
          metodo: "Efectivo",
          estado: "VENCIDO",
        },
      ];

      expect(estadoCuentaDeAlumno(alumnoId, pagos, "2026-01-01", true)).toBe("MOROSO");

      pagos = pagos.map((p) => (p.id === "p-vencido" ? { ...p, estado: "PAGADO" as EstadoPago } : p));

      expect(estadoCuentaDeAlumno(alumnoId, pagos, "2026-01-01", true)).toBe("AL_DIA");
    });
  });

  describe("Transiciones Opción A (1 al 10 AL_DIA, 11 a fin de mes PENDIENTE, mes siguiente MOROSO)", () => {
    const pagosAgosto: Pago[] = [
      {
        id: "p-ago",
        alumnoId,
        plan: "Musculación",
        monto: 28000,
        fecha: "2026-08-05",
        periodoMes: "2026-08",
        metodo: "Efectivo",
        estado: "PAGADO",
      },
    ];

    it("mantiene AL_DIA del 1 al 10 de septiembre (ventana de pago del 1 al 10)", () => {
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 8, 1))
      ).toBe("AL_DIA");
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 8, 5))
      ).toBe("AL_DIA");
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 8, 10))
      ).toBe("AL_DIA");
    });

    it("pasa a PENDIENTE del 11 al 30 de septiembre si todavía no abonó septiembre", () => {
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 8, 11))
      ).toBe("PENDIENTE");
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 8, 30))
      ).toBe("PENDIENTE");
    });

    it("pasa a MOROSO en octubre cuando se pasa el mes de septiembre entero sin pagar", () => {
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 9, 1))
      ).toBe("MOROSO");
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 9, 25))
      ).toBe("MOROSO");
    });

    it("pasa a INACTIVO por abandono recién al tercer mes sin cobertura y > 60 días sin actividad", () => {
      expect(
        estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, new Date(2026, 10, 5))
      ).toBe("INACTIVO");
    });
  });

  describe("Planes Multi-Mes (Bimestral, Trimestral, Semestral, Anual)", () => {
    it("mantiene AL_DIA durante los 3 meses de un pago trimestral sin marcarlo INACTIVO a los 85 días", () => {
      const pagoTrimestral: Pago[] = [
        {
          id: "p-trim",
          alumnoId,
          plan: "Musculación Trimestral",
          monto: 75000,
          fecha: "2026-08-01",
          periodoMes: "2026-08",
          cantidadMeses: 3, // Cubre 2026-08, 2026-09 y 2026-10
          metodo: "Transferencia",
          estado: "PAGADO",
        },
      ];

      expect(obtenerPeriodoFinCubierto(pagoTrimestral[0])).toBe("2026-10");
      expect(obtenerMaxPeriodoCubiertoAlumno(pagoTrimestral)).toBe("2026-10");

      // 25 de Octubre (85 días después del pago) -> sigue AL_DIA
      expect(
        estadoCuentaDeAlumno(alumnoId, pagoTrimestral, "2026-08-01", true, new Date(2026, 9, 25))
      ).toBe("AL_DIA");

      // 8 de Noviembre (ventana 1 al 10 de renovación) -> sigue AL_DIA
      expect(
        estadoCuentaDeAlumno(alumnoId, pagoTrimestral, "2026-08-01", true, new Date(2026, 10, 8))
      ).toBe("AL_DIA");

      // 12 de Noviembre -> PENDIENTE
      expect(
        estadoCuentaDeAlumno(alumnoId, pagoTrimestral, "2026-08-01", true, new Date(2026, 10, 12))
      ).toBe("PENDIENTE");

      // 1 de Diciembre -> MOROSO
      expect(
        estadoCuentaDeAlumno(alumnoId, pagoTrimestral, "2026-08-01", true, new Date(2026, 11, 1))
      ).toBe("MOROSO");

      // Próximo vencimiento calculado sobre el fin del trimestre -> 10 de Noviembre
      const vencimiento = calcularVencimientoCuota(
        "AL_DIA",
        new Date(2026, 9, 25),
        obtenerMaxPeriodoCubiertoAlumno(pagoTrimestral)
      );
      expect(vencimiento.toLowerCase()).toContain("10 de noviembre");
    });
  });

  describe("Cálculo dinámico de vencimiento de cuota (calcularVencimientoCuota)", () => {
    it("devuelve el día 10 del mes siguiente si el alumno está AL_DIA sin período explícito", () => {
      const refDate = new Date(2026, 8, 5); // 5 de Septiembre 2026
      const vencimiento = calcularVencimientoCuota("AL_DIA", refDate);
      expect(vencimiento.toLowerCase()).toContain("10 de octubre");
    });

    it("devuelve el día 10 del mes en curso si el alumno está PENDIENTE o MOROSO sin período explícito", () => {
      const refDate = new Date(2026, 8, 5); // 5 de Septiembre 2026
      const vencPendiente = calcularVencimientoCuota("PENDIENTE", refDate);
      expect(vencPendiente.toLowerCase()).toContain("10 de septiembre");

      const vencMoroso = calcularVencimientoCuota("MOROSO", refDate);
      expect(vencMoroso.toLowerCase()).toContain("10 de septiembre");
    });

    it("calcula vencimiento exacto en base al último período mensual cubierto", () => {
      // Si pagó agosto (2026-08), incluso estando AL_DIA el 5 de septiembre su vencimiento es 10 de Septiembre
      const vencSept = calcularVencimientoCuota("AL_DIA", new Date(2026, 8, 5), "2026-08");
      expect(vencSept.toLowerCase()).toContain("10 de septiembre");

      // Si pagó septiembre (2026-09), su vencimiento es 10 de Octubre
      const vencOct = calcularVencimientoCuota("AL_DIA", new Date(2026, 8, 5), "2026-09");
      expect(vencOct.toLowerCase()).toContain("10 de octubre");
    });
  });
});
