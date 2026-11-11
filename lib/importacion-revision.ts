import type { EstadoCuenta } from "./types";

/** Un socio de la planilla tal como quedaría después de importar (lo devuelve el servidor). */
export interface SocioImportadoDto {
  /** Última fila de la planilla donde aparece (1 = primera fila de datos). */
  fila: number;
  nombre: string;
  dni: string;
  /** true si se da de alta; false si ya existía y se actualiza. */
  nuevo: boolean;
  plan: string | null;
  estado: EstadoCuenta;
}

/** Orden en que se muestran los estados en la revisión. */
export const ORDEN_ESTADOS_REVISION: EstadoCuenta[] = ["AL_DIA", "PENDIENTE", "MOROSO", "INACTIVO"];

export interface RevisionImportacion {
  /** Cantidad por estado, siempre con los cuatro estados (0 si no vino). */
  porEstado: Record<EstadoCuenta, number>;
  /** Socios que quedarían morosos, en el orden de la planilla. Son los que hay que revisar a mano. */
  morosos: SocioImportadoDto[];
  /** false si el servidor no mandó estados (versión vieja del back): no se puede mostrar el desglose. */
  conEstados: boolean;
}

/**
 * Arma lo que muestra la pantalla de revisión a partir de la respuesta del simulacro.
 * Tolera respuestas sin `estados` ni `socios` para no romper contra un back anterior.
 */
export function resumirRevisionImportacion(res: {
  estados?: Partial<Record<EstadoCuenta, number>> | null;
  socios?: SocioImportadoDto[] | null;
}): RevisionImportacion {
  const porEstado = Object.fromEntries(
    ORDEN_ESTADOS_REVISION.map((e) => [e, Math.max(0, Number(res.estados?.[e] ?? 0) || 0)])
  ) as Record<EstadoCuenta, number>;
  const morosos = (res.socios ?? [])
    .filter((s) => s.estado === "MOROSO")
    .sort((a, b) => a.fila - b.fila);
  return { porEstado, morosos, conEstados: !!res.estados };
}
