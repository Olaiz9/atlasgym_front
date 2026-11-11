import { describe, it, expect } from "vitest";
import { mapPagoDtoToFront } from "./api-mappers";
import { alumnoDePagoEstaDeBaja, nombreHistoricoDelPago } from "./pago-historial";
import { ejecutarBajaAlumno } from "./plan-utils";
import type { Alumno } from "./types";

const dto = {
  id: 7, alumnoId: 2, alumnoNombreHistorico: "Nombre al pagar",
  alumnoActivo: false, planNombre: "Mensual", monto: 20000,
  fecha: "2026-06-05", metodo: "EFECTIVO", estado: "PAGADO", periodoMes: "2026-06",
};
const alumno: Alumno = {
  id: "2", nombre: "Nombre actualizado", activo: false, plan: "Mensual", fechaAlta: "2026-06-01",
};

describe("Pagos historicos de alumnos dados de baja", () => {
  it("conserva el nombre recibido del backend y detecta baja con o sin ficha cargada", () => {
    const pago = mapPagoDtoToFront(dto);
    expect(nombreHistoricoDelPago(pago, alumno)).toBe("Nombre al pagar");
    expect(alumnoDePagoEstaDeBaja(pago)).toBe(true);
    expect(alumnoDePagoEstaDeBaja(pago, alumno)).toBe(true);
    expect(pago.monto).toBe(20000);
    expect(pago.estado).toBe("PAGADO");
    expect(pago.periodoMes).toBe("2026-06");
  });
  it("no considera baja la ausencia de una ficha ni un indicador desconocido", () => {
    const pago = mapPagoDtoToFront({ ...dto, alumnoActivo: undefined });
    expect(alumnoDePagoEstaDeBaja(pago)).toBe(false);
    expect(alumnoDePagoEstaDeBaja({ ...pago, alumnoActivo: null })).toBe(false);
    expect(alumnoDePagoEstaDeBaja({ ...pago, alumnoActivo: true })).toBe(false);
  });
  it("usa la ficha para versiones anteriores del backend y refleja reactivaciones", () => {
    const pago = mapPagoDtoToFront({ ...dto, alumnoActivo: undefined });
    expect(alumnoDePagoEstaDeBaja(pago, alumno)).toBe(true);
    expect(alumnoDePagoEstaDeBaja(pago, { ...alumno, activo: true })).toBe(false);
  });
  it("marca la baja local sin perder pagos ni cambiar su nombre historico", () => {
    const pago = mapPagoDtoToFront({ ...dto, alumnoActivo: true });
    const resultado = ejecutarBajaAlumno("2", [{ ...alumno, activo: true }], [pago], []);
    expect(resultado.pagos).toHaveLength(1);
    expect(resultado.pagos[0]).toEqual({ ...pago, alumnoActivo: false });
    expect(alumnoDePagoEstaDeBaja(resultado.pagos[0])).toBe(true);
  });
  it("admite el nombre enviado por versiones antiguas de la API", () => {
    const pago = mapPagoDtoToFront({ ...dto, alumnoNombreHistorico: undefined, alumnoNombre: "Nombre anterior" });
    expect(nombreHistoricoDelPago(pago)).toBe("Nombre anterior");
  });
});