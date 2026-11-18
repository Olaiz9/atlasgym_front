import { describe, expect, it } from "vitest";
import { mesesAdeudados, Pago, saldosDeSeniaPorAlumno } from "./types";

const pago = (cambios: Partial<Pago>) =>
  ({
    id: "p1",
    alumnoId: "a1",
    plan: "Libre",
    monto: 20000,
    fecha: "2026-09-05",
    metodo: "Efectivo",
    estado: "PAGADO",
    periodoMes: "2026-09",
    ...cambios,
  }) as Pago;

describe("mesesAdeudados", () => {
  const dia20 = new Date(2026, 10, 20);

  it("lista desde el mes siguiente al último pago hasta el actual", () => {
    expect(mesesAdeudados("a1", [pago({})], "2026-01-01", dia20)).toEqual(["2026-10", "2026-11"]);
  });

  it("no cuenta el mes en curso hasta pasado el día 10", () => {
    expect(mesesAdeudados("a1", [pago({})], "2026-01-01", new Date(2026, 10, 10))).toEqual(["2026-10"]);
  });

  it("respeta pagos de varios meses y señas como meses cubiertos", () => {
    expect(mesesAdeudados("a1", [pago({ cantidadMeses: 2 })], undefined, dia20)).toEqual(["2026-11"]);
    expect(mesesAdeudados("a1", [pago({ estado: "PARCIAL", periodoMes: "2026-11" })], undefined, dia20)).toEqual([]);
  });

  it("ignora anulados y pagos de otros socios", () => {
    const pagos = [pago({ estado: "ANULADO", periodoMes: "2026-11" }), pago({ alumnoId: "a2", periodoMes: "2026-11" })];
    expect(mesesAdeudados("a1", pagos, "2026-10-15", new Date(2026, 10, 5))).toEqual(["2026-10", "2026-11"]);
  });
});

describe("saldosDeSeniaPorAlumno", () => {
  it("suma solo lo que falta de las señas abiertas", () => {
    const saldos = saldosDeSeniaPorAlumno([pago({ estado: "PARCIAL", montoAbonado: 5000 }), pago({ id: "p2" })]);
    expect(saldos.get("a1")).toBe(15000);
  });
});
