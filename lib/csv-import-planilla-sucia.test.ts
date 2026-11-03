import { describe, expect, it } from "vitest";
import { decodificarArchivoCsv, parsearCsvPadronAlumnos } from "./csv-import";

// Planillas "sucias" como las que de verdad exporta un gimnasio desde Excel o Google Sheets.
// Cada caso es un error que, sin este arreglo, entraba en silencio al sistema.

describe("Importador Día Cero — planilla sucia", () => {
  it("encuentra el encabezado aunque arriba haya filas de título", () => {
    const csv = [
      "PLANILLA DE SOCIOS ATLAS 2026;;;",
      ";;;",
      "Nombre;DNI;Plan;Ultimo_Mes_Pago",
      "Camila Sosa;42111222;Pase Libre;2026-10",
    ].join("\n");
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.filasValidas).toHaveLength(1);
    expect(res.filasValidas[0].dni).toBe("42111222");
  });

  it("una celda entre comillas con salto de línea (Alt+Enter en Excel) no parte la fila", () => {
    const csv = 'Nombre;DNI;Celular\n"Camila\nSosa";42111222;1144556677\nNico Gómez;39888777;2614556677';
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.erroresFila).toHaveLength(0);
    expect(res.filasValidas.map((f) => f.dni)).toEqual(["42111222", "39888777"]);
    expect(res.filasValidas[0].nombre).toBe("Camila Sosa");
  });

  it("entiende montos con coma de miles (Google Sheets) y con decimales", () => {
    const csv = 'Nombre,DNI,Monto\nAna Paz,40111222,"28,500"\nBeto Luna,40222333,30000.00';
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.filasValidas.map((f) => f.montoUltimoPago)).toEqual([28500, 30000]);
  });

  it("DNI con '.0' al final se limpia; DNI en notación científica se rechaza en vez de inventar dígitos", () => {
    const csv = "Nombre;DNI\nAna Paz;40111222.0\nBeto Luna;4,02E+07";
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.filasValidas).toHaveLength(1);
    expect(res.filasValidas[0].dni).toBe("40111222");
    expect(res.erroresFila).toHaveLength(1);
    expect(res.erroresFila[0]).toContain("notación científica");
  });

  it("entiende meses escritos como los formatea Excel (oct-26, octubre 2026, 10/26)", () => {
    const csv = [
      "Nombre;DNI;Ultimo_Mes_Pago",
      "Ana Paz;40111222;oct-26",
      "Beto Luna;40222333;Octubre 2026",
      "Caro Ríos;40333444;10/26",
      "Dani Sol;40444555;sept. 2026",
    ].join("\n");
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.filasValidas.map((f) => f.ultimoPeriodoPago)).toEqual([
      "2026-10",
      "2026-10",
      "2026-10",
      "2026-09",
    ]);
  });

  it("un mes que no se entiende se avisa y el socio entra igual, sin cuota cargada", () => {
    const csv = "Nombre;DNI;Ultimo_Mes_Pago\nAna Paz;40111222;el mes pasado";
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.filasValidas).toHaveLength(1);
    expect(res.filasValidas[0].ultimoPeriodoPago).toBeUndefined();
    expect(res.erroresFila[0]).toContain("el mes pasado");
  });

  it("avisa si un DNI aparece dos veces en la planilla", () => {
    const csv = "Nombre;DNI\nAna Paz;40111222\nAna María Paz;40.111.222";
    const res = parsearCsvPadronAlumnos(csv);
    expect(res.erroresFila.some((e) => e.includes("repetido"))).toBe(true);
  });

  it("lee bien un CSV guardado por Excel en español (Windows-1252), sin romper los acentos", () => {
    // "Nombre;DNI\nNicolás Gómez;39888777" en Windows-1252: á = 0xE1, ó = 0xF3
    const texto = "Nombre;DNI\nNicolás Gómez;39888777";
    const bytes = Uint8Array.from(texto, (c) => c.charCodeAt(0));
    const res = decodificarArchivoCsv(bytes);
    expect(res.ok).toBe(true);
    if (res.ok) expect(parsearCsvPadronAlumnos(res.texto).filasValidas[0].nombre).toBe("Nicolás Gómez");
  });

  it("sigue leyendo bien un CSV en UTF-8 (con o sin BOM)", () => {
    const bytes = new TextEncoder().encode("﻿Nombre;DNI\nNicolás Gómez;39888777");
    const res = decodificarArchivoCsv(bytes);
    expect(res.ok).toBe(true);
    if (res.ok) expect(parsearCsvPadronAlumnos(res.texto).filasValidas[0].nombre).toBe("Nicolás Gómez");
  });

  it("si suben el .xlsx en vez del CSV, explica cómo guardarlo como CSV", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const res = decodificarArchivoCsv(bytes);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("CSV");
  });
});
