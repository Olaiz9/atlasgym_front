import { describe, expect, it } from "vitest";
import { ejercicioDeSesionPrevia, moverEnLista } from "./rutina-utils";
import { SesionEjercicio } from "./types";

describe("moverEnLista", () => {
  it("sube, baja y no se sale de los bordes", () => {
    expect(moverEnLista(["a", "b", "c"], 1, 0)).toEqual(["b", "a", "c"]);
    expect(moverEnLista(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    const lista = ["a", "b"];
    expect(moverEnLista(lista, 0, -1)).toBe(lista);
    expect(moverEnLista(lista, 1, 2)).toBe(lista);
  });
});

describe("ejercicioDeSesionPrevia", () => {
  const sesion: SesionEjercicio[] = [
    { ejercicioId: "10", nombre: "Press Banca", series: [{ serieNumero: 1, kg: 60, reps: 10, completada: true }] },
    { ejercicioId: "11", nombre: "Aperturas", series: [{ serieNumero: 1, kg: 12, reps: 12, completada: true }] },
  ];

  it("usa el id cuando el ejercicio sigue siendo el mismo", () => {
    expect(ejercicioDeSesionPrevia(sesion, { id: "10", nombre: "press banca" })?.series[0].kg).toBe(60);
  });

  it("si el profe reordenó y la fila 10 ahora es Aperturas, trae los kilos de Aperturas", () => {
    expect(ejercicioDeSesionPrevia(sesion, { id: "10", nombre: "Aperturas" })?.series[0].kg).toBe(12);
  });

  it("sesiones viejas sin nombre siguen usando el id; ejercicio nuevo no trae nada", () => {
    expect(ejercicioDeSesionPrevia([{ ejercicioId: "10", series: [] }], { id: "10", nombre: "X" })?.ejercicioId).toBe("10");
    expect(ejercicioDeSesionPrevia(sesion, { id: "99", nombre: "Remo" })).toBeUndefined();
  });
});
