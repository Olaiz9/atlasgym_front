// lib/rutina-utils.ts
import { RegistroSerie, VideoTecnica, Rutina } from "./types";

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

/**
 * Clave unificada para almacenar borradores de entrenamientos en curso en localStorage.
 */
export function getClaveBorradorEntrenamiento(alumnoId: string, rutinaId: string, fecha: string): string {
  return `atlas_borrador_${alumnoId}_${rutinaId}_${fecha}`;
}

/**
 * Obtiene el borrador activo guardado para una fecha específica o null si no existe.
 */
export function obtenerBorradorEntrenamiento(
  alumnoId: string,
  rutinaId: string,
  fecha: string
): { diaActivo: number; seriesPorDia: Record<string, Record<string, RegistroSerie[]>> } | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getClaveBorradorEntrenamiento(alumnoId, rutinaId, fecha);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.seriesPorDia) {
      return {
        diaActivo: typeof parsed.diaActivo === "number" ? parsed.diaActivo : 0,
        seriesPorDia: parsed.seriesPorDia,
      };
    }
  } catch {}
  return null;
}

/**
 * Limpia borradores obsoletos de fechas anteriores a la fecha actual para mantener el almacenamiento limpio.
 */
export function limpiarBorradoresObsoletos(fechaHoy: string): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("atlas_borrador_") && !key.endsWith(`_${fechaHoy}`)) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

export interface ConflictoRutinaAlumno {
  alumnoId: string;
  alumnoNombre: string;
  rutinaAnteriorId: string;
  rutinaAnteriorNombre: string;
}

/**
 * Detecta qué alumnos seleccionados ya tienen otra rutina asignada (distinta a la nueva)
 * para advertir al profesor antes de sobreescribir.
 */
export function detectarConflictosAsignacionRutina(
  alumnoIds: string[],
  rutinas: Rutina[],
  alumnos: { id: string; nombre: string; rutinaId?: string }[],
  nuevaRutinaId: string
): ConflictoRutinaAlumno[] {
  const conflictos: ConflictoRutinaAlumno[] = [];

  for (const alumnoId of alumnoIds) {
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno || !alumno.rutinaId) continue;
    // Si ya tiene la MISMA rutina, no es un conflicto destructivo
    if (alumno.rutinaId === nuevaRutinaId) continue;

    const rutinaAnterior = rutinas.find((r) => r.id === alumno.rutinaId);
    conflictos.push({
      alumnoId: alumno.id,
      alumnoNombre: alumno.nombre,
      rutinaAnteriorId: alumno.rutinaId,
      rutinaAnteriorNombre: rutinaAnterior ? rutinaAnterior.nombre : "Rutina previa",
    });
  }

  return conflictos;
}

