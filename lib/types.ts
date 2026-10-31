// lib/types.ts
// Tipos compartidos entre módulos. Un alumno se crea UNA sola vez acá
// y el resto de los módulos (Finanzas, Rutinas, etc.) lo referencian por id
// en vez de repetir el nombre como texto suelto.

import {
  calcularDiferenciaDiasCalendario,
  diferenciaMesesPeriodo,
  periodoMesActual,
  sumarMesesPeriodo,
} from "./date-utils";

export type EstadoPago = "PAGADO" | "PARCIAL" | "PENDIENTE" | "VENCIDO" | "ANULADO";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "ALUMNO";
  alumnoId?: string;
  fotoUrl?: string;
  celular?: string;
  requiereCambioPassword?: boolean;
}

export interface Alumno {
  id: string;
  nombre: string;
  dni?: string;
  usuario?: string;
  email?: string;
  celular?: string;
  planId?: string;
  plan: string;
  fechaAlta: string; // "YYYY-MM-DD"
  activo: boolean;
  ultimaAsistencia?: string; // "YYYY-MM-DD" — null/undefined = todavía no registró asistencia
  tieneRutina?: boolean;
  rutinaId?: string;
}

export type TipoSerieEjercicio = 'NORMAL' | 'BI_SERIE' | 'DROP_SET'

export interface Ejercicio {
  id: string;
  nombre: string;
  series: number;
  repeticiones: string; // ej: "10-12", "8", "Al fallo", "10 + 10", "8 + 8 + 8"
  tipoSerie?: TipoSerieEjercicio;
  descansoSegundos?: number;
  notas?: string;
}

export interface DiaRutina {
  id: string;
  nombre: string; // ej: "Día 1 — Pecho y Tríceps"
  ejercicios: Ejercicio[];
}

export interface Rutina {
  id: string;
  nombre: string; // Nombre general puesto por el dueño (ej: "Hipertrofia 3 Días")
  descripcion?: string;
  objetivo: string; // "Hipertrofia" | "Fuerza" | "Definición" | "Adaptación"
  dias: DiaRutina[];
  esGenerica: boolean; // true si es plantilla para varios, false si es personalizada
  alumnoIdAsignado?: string;
}

// ── Historial de Entrenamiento ──────────────────────────────────────────────
// Permite al alumno registrar pesos y repeticiones por cada serie y recuperar
// su sesión previa la próxima vez que haga esa rutina.

/** Una serie individual registrada: número, peso, reps y si fue completada. */
export interface RegistroSerie {
  serieNumero: number;   // 1-based: 1, 2, 3…
  kg: number;            // Peso utilizado en kg
  reps: number;          // Repeticiones realizadas
  completada: boolean;   // true cuando el alumno marcó la serie como hecha
}

/** Registro de todas las series de un ejercicio dentro de una sesión. */
export interface SesionEjercicio {
  ejercicioId: string;
  series: RegistroSerie[];
}

/** Sesión completa de un día de entrenamiento de un alumno. */
export interface SesionEntrenamiento {
  id: string;
  alumnoId: string;
  rutinaId: string;
  diaId: string;
  fecha: string; // "YYYY-MM-DD" — permite comparar la sesión de hoy vs sesiones previas
  ejercicios: SesionEjercicio[];
}

export interface VideoTecnica {
  id: string;
  titulo: string;
  grupoMuscular: "Pecho" | "Espalda" | "Piernas" | "Hombros" | "Brazos" | "Core";
  duracion: string; // ej: "01:45", "Loop GIF"
  nivel: string; // ej: "Técnica estricta", "Básico", "Avanzado"
  videoUrl: string; // URL de YouTube, Vimeo o embed
  gifUrl?: string; // URL de animación GIF técnica en loop continuo
  formato?: "GIF" | "VIDEO"; // Permite distinguir técnica en loop directo vs video completo
  equipo?: string; // ej: "Barra", "Mancuerna", "Polea", "Máquina", "Peso corporal"
  descripcion?: string;
  consejosClave?: string[];
}

export interface Plan {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  diasPorSemana?: string; // ej: "Libre", "3 días", "5 días"
  activo: boolean;
}

export interface Pago {
  id: string;
  alumnoId: string;
  alumnoNombreHistorico?: string;
  planId?: string;
  plan: string;
  monto: number;
  montoAbonado?: number;
  saldoPendiente?: number;
  fecha: string; // "YYYY-MM-DD"
  metodo: string;
  estado: EstadoPago;
  periodoMes?: string; // "YYYY-MM" — período mensual inicial cubierto por la cuota
  cantidadMeses?: number; // Cantidad de meses cubiertos (1 = mensual, 3 = trimestral, etc.)
  comprobante?: string;
  registradoPor?: string;
  anuladoPor?: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
}

export interface ArqueoOperadorResumen {
  operador: string;
  totalRecaudado: number;
  cantidadOperaciones: number;
}

export interface ArqueoCajaResumen {
  fecha: string;
  totalRecaudado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  cantidadCobros: number;
  cantidadParciales: number;
  saldoPendienteParciales: number;
  cantidadAnulados: number;
  montoAnulado: number;
  porOperador: ArqueoOperadorResumen[];
}

/**
 * Devuelve el dinero efectivamente ingresado a caja por un comprobante.
 * Los pagos ANULADOS, PENDIENTES o VENCIDOS suman $0 de recaudación.
 */
export function obtenerMontoRecaudadoPago(
  pago: Pick<Pago, "monto" | "montoAbonado" | "estado">
): number {
  if (pago.estado === "PAGADO") {
    return pago.montoAbonado != null && pago.montoAbonado > 0 ? pago.montoAbonado : pago.monto;
  }
  if (pago.estado === "PARCIAL") {
    return pago.montoAbonado != null && pago.montoAbonado > 0 ? pago.montoAbonado : 0;
  }
  return 0;
}

/**
 * Devuelve el saldo que resta abonar de un comprobante (ej: diferencia sobre una seña PARCIAL).
 */
export function obtenerSaldoPendientePago(
  pago: Pick<Pago, "monto" | "montoAbonado" | "saldoPendiente" | "estado">
): number {
  if (pago.estado === "PAGADO" || pago.estado === "ANULADO") {
    return 0;
  }
  if (pago.saldoPendiente != null && pago.saldoPendiente >= 0) {
    return pago.saldoPendiente;
  }
  return Math.max(0, pago.monto - obtenerMontoRecaudadoPago(pago));
}

/**
 * Verifica si un socio ya registra un comprobante activo (PAGADO o PARCIAL)
 * que se solape con el rango [periodoInicio .. periodoInicio + cantidadMeses - 1].
 */
export function verificarSolapamientoPeriodoPago(
  alumnoId: string,
  periodoInicio: string,
  cantidadMeses: number,
  pagos: Pago[]
): Pago | undefined {
  if (!alumnoId || !/^\d{4}-\d{2}$/.test(periodoInicio)) return undefined;
  const meses = cantidadMeses > 1 ? Math.floor(cantidadMeses) : 1;
  const nuevoFin = meses > 1 ? sumarMesesPeriodo(periodoInicio, meses - 1) : periodoInicio;

  for (const p of pagos) {
    if (p.alumnoId !== alumnoId) continue;
    if (p.estado !== "PAGADO" && p.estado !== "PARCIAL") continue;
    const exInicio =
      p.periodoMes && /^\d{4}-\d{2}$/.test(p.periodoMes.trim())
        ? p.periodoMes.trim()
        : p.fecha && p.fecha.length >= 7
        ? p.fecha.slice(0, 7)
        : undefined;
    const exFin = obtenerPeriodoFinCubierto(p);
    if (!exInicio || !exFin) continue;
    if (periodoInicio <= exFin && nuevoFin >= exInicio) {
      return p;
    }
  }
  return undefined;
}

/**
 * Calcula en memoria el Arqueo de Caja de una fecha exacta ("YYYY-MM-DD"),
 * homólogo a PagoService.calcularArqueoDiario en Spring Boot.
 */
export function calcularArqueoCajaLocal(pagos: Pago[], fecha: string): ArqueoCajaResumen {
  let totalRecaudado = 0;
  let totalEfectivo = 0;
  let totalTransferencia = 0;
  let totalTarjeta = 0;
  let cantidadCobros = 0;
  let cantidadParciales = 0;
  let saldoPendienteParciales = 0;

  const porOpMonto = new Map<string, number>();
  const porOpCant = new Map<string, number>();
  const idsAnulados = new Set<string>();
  let montoAnulado = 0;

  for (const p of pagos) {
    const anuladoEseDia =
      p.estado === "ANULADO" &&
      ((p.fechaAnulacion && p.fechaAnulacion.slice(0, 10) === fecha) ||
        (!p.fechaAnulacion && p.fecha === fecha));

    if (p.fecha !== fecha && !anuladoEseDia) continue;

    if (p.estado === "ANULADO") {
      if (!idsAnulados.has(p.id)) {
        idsAnulados.add(p.id);
        const orig = p.montoAbonado != null && p.montoAbonado > 0 ? p.montoAbonado : p.monto;
        montoAnulado += orig;
      }
      continue;
    }

    if (p.fecha !== fecha) continue;
    if (p.estado !== "PAGADO" && p.estado !== "PARCIAL") continue;

    const cobrado = obtenerMontoRecaudadoPago(p);
    if (cobrado <= 0) continue;

    totalRecaudado += cobrado;
    cantidadCobros += 1;

    const met = (p.metodo || "").toUpperCase();
    if (met.includes("TRANSF") || met.includes("MERCADO")) {
      totalTransferencia += cobrado;
    } else if (met.includes("TARJ") || met.includes("DEBIT") || met.includes("CREDIT")) {
      totalTarjeta += cobrado;
    } else {
      totalEfectivo += cobrado;
    }

    if (p.estado === "PARCIAL") {
      cantidadParciales += 1;
      saldoPendienteParciales += obtenerSaldoPendientePago(p);
    }

    const op = p.registradoPor?.trim() || "Sin operador";
    porOpMonto.set(op, (porOpMonto.get(op) || 0) + cobrado);
    porOpCant.set(op, (porOpCant.get(op) || 0) + 1);
  }

  const porOperador: ArqueoOperadorResumen[] = Array.from(porOpMonto.entries())
    .map(([operador, rec]) => ({
      operador,
      totalRecaudado: rec,
      cantidadOperaciones: porOpCant.get(operador) || 0,
    }))
    .sort((a, b) => b.totalRecaudado - a.totalRecaudado);

  return {
    fecha,
    totalRecaudado,
    totalEfectivo,
    totalTransferencia,
    totalTarjeta,
    cantidadCobros,
    cantidadParciales,
    saldoPendienteParciales,
    cantidadAnulados: idsAnulados.size,
    montoAnulado,
    porOperador,
  };
}

// Estado de cuenta de un alumno, DERIVADO de sus pagos y actividad (no se guarda a mano).
export type EstadoCuenta = "AL_DIA" | "PENDIENTE" | "MOROSO" | "INACTIVO";

/**
 * Devuelve el último período mensual ("YYYY-MM") cubierto por un pago,
 * contemplando pagos multi-mes (ej: periodoMes "2026-08" con cantidadMeses = 3 -> "2026-10").
 */
export function obtenerPeriodoFinCubierto(
  pago?: Pick<Pago, "periodoMes" | "fecha" | "cantidadMeses"> | null
): string | undefined {
  if (!pago) return undefined;
  const baseRaw =
    pago.periodoMes && /^\d{4}-\d{2}$/.test(pago.periodoMes.trim())
      ? pago.periodoMes.trim()
      : pago.fecha && pago.fecha.length >= 7
      ? pago.fecha.slice(0, 7)
      : undefined;
  if (!baseRaw || !/^\d{4}-\d{2}$/.test(baseRaw)) return undefined;

  const meses = pago.cantidadMeses && pago.cantidadMeses > 1 ? Math.floor(pago.cantidadMeses) : 1;
  return meses > 1 ? sumarMesesPeriodo(baseRaw, meses - 1) : baseRaw;
}

/**
 * Obtiene el período máximo cubierto ("YYYY-MM") para un alumno priorizando cuotas PAGADAS.
 */
export function obtenerMaxPeriodoCubiertoAlumno(pagos: Pago[]): string | undefined {
  let maxPagado: string | undefined;
  let maxCualquiera: string | undefined;

  for (const p of pagos) {
    if (p.estado === "ANULADO") continue;
    const fin = obtenerPeriodoFinCubierto(p);
    if (!fin) continue;
    if (!maxCualquiera || fin > maxCualquiera) {
      maxCualquiera = fin;
    }
    if (p.estado === "PAGADO" && (!maxPagado || fin > maxPagado)) {
      maxPagado = fin;
    }
  }
  return maxPagado || maxCualquiera;
}

/**
 * Calcula dinámicamente el estado de cuenta según la política oficial de Atlas Gym (Opción A),
 * 100% homóloga a AlumnoService.calcularEstadoCuenta en Spring Boot:
 * - Baja administrativa (!socioActivo) -> INACTIVO.
 * - Mes en curso o meses futuros cubiertos (soporta promos multi-mes) -> AL_DIA.
 * - Cubrió hasta el mes pasado:
 *     * Días 1 al 10 del mes actual -> AL_DIA (ventana de pago del 1 al 10).
 *     * Días 11 a fin de mes -> PENDIENTE.
 * - Se pasó del mes entero sin pagar (debe el mes anterior completo) -> MOROSO.
 * - >= 3 meses sin cobertura pagada y > 60 días sin actividad -> INACTIVO por abandono.
 */
export function estadoCuentaDeAlumno(
  alumnoId: string,
  pagos: Pago[],
  fechaAlta?: string,
  socioActivo: boolean = true,
  fechaReferencia: Date = new Date()
): EstadoCuenta {
  if (!socioActivo) {
    return "INACTIVO";
  }

  const ymActual = periodoMesActual(fechaReferencia);
  const dia = fechaReferencia.getDate();
  const pagosDelAlumno = pagos.filter((p) => p.alumnoId === alumnoId && p.estado !== "ANULADO");

  // 1. Socio sin pagos activos registrados aún (excluyendo anulados)
  if (pagosDelAlumno.length === 0) {
    if (fechaAlta && fechaAlta.length >= 7) {
      const ymAlta = fechaAlta.slice(0, 7);
      const mesesDesdeAlta = diferenciaMesesPeriodo(ymAlta, ymActual);
      const diasDesdeAlta = calcularDiferenciaDiasCalendario(fechaAlta, fechaReferencia);
      if (mesesDesdeAlta >= 2 || diasDesdeAlta > 60) {
        return "INACTIVO";
      }
      if (mesesDesdeAlta >= 1) {
        return "MOROSO";
      }
    }
    return "PENDIENTE";
  }

  // 2. Evaluar cobertura máxima por estado y última fecha de movimiento
  let maxPeriodoPagado: string | undefined;
  let maxPeriodoPendiente: string | undefined;
  let maxPeriodoVencido: string | undefined;
  let ultimaFechaMovimiento: string | undefined;

  for (const p of pagosDelAlumno) {
    if (p.fecha && (!ultimaFechaMovimiento || p.fecha > ultimaFechaMovimiento)) {
      ultimaFechaMovimiento = p.fecha;
    }
    const finCubierto = obtenerPeriodoFinCubierto(p);
    if (!finCubierto) continue;

    if (p.estado === "PAGADO") {
      if (!maxPeriodoPagado || finCubierto > maxPeriodoPagado) {
        maxPeriodoPagado = finCubierto;
      }
    } else if (p.estado === "PENDIENTE" || p.estado === "PARCIAL") {
      if (!maxPeriodoPendiente || finCubierto > maxPeriodoPendiente) {
        maxPeriodoPendiente = finCubierto;
      }
    } else if (p.estado === "VENCIDO") {
      if (!maxPeriodoVencido || finCubierto > maxPeriodoVencido) {
        maxPeriodoVencido = finCubierto;
      }
    }
  }

  // 3. Abandono (> 60 días sin actividad de pagos y >= 3 meses sin cobertura pagada)
  const tieneMovimientoReciente =
    !!ultimaFechaMovimiento &&
    calcularDiferenciaDiasCalendario(ultimaFechaMovimiento, fechaReferencia) <= 60;

  if (maxPeriodoPagado) {
    const mesesSinCobertura = diferenciaMesesPeriodo(maxPeriodoPagado, ymActual);
    if (mesesSinCobertura >= 3 && !tieneMovimientoReciente) {
      return "INACTIVO";
    }
  } else if (!tieneMovimientoReciente) {
    return "INACTIVO";
  }

  // 4. Cuota explícitamente marcada como VENCIDO no cubierta por un pago posterior
  if (maxPeriodoVencido && (!maxPeriodoPagado || maxPeriodoVencido > maxPeriodoPagado)) {
    return "MOROSO";
  }

  // 5. Cuota del mes actual (o posterior) explícitamente en estado PENDIENTE aún no cubierta
  if (
    maxPeriodoPendiente &&
    maxPeriodoPendiente >= ymActual &&
    (!maxPeriodoPagado || maxPeriodoPagado < ymActual)
  ) {
    return "PENDIENTE";
  }

  // 6. Regla Opción A sobre cobertura PAGADA
  if (maxPeriodoPagado) {
    const diffMeses = diferenciaMesesPeriodo(maxPeriodoPagado, ymActual);
    if (diffMeses <= 0) {
      return "AL_DIA";
    }
    if (diffMeses === 1) {
      return dia <= 10 ? "AL_DIA" : "PENDIENTE";
    }
    return "MOROSO";
  }

  // 7. Socio sin pagos PAGADO pero con cuotas PENDIENTE recientes
  if (maxPeriodoPendiente) {
    const diffPendiente = diferenciaMesesPeriodo(maxPeriodoPendiente, ymActual);
    return diffPendiente <= 0 ? "PENDIENTE" : "MOROSO";
  }

  return "MOROSO";
}

export const ESTADO_CUENTA_LABEL: Record<EstadoCuenta, string> = {
  AL_DIA: "Al día",
  PENDIENTE: "Pendiente",
  MOROSO: "Moroso",
  INACTIVO: "Inactivo",
};

export const ESTADO_CUENTA_STYLES: Record<EstadoCuenta, string> = {
  AL_DIA: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PENDIENTE: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  MOROSO: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  INACTIVO: "bg-slate-800 text-slate-400 border border-slate-700",
};

export type CategoriaAviso = "IMPORTANTE" | "NOVEDAD" | "HORARIO";

export interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  categoria: CategoriaAviso;
  fecha: string; // "YYYY-MM-DD"
  paraTodos: boolean;
  alumnoId?: string; // Si es privado para un alumno
  leidoPor: string[]; // IDs de usuarios que ya marcaron el aviso como leído
}

export const CATEGORIA_AVISO_LABEL: Record<CategoriaAviso, string> = {
  IMPORTANTE: "Importante",
  NOVEDAD: "Novedad",
  HORARIO: "Horarios",
};

export const CATEGORIA_AVISO_STYLES: Record<
  CategoriaAviso,
  { label: string; badge: string; border: string }
> = {
  IMPORTANTE: {
    label: "Importante",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    border: "border-rose-500",
  },
  NOVEDAD: {
    label: "Novedad",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    border: "border-blue-500",
  },
  HORARIO: {
    label: "Horarios",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    border: "border-emerald-500",
  },
};

export type MetodoAsistencia = "DNI_TOTEM" | "MANUAL_ADMIN" | "QR";

export interface RegistroAsistencia {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  alumnoDni: string;
  alumnoFotoUrl?: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:mm"
  timestamp: number; // ms para cálculo preciso de aforo
  estadoCuenta: EstadoCuenta;
  planNombre: string;
  metodo: MetodoAsistencia;
  asistenciasSemana?: number;
  limiteDiasSemana?: number | null;
  excedeLimiteSemanal?: boolean;
}
