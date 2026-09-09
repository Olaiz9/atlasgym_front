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
