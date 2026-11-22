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

  it("seña y saldo cobrados en días y por titulares distintos cuentan cada uno en su día, método y titular", () => {
    const pago: Pago = {
      id: "77",
      alumnoId: "a1",
      plan: "Musculación",
      monto: 20000,
      montoAbonado: 20000,
      saldoPendiente: 0,
      fecha: "2026-10-28",
      metodo: "Efectivo",
      estado: "PAGADO",
      registradoPor: "Titular 1",
      movimientos: [
        { tipo: "SENIA", monto: 8000, metodo: "Efectivo", fecha: "2026-10-28", registradoPor: "Titular 1" },
        { tipo: "SALDO", monto: 12000, metodo: "Transferencia", fecha: "2026-10-31", registradoPor: "Titular 2" },
      ],
    };

    const diaSenia = calcularArqueoCajaLocal([pago], "2026-10-28");
    expect(diaSenia.totalRecaudado).toBe(8000);
    expect(diaSenia.totalEfectivo).toBe(8000);
    expect(diaSenia.totalTransferencia).toBe(0);
    expect(diaSenia.porOperador).toEqual([{ operador: "Titular 1", totalRecaudado: 8000, cantidadOperaciones: 1 }]);

    const diaSaldo = calcularArqueoCajaLocal([pago], "2026-10-31");
    expect(diaSaldo.totalRecaudado).toBe(12000);
    expect(diaSaldo.totalEfectivo).toBe(0);
    expect(diaSaldo.totalTransferencia).toBe(12000);
    expect(diaSaldo.cantidadCobros).toBe(1);
    expect(diaSaldo.porOperador).toEqual([{ operador: "Titular 2", totalRecaudado: 12000, cantidadOperaciones: 1 }]);
  });

  it("calcula el arqueo acumulado de todos los meses cuando se omite la fecha", () => {
    const pagos: Pago[] = [
      {
        id: "m1",
        alumnoId: "a1",
        plan: "Libre",
        monto: 30000,
        montoAbonado: 30000,
        fecha: "2026-09-10",
        periodoMes: "2026-09",
        metodo: "Efectivo",
        estado: "PAGADO",
        registradoPor: "Bruno",
      },
      {
        id: "m2",
        alumnoId: "a2",
        plan: "Libre",
        monto: 32000,
        montoAbonado: 32000,
        fecha: "2026-10-05",
        periodoMes: "2026-10",
        metodo: "Transferencia",
        estado: "PAGADO",
        registradoPor: "Lucas",
      },
      {
        id: "m3",
        alumnoId: "a3",
        plan: "3 días",
        monto: 25000,
        montoAbonado: 10000,
        fecha: "2026-11-15",
        periodoMes: "2026-11",
        metodo: "Tarjeta",
        estado: "PARCIAL",
        registradoPor: "Bruno",
      },
      {
        id: "m4",
        alumnoId: "a4",
        plan: "Libre",
        monto: 40000,
        montoAbonado: 40000,
        fecha: "2026-10-20",
        periodoMes: "2026-10",
        metodo: "Efectivo",
        estado: "ANULADO",
        registradoPor: "Bruno",
      },
    ];

    const acumulado = calcularArqueoCajaLocal(pagos);
    expect(acumulado.totalRecaudado).toBe(72000);
    expect(acumulado.totalEfectivo).toBe(30000);
    expect(acumulado.totalTransferencia).toBe(32000);
    expect(acumulado.totalTarjeta).toBe(10000);
    expect(acumulado.cantidadCobros).toBe(3);
    expect(acumulado.cantidadParciales).toBe(1);
    expect(acumulado.saldoPendienteParciales).toBe(15000);
    expect(acumulado.cantidadAnulados).toBe(1);
    expect(acumulado.montoAnulado).toBe(40000);
    expect(acumulado.porOperador).toEqual([
      { operador: "Bruno", totalRecaudado: 40000, cantidadOperaciones: 2 },
      { operador: "Lucas", totalRecaudado: 32000, cantidadOperaciones: 1 },
    ]);
  });
});
