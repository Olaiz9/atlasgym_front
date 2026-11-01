// lib/api-mappers.ts
// Traductores bidireccionales entre los DTOs de Spring Boot (Long IDs, Enums de Java)
// y el modelo de dominio del Frontend (string IDs, etiquetas de interfaz).

import {
  Alumno,
  Aviso,
  CategoriaAviso,
  DiaRutina,
  Ejercicio,
  EstadoCuenta,
  EstadoPago,
  MetodoAsistencia,
  Pago,
  Plan,
  RegistroAsistencia,
  Rutina,
  SesionEntrenamiento,
  TipoSerieEjercicio,
  UsuarioSesion,
  VideoTecnica,
} from "./types";

// ── DTO Interfaces del Backend (Spring Boot) ────────────────────────────────

export interface BackendLoginResponse {
  token: string | null;
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "ALUMNO";
  alumnoId: number | null;
  fotoUrl: string | null;
}

export interface BackendAlumnoDto {
  id: number;
  nombre: string;
  dni?: string | null;
  usuario?: string | null;
  username?: string | null;
  email?: string | null;
  celular?: string | null;
  planId?: number | null;
  planNombre?: string | null;
  fechaAlta?: string | null;
  ultimaAsistencia?: string | null;
  activo?: boolean | null;
  estadoCuenta?: EstadoCuenta | null;
  rutinaId?: number | null;
  rutinaNombre?: string | null;
}

export interface BackendPlanDto {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string | null;
  diaPorSemana?: string | null;
  activo: boolean;
}

export interface BackendPagoDto {
  id: number;
  alumnoId: number | null;
  alumnoNombre?: string;
  alumnoNombreHistorico?: string;
  alumnoActivo?: boolean | null;
  planNombre: string;
  monto: number;
  fecha: string;
  metodo: string;
  estado: string;
  periodoMes?: string | null;
  comprobante?: string | null;
}

export interface BackendEjercicioDto {
  id?: number | null;
  nombreEjercicio: string;
  serie: number;
  repeticiones: string;
  descansoSegundos?: string | null;
  notas?: string | null;
  orden: number;
  tipoSerie?: TipoSerieEjercicio | null;
  videoTecnicaId?: number | null;
  videoTecnicaTitulo?: string | null;
}

export interface BackendDiaRutinaDto {
  id?: number | null;
  nombre: string;
  orden: number;
  ejercicios: BackendEjercicioDto[];
  videoIds?: number[];
}

export interface BackendRutinaDto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  esGenerica: boolean;
  dias: BackendDiaRutinaDto[];
}

export interface BackendAsistenciaDto {
  id: number;
  alumnoId: number | null;
  nombreAlumno: string;
  alumnoDni?: string | null;
  planNombre?: string | null;
  fecha: string;
  hora: string;
  metodo?: MetodoAsistencia | null;
  estadoCuenta?: EstadoCuenta | null;
}

export interface BackendTotemCheckInDto {
  ok: boolean;
  yaRegistrado: boolean;
  motivo: string;
  asistenciaId?: number | null;
  alumnoId?: number | null;
  nombreAlumno?: string | null;
  alumnoDni?: string | null;
  planNombre?: string | null;
  estadoCuenta?: EstadoCuenta | null;
  horaIngreso?: string | null;
}

export interface BackendVideoTecnicaDto {
  id?: number | null;
  titulo: string;
  descripcion?: string | null;
  grupoMuscularVideo?: string | null;
  nivel?: string | null;
  duracion?: string | null;
  urlVideo?: string | null;
  thumbnailUrl?: string | null;
  gifUrl?: string | null;
  formato?: "GIF" | "VIDEO" | null;
  equipo?: string | null;
  consejosClave?: string[] | null;
}

export interface BackendAvisoDto {
  id: number;
  titulo: string;
  mensaje: string;
  categoria: CategoriaAviso;
  fecha: string;
  paraTodos: boolean;
  alumnoId?: number | null;
  nombreAlumno?: string | null;
  leido: boolean;
}

export interface BackendSesionResponseDto {
  id: number;
  alumnoId: number;
  rutinaId?: number | null;
  diaRutinaId?: number | null;
  diaNombre?: string | null;
  fecha: string;
  duracionMinutos?: number | null;
  notas?: string | null;
  ejercicios: {
    id?: number | null;
    ejercicioId?: number | null;
    nombreEjercicio?: string | null;
    series: {
      id?: number | null;
      serieNumero: number;
      kg: number;
      reps: number;
      completada: boolean;
    }[];
  }[];
}

// ── Mappers de Conversión ───────────────────────────────────────────────────

export function parseNumericId(id?: string | number | null): number | null {
  if (id === undefined || id === null || id === "") return null;
  const n = typeof id === "number" ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

export function mapLoginResponseToUsuarioSesion(dto: BackendLoginResponse): UsuarioSesion {
  return {
    id: String(dto.id),
    nombre: dto.nombre === "admin@atlasgym.com" ? "Julián Pérez" : dto.nombre,
    email: dto.email,
    rol: dto.rol,
    alumnoId: dto.alumnoId != null ? String(dto.alumnoId) : undefined,
    fotoUrl: dto.fotoUrl || undefined,
  };
}

export function mapAlumnoDtoToFront(dto: BackendAlumnoDto): Alumno {
  const baseNombre = (dto.nombre || "socio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "") || "socio";
  const digitosDni = (dto.dni || "").replace(/\D/g, "");
  const sufijo = digitosDni.length >= 3 ? digitosDni.slice(-3) : digitosDni;
  const fallbackUsuario = `${baseNombre}${sufijo}`;

  return {
    id: String(dto.id),
    nombre: dto.nombre,
    dni: dto.dni || undefined,
    usuario: dto.usuario || dto.username || fallbackUsuario,
    email: dto.email || undefined,
    celular: dto.celular || undefined,
    planId: dto.planId != null ? String(dto.planId) : undefined,
    plan: dto.planNombre || "Sin plan",
    fechaAlta: dto.fechaAlta || new Date().toISOString().slice(0, 10),
    ultimaAsistencia: dto.ultimaAsistencia || undefined,
    activo: dto.activo ?? true,
    tieneRutina: dto.rutinaId != null,
    rutinaId: dto.rutinaId != null ? String(dto.rutinaId) : undefined,
  };
}

export function mapAlumnoFrontToRequestDto(alumno: Partial<Alumno>) {
  return {
    nombre: alumno.nombre || "Alumno",
    dni: alumno.dni || "",
    email: alumno.email || null,
    celular: alumno.celular || null,
    planId: parseNumericId(alumno.planId),
    rutinaId: parseNumericId(alumno.rutinaId),
    activo: alumno.activo ?? true,
  };
}

export function mapPlanDtoToFront(dto: BackendPlanDto): Plan {
  return {
    id: String(dto.id),
    nombre: dto.nombre,
    precio: Number(dto.precio),
    descripcion: dto.descripcion || undefined,
    diasPorSemana: dto.diaPorSemana || "Libre",
    activo: dto.activo ?? true,
  };
}

export function mapPlanFrontToRequestDto(plan: Partial<Plan>) {
  return {
    nombre: plan.nombre || "Plan",
    precio: Number(plan.precio ?? 0),
    descripcion: plan.descripcion || "",
    diaPorSemana: plan.diasPorSemana || "Libre",
    activo: plan.activo ?? true,
  };
}

export function mapMetodoPagoToFront(metodo?: string | null): string {
  const m = (metodo || "").toUpperCase();
  if (m === "TRANSFERENCIA") return "Transferencia";
  if (m === "TARJETA") return "Tarjeta";
  return "Efectivo";
}

export function mapMetodoPagoToBack(metodo?: string | null): string {
  const m = (metodo || "").toUpperCase();
  if (m.includes("TRANSF") || m.includes("MERCADO")) return "TRANSFERENCIA";
  if (m.includes("TARJ") || m.includes("DEBIT") || m.includes("CREDIT")) return "TARJETA";
  return "EFECTIVO";
}

export function mapEstadoPagoToFront(estado?: string | null): EstadoPago {
  const e = (estado || "").toUpperCase();
  if (e === "PENDIENTE") return "PENDIENTE";
  if (e === "VENCIDO" || e === "MOROSO") return "VENCIDO";
  return "PAGADO";
}

export function mapPagoDtoToFront(dto: BackendPagoDto): Pago {
  return {
    id: String(dto.id),
    alumnoId: dto.alumnoId != null ? String(dto.alumnoId) : "",
    alumnoNombreHistorico: dto.alumnoNombreHistorico ?? dto.alumnoNombre,
    alumnoActivo: dto.alumnoActivo,
    plan: dto.planNombre || "Sin plan",
    monto: Number(dto.monto),
    fecha: dto.fecha,
    metodo: mapMetodoPagoToFront(dto.metodo),
    estado: mapEstadoPagoToFront(dto.estado),
    periodoMes: dto.periodoMes || dto.fecha?.slice(0, 7),
  };
}

export function mapPagoFrontToRequestDto(
  pago: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }
) {
  const periodo = pago.periodoMes || pago.fecha?.slice(0, 7) || new Date().toISOString().slice(0, 7);
  return {
    alumnoId: parseNumericId(pago.alumnoId) ?? 1,
    planId: parseNumericId(pago.planId),
    monto: Number(pago.monto),
    metodo: mapMetodoPagoToBack(pago.metodo),
    periodoMes: periodo,
    comprobante: null,
    usuarioApp: pago.usuarioApp?.trim() || null,
    passwordApp: pago.passwordApp?.trim() || null,
  };
}

export function mapObjetivoToFront(obj?: string | null): string {
  switch ((obj || "").toUpperCase()) {
    case "FUERZA":
      return "Fuerza";
    case "DEFINICION":
      return "Definición";
    case "RESISTENCIA":
      return "Resistencia";
    case "REHABILITACION":
      return "Adaptación";
    case "HIPERTROFIA":
    default:
      return "Hipertrofia";
  }
}

export function mapObjetivoToBack(obj?: string | null): string {
  const clean = (obj || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (clean.includes("FUERZA")) return "FUERZA";
  if (clean.includes("DEFINIC")) return "DEFINICION";
  if (clean.includes("RESIST")) return "RESISTENCIA";
  if (clean.includes("ADAPT") || clean.includes("REHAB")) return "REHABILITACION";
  return "HIPERTROFIA";
}

export function mapRutinaDtoToFront(dto: BackendRutinaDto): Rutina {
  const dias: DiaRutina[] = (dto.dias || []).map((d, idxDia) => ({
    id: d.id != null ? String(d.id) : `d-${dto.id}-${idxDia + 1}`,
    nombre: d.nombre,
    ejercicios: (d.ejercicios || []).map((e, idxEj): Ejercicio => ({
      id: e.id != null ? String(e.id) : `e-${dto.id}-${idxDia + 1}-${idxEj + 1}`,
      nombre: e.nombreEjercicio,
      series: Number(e.serie || 3),
      repeticiones: e.repeticiones || "10",
      tipoSerie: e.tipoSerie || "NORMAL",
      descansoSegundos: e.descansoSegundos ? Number(e.descansoSegundos) || 90 : undefined,
      notas: e.notas || undefined,
    })),
  }));

  return {
    id: String(dto.id),
    nombre: dto.nombre,
    descripcion: dto.descripcion || undefined,
    objetivo: mapObjetivoToFront(dto.objetivo),
    esGenerica: dto.esGenerica ?? true,
    dias,
  };
}

export function mapRutinaFrontToRequestDto(rutina: Omit<Rutina, "id"> | Rutina) {
  return {
    nombre: rutina.nombre,
    descripcion: rutina.descripcion || "",
    objetivo: mapObjetivoToBack(rutina.objetivo),
    esGenerica: rutina.esGenerica ?? true,
    dias: (rutina.dias || []).map((d, idxDia) => ({
      id: parseNumericId(d.id),
      nombre: d.nombre,
      orden: idxDia + 1,
      ejercicios: (d.ejercicios || []).map((e, idxEj) => ({
        id: parseNumericId(e.id),
        nombreEjercicio: e.nombre,
        serie: Number(e.series || 3),
        repeticiones: e.repeticiones || "10",
        descansoSegundos: e.descansoSegundos != null ? String(e.descansoSegundos) : "90",
        notas: e.notas || null,
        orden: idxEj + 1,
        tipoSerie: e.tipoSerie || "NORMAL",
        videoTecnicaId: null,
        videoTecnicaTitulo: null,
      })),
      videoIds: [],
    })),
  };
}

export function mapAsistenciaDtoToFront(dto: BackendAsistenciaDto): RegistroAsistencia {
  const horaCorta = (dto.hora || "00:00").slice(0, 5);
  const fechaStr = dto.fecha || new Date().toISOString().slice(0, 10);
  const parsedTime = Date.parse(`${fechaStr}T${horaCorta}:00`);

  return {
    id: String(dto.id),
    alumnoId: dto.alumnoId != null ? String(dto.alumnoId) : "",
    alumnoNombre: dto.nombreAlumno || "Socio",
    alumnoDni: dto.alumnoDni || "",
    fecha: fechaStr,
    hora: horaCorta,
    timestamp: Number.isFinite(parsedTime) ? parsedTime : Date.now(),
    estadoCuenta: dto.estadoCuenta || "AL_DIA",
    planNombre: dto.planNombre || "Pase Libre",
    metodo: dto.metodo || "DNI_TOTEM",
  };
}

const GRUPO_BACK_TO_FRONT: Record<string, VideoTecnica["grupoMuscular"]> = {
  PECHO: "Pecho",
  ESPALDA: "Espalda",
  PIERNAS: "Piernas",
  HOMBROS: "Hombros",
  BRAZOS: "Brazos",
  CORE: "Core",
};

const GRUPO_FRONT_TO_BACK: Record<string, string> = {
  Pecho: "PECHO",
  Espalda: "ESPALDA",
  Piernas: "PIERNAS",
  Hombros: "HOMBROS",
  Brazos: "BRAZOS",
  Core: "CORE",
};

export function mapVideoDtoToFront(dto: BackendVideoTecnicaDto): VideoTecnica {
  const grupoKey = (dto.grupoMuscularVideo || "PECHO").toUpperCase();
  return {
    id: dto.id != null ? String(dto.id) : `v-${Date.now()}`,
    titulo: dto.titulo,
    descripcion: dto.descripcion || undefined,
    grupoMuscular: GRUPO_BACK_TO_FRONT[grupoKey] || "Pecho",
    duracion: dto.duracion || "Loop GIF",
    nivel: dto.nivel || "Intermedio",
    videoUrl: dto.urlVideo || dto.gifUrl || "",
    gifUrl: dto.gifUrl || dto.urlVideo || undefined,
    formato: dto.formato || "GIF",
    equipo: dto.equipo || undefined,
    consejosClave: dto.consejosClave || [],
  };
}

export function mapVideoFrontToDto(video: Omit<VideoTecnica, "id">): BackendVideoTecnicaDto {
  return {
    titulo: video.titulo,
    descripcion: video.descripcion || "",
    grupoMuscularVideo: GRUPO_FRONT_TO_BACK[video.grupoMuscular] || "PECHO",
    nivel: video.nivel,
    duracion: video.duracion,
    urlVideo: video.videoUrl,
    thumbnailUrl: video.gifUrl || video.videoUrl,
    gifUrl: video.gifUrl || video.videoUrl,
    formato: video.formato || "VIDEO",
    equipo: video.equipo || null,
    consejosClave: video.consejosClave || [],
  };
}

export function mapAvisoDtoToFront(dto: BackendAvisoDto, usuarioActualId?: string): Aviso {
  return {
    id: String(dto.id),
    titulo: dto.titulo,
    mensaje: dto.mensaje,
    categoria: dto.categoria || "NOVEDAD",
    fecha: dto.fecha,
    paraTodos: dto.paraTodos,
    alumnoId: dto.alumnoId != null ? String(dto.alumnoId) : undefined,
    leidoPor: dto.leido && usuarioActualId ? [usuarioActualId] : [],
  };
}

export function mapAvisoFrontToRequestDto(aviso: Omit<Aviso, "id" | "leidoPor">) {
  return {
    titulo: aviso.titulo,
    mensaje: aviso.mensaje,
    categoria: aviso.categoria,
    paraTodos: aviso.paraTodos,
    alumnoId: parseNumericId(aviso.alumnoId),
  };
}

export function mapSesionDtoToFront(dto: BackendSesionResponseDto): SesionEntrenamiento {
  return {
    id: String(dto.id),
    alumnoId: String(dto.alumnoId),
    rutinaId: dto.rutinaId != null ? String(dto.rutinaId) : "",
    diaId: dto.diaRutinaId != null ? String(dto.diaRutinaId) : "",
    fecha: dto.fecha,
    ejercicios: (dto.ejercicios || []).map((ej) => ({
      ejercicioId: ej.ejercicioId != null ? String(ej.ejercicioId) : "",
      series: (ej.series || []).map((s) => ({
        serieNumero: s.serieNumero,
        kg: Number(s.kg || 0),
        reps: Number(s.reps || 0),
        completada: s.completada ?? true,
      })),
    })),
  };
}

export function mapSesionFrontToRequestDto(sesion: Omit<SesionEntrenamiento, "id">) {
  return {
    alumnoId: parseNumericId(sesion.alumnoId) ?? 1,
    rutinaId: parseNumericId(sesion.rutinaId),
    diaRutinaId: parseNumericId(sesion.diaId),
    fecha: sesion.fecha,
    duracionMinutos: 60,
    notas: null,
    ejercicios: (sesion.ejercicios || []).map((ej) => ({
      ejercicioId: parseNumericId(ej.ejercicioId),
      nombreEjercicio: null,
      series: (ej.series || []).map((s) => ({
        serieNumero: s.serieNumero,
        kg: s.kg,
        reps: s.reps,
        completada: s.completada,
      })),
    })),
  };
}
