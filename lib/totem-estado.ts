/** Estado de la tablet del Tótem según su última señal de vida (lo calcula el servidor). */
export type EstadoTotem = "EN_LINEA" | "SIN_SENAL" | "FUERA_DE_HORARIO" | "NUNCA_CONECTADO";

export interface TotemEstadoDto {
  estado: EstadoTotem;
  /** Hora local del gimnasio, sin zona ("2026-11-09T18:00:00"). null si nunca se conectó. */
  ultimoLatido: string | null;
  minutosSinSenal: number | null;
  /** Ingresos guardados en la tablet sin subir, según su última señal. */
  pendientesOffline: number;
  minutosAlerta: number;
}

export interface AvisoTotem {
  titulo: string;
  detalle: string;
  /** Identifica esta caída: si el titular oculta el cartel, vuelve a salir solo en una caída nueva. */
  clave: string;
}

/** Cada cuánto manda la tablet su señal de vida. */
export const INTERVALO_LATIDO_MS = 60_000;
/** Cada cuánto la app de los titulares pregunta por el tótem. */
export const INTERVALO_CONSULTA_ESTADO_MS = 60_000;

function tiempoTranscurrido(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "1 día" : `${dias} días`;
}

function desdeCuando(ultimoLatido: string, minutos: number): string {
  const hora = ultimoLatido.slice(11, 16);
  if (minutos < 24 * 60) return `las ${hora}`;
  const [, mes, dia] = ultimoLatido.slice(0, 10).split("-");
  return `el ${dia}/${mes} a las ${hora}`;
}

/**
 * Texto del cartel para los titulares. Solo hay cartel cuando la tablet dejó de avisar en horario
 * de apertura: de noche (FUERA_DE_HORARIO) o antes de vincularla (NUNCA_CONECTADO) no se alarma.
 */
export function avisoTotemSinSenal(dto: TotemEstadoDto | null | undefined): AvisoTotem | null {
  if (!dto || dto.estado !== "SIN_SENAL" || !dto.ultimoLatido) return null;
  const minutos = Math.max(0, dto.minutosSinSenal ?? 0);
  const pendientes =
    dto.pendientesOffline > 0
      ? ` Antes de cortarse tenía ${dto.pendientesOffline} ingreso(s) sin subir.`
      : "";
  return {
    titulo: "El tótem no tiene señal",
    detalle:
      `La tablet del mostrador no se comunica desde ${desdeCuando(dto.ultimoLatido, minutos)} ` +
      `(hace ${tiempoTranscurrido(minutos)}). Revisá que esté prendida, con la pantalla del tótem abierta y con WiFi. ` +
      `Los ingresos que se marquen igual quedan guardados en la tablet y se suben cuando vuelva la conexión.` +
      pendientes,
    clave: dto.ultimoLatido,
  };
}
