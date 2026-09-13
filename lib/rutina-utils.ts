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

  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const nombreNorm = normalizar(nombreEjercicio).trim();

  // 1. Coincidencia exacta
  const exacta = videos.find((v) => normalizar(v.titulo) === nombreNorm);
  if (exacta) return exacta;

  const palabrasBuscadas = nombreNorm
    .split(/[\s,\-–—/]+/)
    .filter((w) => w.length > 2);

  if (palabrasBuscadas.length === 0) return undefined;

  // Palabras genéricas de equipamiento que suman menor puntaje
  const equipamiento = new Set(['barra', 'mancuerna', 'mancuernas', 'polea', 'maquina', 'libre', 'plano', 'inclinado']);

  let mejorVideo: VideoTecnica | undefined = undefined;
  let mejorPuntaje = 0;

  for (const v of videos) {
    const tituloNorm = normalizar(v.titulo);
    const palabrasTitulo = tituloNorm.split(/[\s,\-–—/]+/).filter((w) => w.length > 2);

    let puntaje = 0;
    for (const p of palabrasBuscadas) {
      if (palabrasTitulo.includes(p)) {
        puntaje += equipamiento.has(p) ? 2 : 10;
      } else if (palabrasTitulo.some((pt) => pt.includes(p) || p.includes(pt))) {
        puntaje += equipamiento.has(p) ? 1 : 5;
      }
    }

    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorVideo = v;
    }
  }

  return mejorPuntaje > 0 ? mejorVideo : undefined;
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
