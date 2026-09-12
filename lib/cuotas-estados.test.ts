import { describe, it, expect } from "vitest";
import { estadoCuentaDeAlumno, Pago, EstadoPago } from "./types";
import { calcularVencimientoCuota, fechaLocalHoy } from "./date-utils";

describe("Fase 4: Cuotas y Estados de Negocio (lib/cuotas-estados.test.ts)", () => {
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

      // El socio fue dado de baja administrativamente (socioActivo = false)
      const estado = estadoCuentaDeAlumno(alumnoId, pagosRecientes, "2026-01-01", false);
      expect(estado).toBe("INACTIVO");
    });

    it("clasifica como MOROSO a un socio activo si tiene al menos una cuota vencida", () => {
      const pagosConVencido: Pago[] = [
        {
          id: "p1",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: "2026-08-05",
          metodo: "Efectivo",
          estado: "VENCIDO",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosConVencido, "2026-01-01", true);
      expect(estado).toBe("MOROSO");
    });

    it("clasifica como PENDIENTE si tiene cuotas en proceso de pago sin ninguna vencida", () => {
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

    it("clasifica como AL_DIA si todas las cuotas recientes están pagadas", () => {
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

      // Simula actualizarEstadoPago en store
      pagos = pagos.map((p) => (p.id === "p-vencido" ? { ...p, estado: "PAGADO" as EstadoPago } : p));

      expect(estadoCuentaDeAlumno(alumnoId, pagos, "2026-01-01", true)).toBe("AL_DIA");
    });

    it("clasifica como INACTIVO por abandono si pasaron más de 60 días sin pagos", () => {
      const fechaVieja = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const pagosViejos: Pago[] = [
        {
          id: "p-viejo",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: fechaVieja,
          metodo: "Efectivo",
          estado: "PAGADO",
        },
      ];

      const estado = estadoCuentaDeAlumno(alumnoId, pagosViejos, "2025-01-01", true);
      expect(estado).toBe("INACTIVO");
    });
    it("clasifica como MOROSO si pagó agosto pero al 11 de septiembre aún no pagó septiembre", () => {
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

      // Al 11 de septiembre ya venció el plazo del día 10 para pagar septiembre
      const fechaSept11 = new Date(2026, 8, 11);
      const estado = estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, fechaSept11);
      expect(estado).toBe("MOROSO");
    });

    it("clasifica como PENDIENTE si pagó agosto y al 5 de septiembre está en período de gracia", () => {
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

      // Al 5 de septiembre aún no venció la cuota (vence el 10)
      const fechaSept5 = new Date(2026, 8, 5);
      const estado = estadoCuentaDeAlumno(alumnoId, pagosAgosto, "2026-01-01", true, fechaSept5);
      expect(estado).toBe("PENDIENTE");
    });

    it("clasifica como AL_DIA si tiene la cuota del mes pagada", () => {
      const pagosSeptiembre: Pago[] = [
        {
          id: "p-sep",
          alumnoId,
          plan: "Musculación",
          monto: 28000,
          fecha: "2026-09-02",
          periodoMes: "2026-09",
          metodo: "Transferencia",
          estado: "PAGADO",
        },
      ];

      const fechaSept15 = new Date(2026, 8, 15);
      const estado = estadoCuentaDeAlumno(alumnoId, pagosSeptiembre, "2026-01-01", true, fechaSept15);
      expect(estado).toBe("AL_DIA");
    });
  });

  describe("Cálculo dinámico de vencimiento de cuota (calcularVencimientoCuota)", () => {
    it("devuelve el día 10 del mes siguiente si el alumno está AL_DIA", () => {
      const refDate = new Date(2026, 8, 5); // 5 de Septiembre 2026
      const vencimiento = calcularVencimientoCuota("AL_DIA", refDate);
      expect(vencimiento.toLowerCase()).toContain("10 de octubre");
    });

    it("devuelve el día 10 del mes en curso si el alumno está PENDIENTE o MOROSO", () => {
      const refDate = new Date(2026, 8, 5); // 5 de Septiembre 2026
      const vencPendiente = calcularVencimientoCuota("PENDIENTE", refDate);
      expect(vencPendiente.toLowerCase()).toContain("10 de septiembre");

      const vencMoroso = calcularVencimientoCuota("MOROSO", refDate);
      expect(vencMoroso.toLowerCase()).toContain("10 de septiembre");
    });

    it("calcula vencimiento exacto en base al período mensual cubierto", () => {
      // Si pagó agosto (2026-08), su vencimiento es 10 de Septiembre
      const vencSept = calcularVencimientoCuota("PENDIENTE", new Date(2026, 8, 5), "2026-08");
      expect(vencSept.toLowerCase()).toContain("10 de septiembre");

      // Si pagó septiembre (2026-09), su vencimiento es 10 de Octubre
      const vencOct = calcularVencimientoCuota("AL_DIA", new Date(2026, 8, 5), "2026-09");
      expect(vencOct.toLowerCase()).toContain("10 de octubre");
    });
  });
});
