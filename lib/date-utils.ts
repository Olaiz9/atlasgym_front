// lib/date-utils.ts

/**
 * Parsea un string "YYYY-MM-DD" en un objeto Date en horario local
 * evitando que JavaScript lo interprete como medianoche UTC y reste un día en zonas GMT-3 (Argentina).
 */
export function parsearFechaLocal(fechaStr: string): Date {
  if (!fechaStr) return new Date();
  const partes = fechaStr.split("-");
  if (partes.length === 3) {
    const [anio, mes, dia] = partes.map(Number);
    if (!isNaN(anio) && !isNaN(mes) && !isNaN(dia)) {
      return new Date(anio, mes - 1, dia, 12, 0, 0); // Mediodía local para inmunidad a DST y timezone
    }
  }
  return new Date(fechaStr);
}

/**
 * Formatea una fecha "YYYY-MM-DD" a formato legible argentino "DD/MM/YYYY"
 * garantizando que el día coincida exactamente con el guardado en base de datos.
 */
export function formatFechaAR(fechaStr: string): string {
  if (!fechaStr) return "";
  const partes = fechaStr.split("-");
  if (partes.length === 3) {
    const [anio, mes, dia] = partes.map(Number);
    if (!isNaN(anio) && !isNaN(mes) && !isNaN(dia)) {
      const d = dia.toString().padStart(2, "0");
      const m = mes.toString().padStart(2, "0");
      return `${d}/${m}/${anio}`;
    }
  }
  return new Date(fechaStr).toLocaleDateString("es-AR");
}

/**
 * Calcula la diferencia en días naturales de calendario entre hoy y una fecha "YYYY-MM-DD".
 */
export function calcularDiasDesde(fechaStr: string): number {
  if (!fechaStr) return 0;
  const fecha = parsearFechaLocal(fechaStr);
  const hoy = new Date();

  // Normalizar a medianoche local para comparar días de calendario limpios
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();

  const diffMs = hoyNormalizado - fechaNormalizada;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Formatea el texto de ingreso/antigüedad ("Hoy", "Ayer", "Hace X días", o "DD/MM/YYYY").
 */
export function formatDiasIngreso(fechaStr: string): string {
  if (!fechaStr) return "";
  const diffDias = calcularDiasDesde(fechaStr);
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias <= 7) return `Hace ${diffDias} días`;
  return formatFechaAR(fechaStr);
}

/**
 * Devuelve la fecha local del calendario en formato "YYYY-MM-DD"
 * inmune a desfasajes de huso horario UTC vs UTC-3 (Argentina).
 */
export function fechaLocalHoy(referencia: Date = new Date()): string {
  const anio = referencia.getFullYear();
  const mes = (referencia.getMonth() + 1).toString().padStart(2, "0");
  const dia = referencia.getDate().toString().padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Devuelve el período mensual en formato "YYYY-MM" (ej: "2026-09").
 */
export function periodoMesActual(referencia: Date = new Date()): string {
  const anio = referencia.getFullYear();
  const mes = (referencia.getMonth() + 1).toString().padStart(2, "0");
  return `${anio}-${mes}`;
}

/**
 * Calcula dinámicamente la fecha de vencimiento de la cuota (día 10 de cada mes según política de Atlas Gym).
 * Si se indica el último período cubierto ("YYYY-MM"), vence el 10 del mes posterior a ese período.
 * Si la cuenta está al día, el próximo vencimiento es el 10 del mes siguiente.
 * Si está pendiente o morosa, vence el 10 del mes en curso.
 */
export function calcularVencimientoCuota(
  estadoCuenta?: string,
  fechaReferencia: Date = new Date(),
  ultimoPeriodoPagado?: string
): string {
  if (ultimoPeriodoPagado && ultimoPeriodoPagado.includes("-")) {
    const [pAnio, pMes] = ultimoPeriodoPagado.split("-").map(Number);
    if (!isNaN(pAnio) && !isNaN(pMes)) {
      // pMes es 1-based (ej: 9 para septiembre). En Date(año, mes), pasar pMes apunta al mes siguiente (0-indexed)
      const fechaVenc = new Date(pAnio, pMes, 10);
      const nombreMes = fechaVenc.toLocaleDateString("es-AR", { month: "long" });
      const nombreMesCap = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      return `10 de ${nombreMesCap}`;
    }
  }

  const anio = fechaReferencia.getFullYear();
  const mesActual = fechaReferencia.getMonth();
  const dia = fechaReferencia.getDate();

  let mesObjetivo = mesActual;
  if (estadoCuenta === "AL_DIA" || (dia > 10 && estadoCuenta !== "MOROSO" && estadoCuenta !== "PENDIENTE")) {
    mesObjetivo = mesActual + 1;
  }

  const fechaVenc = new Date(anio, mesObjetivo, 10);
  const nombreMes = fechaVenc.toLocaleDateString("es-AR", { month: "long" });
  const nombreMesCap = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  return `10 de ${nombreMesCap}`;
}

