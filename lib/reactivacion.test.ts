import { describe, expect, it } from "vitest";
import { estadoCuentaDeAlumno, Pago } from "./types";

// Mismos casos que CuotasEstadoYMultiMesTest del back.
describe("Socio reactivado después de abandonar", () => {
  const pagoAbril: Pago = {
    id: "p1", alumnoId: "a1", plan: "Libre", monto: 28000, fecha: "2026-04-05",
    periodoMes: "2026-04", metodo: "Efectivo", estado: "PAGADO",
  };
  const hoy = new Date(2026, 10, 22);

  it("con pagos viejos pasa de INACTIVO a MOROSO y vuelve a INACTIVO a los 60 días sin pagar", () => {
    expect(estadoCuentaDeAlumno("a1", [pagoAbril], "2026-03-01", true, hoy)).toBe("INACTIVO");
    expect(estadoCuentaDeAlumno("a1", [pagoAbril], "2026-03-01", true, hoy, "2026-11-20")).toBe("MOROSO");
    expect(estadoCuentaDeAlumno("a1", [pagoAbril], "2026-03-01", true, new Date(2027, 0, 20), "2026-11-20")).toBe("INACTIVO");
  });

  it("sin pagos cuenta como alta nueva", () => {
    expect(estadoCuentaDeAlumno("a1", [], "2026-01-10", true, hoy)).toBe("INACTIVO");
    expect(estadoCuentaDeAlumno("a1", [], "2026-01-10", true, hoy, "2026-11-20")).toBe("PENDIENTE");
  });
});
