// lib/asistencia-utils.ts
import { RegistroAsistencia } from "./types";
import { fechaLocalHoy, parsearFechaLocal } from "./date-utils";

export interface OpcionDiaFiltro {
  fecha: string; // "YYYY-MM-DD"
  etiqueta: string; // "Hoy", "Ayer", "Lun 21/09"
  diaNombre: string; // "Lunes 21 Sep"
}

/**
 * Retorna las opciones de fecha para los últimos 7 días (Hoy, Ayer y hasta 1 semana atrás).
 */
export function obtenerUltimos7Dias(fechaReferencia: string = fechaLocalHoy()): OpcionDiaFiltro[] {
  const opciones: OpcionDiaFiltro[] = [];
  const base = parsearFechaLocal(fechaReferencia);

  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i, 12, 0, 0);
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const fStr = `${yyyy}-${mm}-${dd}`;

    let etiqueta = `${dd}/${mm}`;
    if (i === 0) etiqueta = "Hoy";
    else if (i === 1) etiqueta = "Ayer";
    else {
      const diaSem = d.toLocaleDateString("es-AR", { weekday: "short" });
      const diaCapitalizado = diaSem.replace(".", "").charAt(0).toUpperCase() + diaSem.replace(".", "").slice(1);
      etiqueta = `${diaCapitalizado} ${dd}/${mm}`;
    }

    const diaNombre = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
    const nombreCap = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);

    opciones.push({
      fecha: fStr,
      etiqueta,
      diaNombre: nombreCap,
    });
  }

  return opciones;
}

/**
 * Duración máxima estimada de una sesión de entrenamiento en ATLAS GYM.
 * 1 hora y 40 minutos = 100 minutos exactos (6.000.000 ms).
 * Pasado este tiempo, la persona se retira automáticamente del aforo activo en sala.
 */
export const DURACION_SESION_MINUTOS = 100;
export const DURACION_SESION_MS = DURACION_SESION_MINUTOS * 60 * 1000;

/**
 * Normaliza cualquier formato de DNI ingresado (remueve puntos, guiones y espacios).
 */
export function normalizarDni(dni: string): string {
  if (!dni) return "";
  return dni.toString().replace(/\D/g, "").trim();
}

/**
 * Determina si una sesión de asistencia continúa activa en sala (menos de 1h 40m).
 */
export function estaSesionActiva(timestampAsistencia: number, ahora: number = Date.now()): boolean {
  if (!timestampAsistencia || timestampAsistencia <= 0) return false;
  const diferencia = ahora - timestampAsistencia;
  return diferencia >= 0 && diferencia < DURACION_SESION_MS;
}

/**
 * Calcula los minutos transcurridos desde el ingreso a la sala.
 */
export function calcularMinutosTranscurridos(timestampAsistencia: number, ahora: number = Date.now()): number {
  if (!timestampAsistencia) return 0;
  const dif = ahora - timestampAsistencia;
  if (dif < 0) return 0;
  return Math.floor(dif / (60 * 1000));
}

/**
 * Devuelve un texto amigable y legible para el tiempo en sala.
 * Ejemplo: "Hace 15 min", "Hace 1h 20m", "Sesión completada".
 */
export function formatearTiempoEnSala(timestampAsistencia: number, ahora: number = Date.now()): string {
  const minutos = calcularMinutosTranscurridos(timestampAsistencia, ahora);
  if (minutos >= DURACION_SESION_MINUTOS) {
    return "Sesión completada";
  }
  if (minutos < 1) {
    return "Recién ingresó";
  }
  if (minutos < 60) {
    return `Hace ${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const minRestantes = minutos % 60;
  return minRestantes === 0 ? `Hace ${horas}h` : `Hace ${horas}h ${minRestantes}m`;
}

/**
 * Filtra los registros que están actualmente activos en sala (últimos 100 minutos).
 */
export function filtrarAsistenciasActivas(
  asistencias: RegistroAsistencia[],
  ahora: number = Date.now()
): RegistroAsistencia[] {
  return asistencias.filter((a) => estaSesionActiva(a.timestamp, ahora));
}

export interface DistribucionHorariaItem {
  hora: number;
  etiqueta: string; // ej: "08:00"
  cantidad: number;
  porcentaje: number;
}

/**
 * Calcula la distribución por hora de las asistencias (horarios de 07:00 a 22:00).
 */
export function calcularDistribucionHoraria(asistencias: RegistroAsistencia[]): DistribucionHorariaItem[] {
  const conteoPorHora: Record<number, number> = {};
  for (let h = 7; h <= 22; h++) {
    conteoPorHora[h] = 0;
  }

  for (const a of asistencias) {
    if (!a.hora) continue;
    const partes = a.hora.split(":");
    const h = parseInt(partes[0], 10);
    if (!isNaN(h) && h >= 7 && h <= 22) {
      conteoPorHora[h] = (conteoPorHora[h] || 0) + 1;
    }
  }

  const maximo = Math.max(...Object.values(conteoPorHora), 1);

  const resultado: DistribucionHorariaItem[] = [];
  for (let h = 7; h <= 22; h++) {
    const cant = conteoPorHora[h] || 0;
    resultado.push({
      hora: h,
      etiqueta: `${h.toString().padStart(2, "0")}:00`,
      cantidad: cant,
      porcentaje: Math.round((cant / maximo) * 100),
    });
  }

  return resultado;
}

export interface DistribucionSemanalItem {
  dia: string;
  diaCorto: string;
  diaIndex: number; // 1 = Lunes, 6 = Sábado
  cantidad: number;
  porcentaje: number;
}

const DIAS_SEMANA = [
  { nombre: "Lunes", corto: "Lun", index: 1 },
  { nombre: "Martes", corto: "Mar", index: 2 },
  { nombre: "Miércoles", corto: "Mié", index: 3 },
  { nombre: "Jueves", corto: "Jue", index: 4 },
  { nombre: "Viernes", corto: "Vie", index: 5 },
  { nombre: "Sábado", corto: "Sáb", index: 6 },
];

/**
 * Calcula la afluencia agregada por día de la semana (Lunes a Sábado).
 */
export function calcularDistribucionSemanal(asistencias: RegistroAsistencia[]): DistribucionSemanalItem[] {
  const conteo: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const a of asistencias) {
    if (!a.fecha) continue;
    // YYYY-MM-DD
    const partes = a.fecha.split("-").map(Number);
    if (partes.length === 3) {
      const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
      const diaSemana = fechaObj.getDay(); // 0 = Domingo, 1 = Lunes, 6 = Sábado
      if (diaSemana >= 1 && diaSemana <= 6) {
        conteo[diaSemana] = (conteo[diaSemana] || 0) + 1;
      }
    }
  }

  const maximo = Math.max(...Object.values(conteo), 1);

  return DIAS_SEMANA.map((d) => {
    const cant = conteo[d.index] || 0;
    return {
      dia: d.nombre,
      diaCorto: d.corto,
      diaIndex: d.index,
      cantidad: cant,
      porcentaje: Math.round((cant / maximo) * 100),
    };
  });
}

/**
 * Sintetizador de tonos de audio nativo con Web Audio API.
 * 100% autónomo: no requiere descargar archivos de audio externos.
 */
export function reproducirSonidoFeedback(tipo: "EXITO" | "ALERTA" | "ERROR"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (tipo === "EXITO") {
      // Arpegio positivo brillante (C5 -> E5 -> G5)
      const ahora = ctx.currentTime;
      const notas = [523.25, 659.25, 783.99]; // C5, E5, G5
      notas.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ahora + i * 0.08);

        gain.gain.setValueAtTime(0, ahora + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, ahora + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + i * 0.08 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ahora + i * 0.08);
        osc.stop(ahora + i * 0.08 + 0.25);
      });
    } else if (tipo === "ALERTA") {
      // Tono suave de advertencia respetuosa (triangular)
      const ahora = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ahora);
      osc.frequency.setValueAtTime(392, ahora + 0.12);

      gain.gain.setValueAtTime(0.15, ahora);
      gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ahora);
      osc.stop(ahora + 0.4);
    } else {
      // Tono grave de error (bip bajo doble)
      const ahora = ctx.currentTime;
      [220, 196].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ahora + i * 0.12);

        gain.gain.setValueAtTime(0.12, ahora + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + i * 0.12 + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ahora + i * 0.12);
        osc.stop(ahora + i * 0.12 + 0.12);
      });
    }
  } catch {
    // Si el navegador bloquea la reproducción automática o no la soporta, falla silenciosamente
  }
}

/**
 * Emite una campana / chime sonoro nítido y agradable cuando finaliza el tiempo de descanso
 * entre series en la rutina del alumno, avisándole que debe comenzar la siguiente serie.
 */
export function reproducirSonidoFinDescanso(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const ahora = ctx.currentTime;

    // Doble campana deportiva nítida (880 Hz y 1174.66 Hz - A5 a D6)
    const notas = [880, 1174.66];
    notas.forEach((freq, i) => {
      const start = ahora + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.6);
    });
  } catch {
    // Si el navegador bloquea audio sin interacción previa, no rompe la UI
  }
}

