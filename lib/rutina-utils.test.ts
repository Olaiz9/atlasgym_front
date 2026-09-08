import { describe, it, expect } from "vitest";
import { buscarVideoParaEjercicio, formatPrevia } from "./rutina-utils";
import { VideoTecnica, RegistroSerie } from "./types";

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
});
