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
 * Calcula la diferencia con signo en días naturales de calendario entre una fecha "YYYY-MM-DD"
 * y una fecha de referencia (equivalente a ChronoUnit.DAYS.between(desde, hasta)).
 */
export function calcularDiferenciaDiasCalendario(
  desdeFechaStr: string,
  hastaReferencia: Date = new Date()
): number {
  if (!desdeFechaStr) return 0;
  const desde = parsearFechaLocal(desdeFechaStr);
  const hastaNormalizado = new Date(
    hastaReferencia.getFullYear(),
    hastaReferencia.getMonth(),
    hastaReferencia.getDate()
  ).getTime();
  const desdeNormalizado = new Date(
    desde.getFullYear(),
    desde.getMonth(),
    desde.getDate()
  ).getTime();

  return Math.floor((hastaNormalizado - desdeNormalizado) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la diferencia en días naturales de calendario entre hoy y una fecha "YYYY-MM-DD".
 */
export function calcularDiasDesde(fechaStr: string): number {
  if (!fechaStr) return 0;
  return Math.max(0, calcularDiferenciaDiasCalendario(fechaStr, new Date()));
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
 * Resta (o suma si es negativo) días naturales a una fecha "YYYY-MM-DD" en calendario local
 * sin deriva de huso horario UTC.
 */
export function restarDiasFechaLocal(fechaStr: string, diasARestar: number): string {
  const base = parsearFechaLocal(fechaStr);
  const ajustada = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() - diasARestar,
    12,
    0,
    0
  );
  return fechaLocalHoy(ajustada);
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
 * Suma (o resta) meses a un período "YYYY-MM" sin usar Date UTC.
 */
export function sumarMesesPeriodo(periodoYYYYMM: string, mesesASumar: number): string {
  if (!periodoYYYYMM || !periodoYYYYMM.includes("-")) return periodoYYYYMM;
  const [anio, mes] = periodoYYYYMM.split("-").map(Number);
  if (isNaN(anio) || isNaN(mes)) return periodoYYYYMM;
  const totalMeses = anio * 12 + (mes - 1) + mesesASumar;
  const nuevoAnio = Math.floor(totalMeses / 12);
  const nuevoMes = (((totalMeses % 12) + 12) % 12) + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
}

/**
 * Calcula cuántos meses calendario hay entre dos períodos "YYYY-MM"
 * (equivalente a ChronoUnit.MONTHS.between(desde, hasta)).
 */
export function diferenciaMesesPeriodo(desdeYYYYMM: string, hastaYYYYMM: string): number {
  const [dAnio, dMes] = desdeYYYYMM.split("-").map(Number);
  const [hAnio, hMes] = hastaYYYYMM.split("-").map(Number);
  if (isNaN(dAnio) || isNaN(dMes) || isNaN(hAnio) || isNaN(hMes)) return 0;
  return (hAnio - dAnio) * 12 + (hMes - dMes);
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
