import { describe, expect, it } from "vitest";
import { parsearCsvPadronAlumnos, PLANTILLA_CSV_DIA_CERO } from "./csv-import";
import {
  construirUrlWaMe,
  mensajeCredencialesBienvenidaWhatsapp,
  mensajeRecordatorioCuotaWhatsapp,
  normalizarCelularWhatsappAR,
} from "./whatsapp-utils";

describe("Etapa 6 — Kit de Día Cero (Importador CSV Masivo y WhatsApp 1-Clic)", () => {
  it("parsea correctamente la plantilla CSV separada por punto y coma (Excel en español)", () => {
    const res = parsearCsvPadronAlumnos(PLANTILLA_CSV_DIA_CERO);
    expect(res.delimitadorDetectado).toBe(";");
    expect(res.erroresFila).toHaveLength(0);
    expect(res.filasValidas).toHaveLength(3);
    expect(res.filasValidas[0]).toMatchObject({
      nombre: "Camila Sosa",
      dni: "42111222",
      celular: "1144556677",
      planNombre: "Pase Libre",
      ultimoPeriodoPago: "2026-10",
      montoUltimoPago: 30000,
    });
  });

  it("une Nombre + Apellido separados, limpia puntos del DNI, convierte MM/YYYY a YYYY-MM y reporta filas inválidas", () => {
    const csvGoogleSheets = [
      "Nombre,Apellido,Documento,Whatsapp,Membresía,Ultimo Pago,Importe",
      '"Juan Martín",Pérez,38.456.789,011 15-4455-6677,Musculación,09/2026,"$28.500,00"',
      "Socio Sin Dni,Gómez,12,2614001122,Libre,10/2026,25000",
    ].join("\r\n");

    const res = parsearCsvPadronAlumnos(csvGoogleSheets);
    expect(res.delimitadorDetectado).toBe(",");
    expect(res.filasValidas).toHaveLength(1);
    expect(res.filasValidas[0]).toEqual({
      nombre: "Juan Martín Pérez",
      dni: "38456789",
      celular: "011 15-4455-6677",
      email: undefined,
      planNombre: "Musculación",
      ultimoPeriodoPago: "2026-09",
      montoUltimoPago: 28500,
      metodoPago: undefined,
    });
    expect(res.erroresFila).toHaveLength(1);
    expect(res.erroresFila[0]).toContain("DNI inválido");
  });

  it("normaliza teléfonos celulares argentinos (con 0, con 15, +54 9 o 10 dígitos) para enlaces wa.me", () => {
    expect(normalizarCelularWhatsappAR("11 4455-6677")).toBe("5491144556677");
    expect(normalizarCelularWhatsappAR("011 15-4455-6677")).toBe("5491144556677");
    expect(normalizarCelularWhatsappAR("0261 15 4123456")).toBe("5492614123456");
    expect(normalizarCelularWhatsappAR("+54 9 351 612-3456")).toBe("5493516123456");
    expect(normalizarCelularWhatsappAR("542614123456")).toBe("5492614123456");

    const msg = mensajeRecordatorioCuotaWhatsapp({
      nombre: "Camila Sosa",
      plan: "Pase Libre",
      estadoPago: "PARCIAL",
      saldoPendiente: 15000,
      periodoMes: "2026-10",
    });
    expect(msg).toContain("Camila");
    expect(msg).toContain("15.000");

    const link = construirUrlWaMe("011 15-4455-6677", msg);
    expect(link.startsWith("https://wa.me/5491144556677?text=")).toBe(true);

    const bienvenida = mensajeCredencialesBienvenidaWhatsapp({
      nombre: "Camila Sosa",
      usuario: "camila222",
      claveInicial: "42111222",
    });
    expect(bienvenida).toContain("camila222");
    expect(bienvenida).toContain("42111222");
  });
});
