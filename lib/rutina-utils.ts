// lib/rutina-utils.ts
import { RegistroSerie, VideoTecnica } from "./types";

/**
 * Busca un video de técnica en el catálogo cuyo título coincida
 * con alguna de las palabras clave del ejercicio (palabras > 3 letras).
 */
export function buscarVideoParaEjercicio(
  nombreEjercicio: string,
  videos: VideoTecnica[]
): VideoTecnica | undefined {
  if (!nombreEjercicio || !videos || videos.length === 0) return undefined;

  const palabras = nombreEjercicio
    .toLowerCase()
    .split(/[\s,\-–—/]+/)
    .filter((w) => w.length > 3);

  return videos.find((v) => {
    const tituloLower = v.titulo.toLowerCase();
    return palabras.some((palabra) => tituloLower.includes(palabra));
  });
}

/**
 * Formatea el registro de una serie previa (ej: "80 kg × 10").
 * Devuelve "—" si no existe registro previo.
 */
export function formatPrevia(serie: RegistroSerie | undefined): string {
  if (!serie || typeof serie.kg !== "number" || typeof serie.reps !== "number") {
    return "—";
  }
  return `${serie.kg} kg × ${serie.reps}`;
}
