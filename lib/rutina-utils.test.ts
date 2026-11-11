import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buscarVideoParaEjercicio, formatPrevia } from "./rutina-utils";
import { VideoTecnica, RegistroSerie, Rutina } from "./types";

const VIDEOS_TEST: VideoTecnica[] = [
  {
    id: "v1",
    titulo: "Press de Banca con Mancuernas",
    grupoMuscular: "Pecho",
    duracion: "01:45",
    nivel: "Técnica estricta",
    videoUrl: "https://www.youtube.com/embed/VmB1G1K7v94",
    consejosClave: ["Junta tus omóplatos contra el banco"],
  },
  {
    id: "v2",
    titulo: "Sentadilla Libre Profunda y Biomecánica",
    grupoMuscular: "Piernas",
    duracion: "02:10",
    nivel: "Biomecánica",
    videoUrl: "https://www.youtube.com/embed/gcNh17Ckjgg",
  },
  {
    id: "v3",
    titulo: "Remo con Barra Agarre Prono",
    grupoMuscular: "Espalda",
    duracion: "01:30",
    nivel: "Activación dorsal",
    videoUrl: "https://www.youtube.com/embed/FWJR5Ve8gkQ",
  },
];

describe("rutina-utils", () => {
  describe("buscarVideoParaEjercicio", () => {
    it("encuentra video por palabra clave del ejercicio", () => {
      const video = buscarVideoParaEjercicio("Press de Banca Plano", VIDEOS_TEST);
      expect(video).toBeDefined();
      expect(video?.id).toBe("v1");
      expect(video?.titulo).toBe("Press de Banca con Mancuernas");
    });

    it("encuentra video de sentadilla correctamente", () => {
      const video = buscarVideoParaEjercicio("Sentadilla Libre con Barra", VIDEOS_TEST);
      expect(video).toBeDefined();
      expect(video?.id).toBe("v2");
    });

    it("devuelve undefined cuando no hay video para el ejercicio", () => {
      const video = buscarVideoParaEjercicio("Vuelos frontales polea baja", VIDEOS_TEST);
      expect(video).toBeUndefined();
    });

    it("maneja strings vacíos y listas vacías de videos", () => {
      expect(buscarVideoParaEjercicio("", VIDEOS_TEST)).toBeUndefined();
      expect(buscarVideoParaEjercicio("Press de banca", [])).toBeUndefined();
    });
  });

  describe("formatPrevia", () => {
    it("formatea correctamente peso y repeticiones de serie previa", () => {
      const serie: RegistroSerie = { serieNumero: 1, kg: 85, reps: 10, completada: true };
      expect(formatPrevia(serie)).toBe("85 kg × 10");
    });

    it("devuelve guión emdash si no hay serie previa", () => {
      expect(formatPrevia(undefined)).toBe("—");
    });

    it("formatea con peso 0 correctamente", () => {
      const serie: RegistroSerie = { serieNumero: 1, kg: 0, reps: 15, completada: true };
      expect(formatPrevia(serie)).toBe("0 kg × 15");
    });
  });

  describe("borradores de entrenamiento", () => {
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      vi.stubGlobal("localStorage", {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        }),
        key: vi.fn((i: number) => Object.keys(mockStorage)[i] ?? null),
        get length() {
          return Object.keys(mockStorage).length;
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("genera la clave única de borrador esperada", async () => {
      const { getClaveBorradorEntrenamiento } = await import("./rutina-utils");
      expect(getClaveBorradorEntrenamiento("a1", "r-1", "2026-10-06")).toBe(
        "atlas_borrador_a1_r-1_2026-10-06"
      );
    });

    it("guarda y recupera un borrador activo", async () => {
      const { obtenerBorradorEntrenamiento, getClaveBorradorEntrenamiento } = await import("./rutina-utils");
      const key = getClaveBorradorEntrenamiento("a1", "r-1", "2026-10-06");
      localStorage.setItem(
        key,
        JSON.stringify({
          diaActivo: 1,
          seriesPorDia: {
            "d-1": {
              "ej-1": [{ serieNumero: 1, kg: 50, reps: 12, completada: true }],
            },
          },
        })
      );

      const borrador = obtenerBorradorEntrenamiento("a1", "r-1", "2026-10-06");
      expect(borrador).not.toBeNull();
      expect(borrador?.diaActivo).toBe(1);
      expect(borrador?.seriesPorDia["d-1"]["ej-1"][0].completada).toBe(true);
    });

    it("limpia borradores viejos de días anteriores preservando los de hoy", async () => {
      const { limpiarBorradoresObsoletos } = await import("./rutina-utils");
      localStorage.setItem("atlas_borrador_a1_r-1_2026-10-05", JSON.stringify({ seriesPorDia: {} }));
      localStorage.setItem("atlas_borrador_a1_r-1_2026-10-06", JSON.stringify({ seriesPorDia: {} }));
      localStorage.setItem("otra_config", "persistente");

      limpiarBorradoresObsoletos("2026-10-06");

      expect(localStorage.getItem("atlas_borrador_a1_r-1_2026-10-05")).toBeNull();
      expect(localStorage.getItem("atlas_borrador_a1_r-1_2026-10-06")).not.toBeNull();
      expect(localStorage.getItem("otra_config")).toBe("persistente");
    });
  });

  describe("detección de advertencias al asignar rutinas", () => {
    const rutinasMock: Rutina[] = [
      { id: "r1", nombre: "Hipertrofia 3 Días", objetivo: "Hipertrofia", esGenerica: true, dias: [] },
      { id: "r2", nombre: "Fuerza 4 Días", objetivo: "Fuerza", esGenerica: true, dias: [] },
      { id: "r3", nombre: "Adaptación Básica", objetivo: "Adaptación", esGenerica: true, dias: [] },
    ];

    const alumnosMock = [
      { id: "a1", nombre: "Carlos Legado", rutinaId: "r1" },
      { id: "a2", nombre: "Lucía Gómez", rutinaId: undefined },
      { id: "a3", nombre: "Marcos Rojo", rutinaId: "r2" },
    ];

    it("detecta alumnos que ya poseen otra rutina activa distinta", async () => {
      const { detectarConflictosAsignacionRutina } = await import("./rutina-utils");

      // Asignar r3 a a1 (tiene r1), a2 (no tiene), y a3 (tiene r2)
      const conflictos = detectarConflictosAsignacionRutina(
        ["a1", "a2", "a3"],
        rutinasMock,
        alumnosMock,
        "r3"
      );

      expect(conflictos.length).toBe(2);
      expect(conflictos[0].alumnoNombre).toBe("Carlos Legado");
      expect(conflictos[0].rutinaAnteriorNombre).toBe("Hipertrofia 3 Días");
      expect(conflictos[1].alumnoNombre).toBe("Marcos Rojo");
      expect(conflictos[1].rutinaAnteriorNombre).toBe("Fuerza 4 Días");
    });

    it("no genera conflicto si el alumno no tenía rutina o ya tenía la misma rutina asignada", async () => {
      const { detectarConflictosAsignacionRutina } = await import("./rutina-utils");

      const conflictos = detectarConflictosAsignacionRutina(
        ["a1", "a2"],
        rutinasMock,
        alumnosMock,
        "r1" // a1 ya tiene r1, a2 no tiene ninguna
      );

      expect(conflictos.length).toBe(0);
    });
  });
});
