import { describe, it, expect } from "vitest";
import { estadoCuentaDeAlumno, Pago, EstadoPago } from "./types";
import { calcularVencimientoCuota } from "./date-utils";

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
          fecha: new Date().toISOString().slice(0, 10),
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
          fecha: new Date().toISOString().slice(0, 10),
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
          fecha: new Date().toISOString().slice(0, 10),
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
          fecha: new Date().toISOString().slice(0, 10),
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
  });
});
