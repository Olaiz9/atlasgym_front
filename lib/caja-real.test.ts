import { describe, expect, it } from "vitest";
import {
  Pago,
  calcularArqueoCajaLocal,
  estadoCuentaDeAlumno,
  obtenerMontoRecaudadoPago,
  obtenerSaldoPendientePago,
  verificarSolapamientoPeriodoPago,
} from "./types";

describe("Etapa 5 — Caja Real Argentina (Señas Parciales, Anulación Auditada y Arqueo)", () => {
  it("detecta solapamiento de período tanto en mes exacto como en packs multi-mes e ignora ANULADOS", () => {
    const pagos: Pago[] = [
      {
        id: "p1",
        alumnoId: "a1",
        plan: "Trimestral",
        monto: 75000,
        fecha: "2026-08-05",
        periodoMes: "2026-08",
        cantidadMeses: 3, // cubre 2026-08, 2026-09 y 2026-10
        metodo: "Efectivo",
        estado: "PAGADO",
      },
      {
        id: "p2",
        alumnoId: "a1",
        plan: "Mensual",
        monto: 28000,
        fecha: "2026-11-02",
        periodoMes: "2026-11",
        cantidadMeses: 1,
        metodo: "Efectivo",
        estado: "ANULADO",
      },
    ];

    expect(verificarSolapamientoPeriodoPago("a1", "2026-09", 1, pagos)?.id).toBe("p1");
    expect(verificarSolapamientoPeriodoPago("a1", "2026-10", 2, pagos)?.id).toBe("p1");
    // 2026-11 tenía un comprobante ANULADO -> permite volver a cobrarlo
    expect(verificarSolapamientoPeriodoPago("a1", "2026-11", 1, pagos)).toBeUndefined();
  });

  it("trata una seña PARCIAL como PENDIENTE hasta completarse e ignora pagos ANULADOS en estadoCuentaDeAlumno", () => {
    const fechaOct = new Date(2026, 9, 15); // 15/10/2026
    const pagosParcial: Pago[] = [
      {
        id: "p-senia",
        alumnoId: "a1",
        plan: "Musculación",
        monto: 28000,
        montoAbonado: 10000,
        fecha: "2026-10-04",
        periodoMes: "2026-10",
        metodo: "Efectivo",
        estado: "PARCIAL",
      },
    ];

    expect(obtenerMontoRecaudadoPago(pagosParcial[0])).toBe(10000);
    expect(obtenerSaldoPendientePago(pagosParcial[0])).toBe(18000);
    expect(estadoCuentaDeAlumno("a1", pagosParcial, "2026-10-01", true, fechaOct)).toBe("PENDIENTE");

    // Si un socio recién dado de alta tiene únicamente un cobro ANULADO, vuelve a PENDIENTE (no cae en INACTIVO)
    const pagosSoloAnulado: Pago[] = [
      {
        ...pagosParcial[0],
        estado: "ANULADO",
      },
    ];
    expect(estadoCuentaDeAlumno("a1", pagosSoloAnulado, "2026-10-14", true, fechaOct)).toBe(
      "PENDIENTE"
    );
  });

  it("calcula el Arqueo de Caja del Día separando efectivo, transferencias, señas, anulados y operadores", () => {
    const pagos: Pago[] = [
      {
        id: "1",
        alumnoId: "a1",
        plan: "Libre",
        monto: 28000,
        montoAbonado: 28000,
        fecha: "2026-10-31",
        metodo: "Efectivo",
        estado: "PAGADO",
        registradoPor: "Bruno (Dueño)",
      },
      {
        id: "2",
        alumnoId: "a2",
        plan: "3 días",
        monto: 25000,
        montoAbonado: 10000,
        fecha: "2026-10-31",
        metodo: "Transferencia",
        estado: "PARCIAL",
        registradoPor: "Matías (Dueño)",
      },
      {
        id: "3",
        alumnoId: "a3",
        plan: "Libre",
        monto: 50000,
        montoAbonado: 50000,
        fecha: "2026-10-31",
        metodo: "Efectivo",
        estado: "ANULADO",
        registradoPor: "Bruno (Dueño)",
        anuladoPor: "Bruno (Dueño)",
        fechaAnulacion: "2026-10-31T14:20:00",
        motivoAnulacion: "Importe mal tipeado",
      },
    ];

    const arqueo = calcularArqueoCajaLocal(pagos, "2026-10-31");
    expect(arqueo.totalRecaudado).toBe(38000);
    expect(arqueo.totalEfectivo).toBe(28000);
    expect(arqueo.totalTransferencia).toBe(10000);
    expect(arqueo.totalTarjeta).toBe(0);
    expect(arqueo.cantidadCobros).toBe(2);
    expect(arqueo.cantidadParciales).toBe(1);
    expect(arqueo.saldoPendienteParciales).toBe(15000);
    expect(arqueo.cantidadAnulados).toBe(1);
    expect(arqueo.montoAnulado).toBe(50000);
    expect(arqueo.porOperador).toEqual([
      { operador: "Bruno (Dueño)", totalRecaudado: 28000, cantidadOperaciones: 1 },
      { operador: "Matías (Dueño)", totalRecaudado: 10000, cantidadOperaciones: 1 },
    ]);
  });
});
