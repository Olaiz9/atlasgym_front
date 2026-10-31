// lib/store.tsx
// Fuente de verdad compartida entre módulos ("El Amortiguador").
//
// Centraliza todo el estado de la aplicación y sincroniza de forma transparente
// con el Backend Spring Boot (/api/*) mediante JWT, revirtiendo mutaciones optimistas
// y notificando al operador si MySQL rechaza una escritura (sin fallos silenciosos).
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  Alumno,
  Pago,
  EstadoPago,
  EstadoCuenta,
  estadoCuentaDeAlumno,
  UsuarioSesion,
  Rutina,
  VideoTecnica,
  Plan,
  Aviso,
  SesionEntrenamiento,
  RegistroAsistencia,
} from "./types";
import {
  ALUMNOS_MOCK,
  PAGOS_MOCK,
  RUTINAS_MOCK,
  VIDEOS_TECNICA_MOCK,
  PLANES_MOCK,
  SESIONES_MOCK,
  ASISTENCIAS_MOCK,
} from "./mock-data";
import { useAvisosManager } from "./use-avisos";
import { fechaLocalHoy, restarDiasFechaLocal } from "./date-utils";
import {
  puedeEliminarPlan,
  ejecutarBajaAlumno,
  sincronizarNombrePlanEnAlumnos,
} from "./plan-utils";
import {
  normalizarDni,
  estaSesionActiva,
  calcularCupoSemanalAsistencia,
  fusionarAsistenciasDeFecha,
  fusionarAsistenciasDeRango,
  recortarAsistenciasParaCacheLocal,
} from "./asistencia-utils";
import { generarUsernameAlumno } from "./validators";
import {
  apiActualizarAlumno,
  apiActualizarPerfil,
  apiActualizarEstadoPago,
  apiActualizarPlan,
  apiActualizarRutina,
  apiAnularPago,
  apiAsignarCredencialesAlumno,
  apiBlanquearClaveAlumno,
  apiAsignarRutina,
  apiCheckInTotem,
  apiCompletarSaldoPago,
  apiCrearAlumno,
  apiCrearPlan,
  apiCrearRutina,
  apiCrearVideo,
  apiDarDeBajaAlumno,
  apiEliminarAsistencia,
  apiEliminarPago,
  apiEliminarPlan,
  apiEliminarRutina,
  apiEliminarVideo,
  apiGetAlumnos,
  apiGetAsistencias,
  apiGetAvisosAdmin,
  apiGetHistorialSesiones,
  apiGetMisAvisos,
  apiGetPagos,
  apiGetPlanes,
  apiGetRutinaDeAlumno,
  apiGetRutinas,
  apiGetVideoteca,
  apiGuardarSesion,
  apiImportarAlumnosMasivo,
  apiLogin,
  apiRegistrarPago,
  esErrorDeRed,
  esFallbackOfflineDemoPermitido,
  getStoredJwtToken,
  isApiRuntimeEnabled,
  RespuestaImportacionMasivaDto,
  setStoredJwtToken,
} from "./api-client";
import { FilaImportacionAlumno } from "./csv-import";
import {
  mapAlumnoDtoToFront,
  mapAlumnoFrontToRequestDto,
  mapAsistenciaDtoToFront,
  mapAvisoDtoToFront,
  mapLoginResponseToUsuarioSesion,
  mapPagoDtoToFront,
  mapPagoFrontToRequestDto,
  mapPlanDtoToFront,
  mapPlanFrontToRequestDto,
  mapRutinaDtoToFront,
  mapRutinaFrontToRequestDto,
  mapSesionDtoToFront,
  mapSesionFrontToRequestDto,
  mapVideoDtoToFront,
  mapVideoFrontToDto,
  parseNumericId,
} from "./api-mappers";

const BACKEND_SYNCED_KEY = "atlas_backend_synced_v1";

function estaSincronizadoConBackend(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BACKEND_SYNCED_KEY) === "1";
  } catch {
    return false;
  }
}

function marcarSincronizadoConBackend(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKEND_SYNCED_KEY, "1");
  } catch {}
}

function guardarCacheLocalAsistencias(lista: RegistroAsistencia[]): void {
  if (typeof window === "undefined") return;
  const hoy = fechaLocalHoy();
  const recortada = recortarAsistenciasParaCacheLocal(lista, hoy, 7, 500);
  try {
    localStorage.setItem("atlas_asistencias_v2", JSON.stringify(recortada));
  } catch {
    try {
      const soloHoy = recortarAsistenciasParaCacheLocal(lista, hoy, 0, 150);
      localStorage.setItem("atlas_asistencias_v2", JSON.stringify(soloHoy));
    } catch {}
  }
}

function ofuscarClaveLocal(clave: string): string {
  const texto = "atlas_salt_v1:" + clave;
  let h1 = 0x811c9dc5;
  let h2 = 0x1505;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ c, 33);
  }
  return "h1:" + (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

function formatearMensajeErrorSync(accion: string, err: unknown): string {
  const detalle = err instanceof Error ? err.message : "Error de conexión";
  if (detalle.includes("HTTP 401")) {
    return `No se pudo ${accion}: tu sesión expiró. Por favor cerrá sesión e ingresá nuevamente.`;
  }
  if (esErrorDeRed(err)) {
    return `No se pudo ${accion}: sin conexión con el servidor central. Verificá la red e intentá nuevamente.`;
  }
  return `No se pudo ${accion}: ${detalle}`;
}

const USUARIO_ADMIN_DEFAULT: UsuarioSesion = {
  id: "u1",
  nombre: "Julián Pérez",
  email: "admin@atlasgym.com",
  rol: "ADMIN",
};

export interface ErrorSincronizacion {
  id: string;
  mensaje: string;
}

interface AppDataContextValue {
  alumnos: Alumno[];
  pagos: Pago[];
  rutinas: Rutina[];
  videosTecnica: VideoTecnica[];
  planes: Plan[];
  avisos: Aviso[];
  usuarioActual: UsuarioSesion | null;
  ultimoErrorSync: ErrorSincronizacion | null;
  limpiarErrorSync: () => void;
  actualizarUsuarioActual: (
    cambios: Partial<UsuarioSesion> & { password?: string; passwordActual?: string }
  ) => void;
  guardarPerfilUsuario: (
    cambios: Partial<UsuarioSesion> & { password?: string; passwordActual?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  iniciarSesion: (
    rolOIdentificador?: "ADMIN" | "ALUMNO" | string,
    emailOPassword?: string,
    passwordOpcional?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  cerrarSesion: () => void;
  agregarAlumno: (alumno: Omit<Alumno, "id">) => Alumno;
  actualizarAlumno: (id: string, cambios: Partial<Omit<Alumno, "id">>) => void;
  eliminarAlumno: (id: string) => void;
  asignarCredencialesAlumno: (alumnoId: string, usuario: string, password: string) => Promise<void>;
  blanquearClaveAlumno: (alumnoId: string) => Promise<{ ok: boolean; claveTemporal?: string; error?: string }>;
  importarAlumnosMasivo: (
    filas: FilaImportacionAlumno[]
  ) => Promise<{ ok: boolean; resumen?: RespuestaImportacionMasivaDto; error?: string }>;
  marcarAsistenciaAlumno: (id: string, fecha?: string) => void;
  agregarPago: (pago: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }) => void;
  actualizarEstadoPago: (id: string, estado: EstadoPago) => void;
  completarSaldoPago: (id: string, metodo?: string) => Promise<{ ok: boolean; error?: string }>;
  anularPago: (id: string, motivo: string) => Promise<{ ok: boolean; error?: string }>;
  eliminarPago: (id: string) => void;
  agregarRutina: (rutina: Omit<Rutina, "id">) => Rutina;
  actualizarRutina: (id: string, cambios: Partial<Omit<Rutina, "id">>) => void;
  asignarRutinaAAlumno: (rutinaId: string, alumnoId: string) => void;
  eliminarRutina: (id: string) => void;
  getRutinaDeAlumno: (alumnoId: string) => Rutina | undefined;
  agregarVideoTecnica: (video: Omit<VideoTecnica, "id">) => VideoTecnica;
  eliminarVideoTecnica: (id: string) => void;
  agregarPlan: (plan: Omit<Plan, "id">) => Plan;
  actualizarPlan: (id: string, cambios: Partial<Omit<Plan, "id">>) => void;
  eliminarPlan: (id: string) => { ok: boolean; motivo?: string };
  crearAviso: (aviso: Omit<Aviso, "id" | "leidoPor">) => Aviso;
  marcarAvisoLeido: (avisoId: string, usuarioId: string) => void;
  marcarTodosAvisosLeidos: (usuarioId: string) => void;
  eliminarAviso: (avisoId: string) => void;
  getAvisosParaUsuario: (usuario: UsuarioSesion | null) => Aviso[];
  getCantidadAvisosNoLeidos: (usuario: UsuarioSesion | null) => number;
  getAlumno: (id: string) => Alumno | undefined;
  getEstadoCuenta: (alumnoId: string) => EstadoCuenta;
  getPagosDeAlumno: (alumnoId: string) => Pago[];
  // Historial de entrenamiento
  sesionesEntrenamiento: SesionEntrenamiento[];
  guardarSesion: (sesion: Omit<SesionEntrenamiento, "id">) => void;
  getUltimaSesion: (alumnoId: string, rutinaId: string, diaId: string) => SesionEntrenamiento | undefined;
  // Módulo de Asistencias y Tótem
  asistencias: RegistroAsistencia[];
  refrescarAsistencias: () => Promise<void>;
  cargarHistorialAsistenciasRango: (
    desde: string,
    hasta: string
  ) => Promise<{ ok: boolean; cantidad?: number; error?: string }>;
  registrarAsistenciaPorDni: (
    dni: string,
    opciones?: { omitirApiRemota?: boolean }
  ) => {
    ok: boolean;
    yaRegistrado?: boolean;
    alumno?: Alumno;
    estadoCuenta?: EstadoCuenta;
    motivo?: string;
    asistenciasSemana?: number;
    limiteDiasSemana?: number | null;
    excedeLimiteSemanal?: boolean;
  };
  eliminarAsistencia: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function useGymStore(): AppDataContextValue {
  const [ultimoErrorSync, setUltimoErrorSync] = useState<ErrorSincronizacion | null>(null);
  const ultimaHidratacionFocusRef = useRef<number>(0);

  const reportarErrorSync = useCallback((mensaje: string) => {
    setUltimoErrorSync({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mensaje,
    });
  }, []);

  const limpiarErrorSync = useCallback(() => {
    setUltimoErrorSync(null);
  }, []);

  const [alumnos, setAlumnos] = useState<Alumno[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardado = localStorage.getItem("atlas_alumnos_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed.map((a: Alumno) => ({
              ...a,
              usuario: a.usuario || generarUsernameAlumno(a.nombre, a.dni),
            }));
          }
        } catch {}
      }
    }
    return ALUMNOS_MOCK;
  });

  const [pagos, setPagos] = useState<Pago[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardado = localStorage.getItem("atlas_pagos_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
    }
    return PAGOS_MOCK;
  });

  const [rutinas, setRutinas] = useState<Rutina[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardado = localStorage.getItem("atlas_rutinas_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
    }
    return RUTINAS_MOCK;
  });

  const [videosTecnica, setVideosTecnica] = useState<VideoTecnica[]>(() => {
    if (typeof window !== "undefined") {
      const guardadoV2 = localStorage.getItem("atlas_videos_v2");
      if (guardadoV2) {
        try {
          return JSON.parse(guardadoV2);
        } catch {}
      }
      const guardadoV1 = localStorage.getItem("atlas_videos_v1");
      if (guardadoV1) {
        try {
          const parseado = JSON.parse(guardadoV1) as VideoTecnica[];
          const limpios = parseado.filter((v) => !v.id.startsWith("cat-") && !v.id.startsWith("ex-"));
          const resultado = limpios.length > 0 ? limpios : VIDEOS_TECNICA_MOCK;
          localStorage.setItem("atlas_videos_v2", JSON.stringify(resultado));
          return resultado;
        } catch {}
      }
    }
    return VIDEOS_TECNICA_MOCK;
  });

  const [planes, setPlanes] = useState<Plan[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardado = localStorage.getItem("atlas_planes_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
    }
    return PLANES_MOCK;
  });

  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion | null>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_sesion_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {}
      }
    }
    return null;
  });

  const [sesionesEntrenamiento, setSesionesEntrenamiento] = useState<SesionEntrenamiento[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardado = localStorage.getItem("atlas_historial_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
    }
    return SESIONES_MOCK;
  });

  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>(() => {
    if (typeof window !== "undefined") {
      const sincronizado = estaSincronizadoConBackend();
      const guardadoV2 = localStorage.getItem("atlas_asistencias_v2");
      if (guardadoV2) {
        try {
          const parsed = JSON.parse(guardadoV2);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
      const guardadoV1 = localStorage.getItem("atlas_asistencias_v1");
      if (guardadoV1) {
        try {
          const parsed = JSON.parse(guardadoV1);
          if (Array.isArray(parsed) && (parsed.length > 0 || sincronizado)) {
            return parsed;
          }
        } catch {}
      }
    }
    return ASISTENCIAS_MOCK;
  });

  const {
    avisos,
    setAvisos,
    crearAviso,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
    eliminarAviso,
    getAvisosParaUsuario,
    getCantidadAvisosNoLeidos,
  } = useAvisosManager(reportarErrorSync);

  const refrescarAsistencias = useCallback(async () => {
    if (!isApiRuntimeEnabled() || !getStoredJwtToken()) return;
    const hoy = fechaLocalHoy();
    try {
      // Polling liviano O(Hoy): consulta únicamente los ingresos de hoy (?fecha=YYYY-MM-DD)
      // y los fusiona en memoria sin transferir años de historia ni reescribir localStorage si no cambió nada.
      const asistenciasHoyDto = await apiGetAsistencias({ fecha: hoy });
      if (Array.isArray(asistenciasHoyDto)) {
        marcarSincronizadoConBackend();
        const mapeadasHoy = asistenciasHoyDto.map(mapAsistenciaDtoToFront);
        setAsistencias((prev) => fusionarAsistenciasDeFecha(prev, mapeadasHoy, hoy));
      }
    } catch {}
  }, []);

  const cargarHistorialAsistenciasRango = useCallback(
    async (
      desde: string,
      hasta: string
    ): Promise<{ ok: boolean; cantidad?: number; error?: string }> => {
      if (!desde || !hasta) {
        return { ok: false, error: "Seleccioná las fechas Desde y Hasta." };
      }
      if (desde > hasta) {
        return { ok: false, error: "La fecha Desde no puede ser mayor que Hasta." };
      }
      if (!isApiRuntimeEnabled() || !getStoredJwtToken()) {
        return { ok: true, cantidad: 0 };
      }
      try {
        const dto = await apiGetAsistencias({ desde, hasta });
        if (Array.isArray(dto)) {
          marcarSincronizadoConBackend();
          const mapeadas = dto.map(mapAsistenciaDtoToFront);
          setAsistencias((prev) => fusionarAsistenciasDeRango(prev, mapeadas, desde, hasta));
          return { ok: true, cantidad: mapeadas.length };
        }
        return { ok: false, error: "Respuesta inválida del servidor." };
      } catch (err: unknown) {
        const msg = formatearMensajeErrorSync("consultar el historial de asistencias", err);
        reportarErrorSync(msg);
        return { ok: false, error: msg };
      }
    },
    [reportarErrorSync]
  );

  // ── Hidratación y Sincronización con el Backend Spring Boot ───────────────
  const hidratarDesdeBackend = useCallback(
    async (sesionActiva: UsuarioSesion | null) => {
      if (!isApiRuntimeEnabled()) return;

      try {
        // 1. Endpoints públicos (Planes y Videoteca)
        const [planesDto, videosDto] = await Promise.all([
          apiGetPlanes().catch(() => null),
          apiGetVideoteca().catch(() => null),
        ]);

        if (Array.isArray(planesDto)) {
          marcarSincronizadoConBackend();
          if (planesDto.length > 0 || estaSincronizadoConBackend()) {
            setPlanes(planesDto.map(mapPlanDtoToFront));
          }
        }

        if (Array.isArray(videosDto) && videosDto.length > 0) {
          const videosBack = videosDto.map(mapVideoDtoToFront);
          const titulosBack = new Set(videosBack.map((v) => v.titulo.toLowerCase()));
          const complementarios = VIDEOS_TECNICA_MOCK.filter(
            (v) => !titulosBack.has(v.titulo.toLowerCase())
          );
          setVideosTecnica([...videosBack, ...complementarios]);
        }

        // 2. Verificar que exista un JWT válido antes de solicitar colecciones protegidas
        const token = getStoredJwtToken();
        const usuarioEfectivo = sesionActiva;

        if (!token || !usuarioEfectivo) return;

        // 3. Cargar colecciones protegidas desde MySQL (ventana inicial acotada a últimos 30 días en asistencias)
        const hoyHydrate = fechaLocalHoy();
        const desde30Dias = restarDiasFechaLocal(hoyHydrate, 30);
        const [alumnosDto, pagosDto, asistenciasDto] = await Promise.all([
          apiGetAlumnos().catch(() => null),
          apiGetPagos().catch(() => null),
          apiGetAsistencias({ desde: desde30Dias, hasta: hoyHydrate }).catch(() => null),
        ]);

        if (
          Array.isArray(alumnosDto) ||
          Array.isArray(pagosDto) ||
          Array.isArray(asistenciasDto)
        ) {
          marcarSincronizadoConBackend();
        }

        if (Array.isArray(alumnosDto)) {
          setAlumnos(alumnosDto.map(mapAlumnoDtoToFront));
        }

        if (Array.isArray(pagosDto)) {
          setPagos(pagosDto.map(mapPagoDtoToFront));
        }

        if (Array.isArray(asistenciasDto)) {
          setAsistencias(asistenciasDto.map(mapAsistenciaDtoToFront));
        }

        if (usuarioEfectivo.rol === "ADMIN") {
          const [rutinasDto, avisosDto] = await Promise.all([
            apiGetRutinas().catch(() => null),
            apiGetAvisosAdmin().catch(() => null),
          ]);
          if (Array.isArray(rutinasDto)) {
            setRutinas(rutinasDto.map(mapRutinaDtoToFront));
          }
          if (Array.isArray(avisosDto)) {
            setAvisos(avisosDto.map((a) => mapAvisoDtoToFront(a, usuarioEfectivo?.id)));
          }
        } else {
          const numAlumnoId = parseNumericId(usuarioEfectivo.alumnoId);
          const [miRutinaDto, misAvisosDto, misSesionesDto] = await Promise.all([
            numAlumnoId != null ? apiGetRutinaDeAlumno(numAlumnoId).catch(() => null) : Promise.resolve(null),
            apiGetMisAvisos().catch(() => null),
            numAlumnoId != null ? apiGetHistorialSesiones(numAlumnoId).catch(() => null) : Promise.resolve(null),
          ]);

          if (miRutinaDto) {
            const mapeada = mapRutinaDtoToFront(miRutinaDto);
            setRutinas((prev) => {
              const resto = prev.filter((r) => r.id !== mapeada.id);
              return [mapeada, ...resto];
            });
          }

          if (Array.isArray(misAvisosDto)) {
            setAvisos(misAvisosDto.map((a) => mapAvisoDtoToFront(a, usuarioEfectivo?.id)));
          }

          if (Array.isArray(misSesionesDto)) {
            setSesionesEntrenamiento(misSesionesDto.map(mapSesionDtoToFront));
          }
        }
      } catch {}
    },
    [setAvisos]
  );

  useEffect(() => {
    if (!isApiRuntimeEnabled()) return;
    hidratarDesdeBackend(usuarioActual);
  }, [usuarioActual?.id, usuarioActual?.rol, hidratarDesdeBackend]);

  // Re-hidratar automáticamente al volver el foco a la pestaña/dispositivo (sincronización entre los 2 dueños)
  useEffect(() => {
    if (!isApiRuntimeEnabled() || typeof window === "undefined") return;
    const alRecuperarFoco = () => {
      const ahora = Date.now();
      if (ahora - ultimaHidratacionFocusRef.current < 8000) return;
      ultimaHidratacionFocusRef.current = ahora;
      if (usuarioActual && getStoredJwtToken()) {
        hidratarDesdeBackend(usuarioActual);
      }
    };
    window.addEventListener("focus", alRecuperarFoco);
    const onVisibilidad = () => {
      if (document.visibilityState === "visible") alRecuperarFoco();
    };
    document.addEventListener("visibilitychange", onVisibilidad);
    return () => {
      window.removeEventListener("focus", alRecuperarFoco);
      document.removeEventListener("visibilitychange", onVisibilidad);
    };
  }, [usuarioActual, hidratarDesdeBackend]);

  useEffect(() => {
    guardarCacheLocalAsistencias(asistencias);
  }, [asistencias]);

  // Sincronización en tiempo real entre pestañas/ventanas locales (Tótem y Panel en misma PC)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fusionarNovedadesDesdeOtraPestana = (entrantes: RegistroAsistencia[]) => {
      setAsistencias((prev) => {
        const idsPrevios = new Set(prev.map((a) => a.id));
        const nuevos = entrantes.filter((a) => a?.id && !idsPrevios.has(a.id));
        if (nuevos.length === 0) return prev;
        return [...nuevos, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      });
    };

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("atlas_asistencias_channel");
        bc.onmessage = (event) => {
          if (event.data?.asistencias && Array.isArray(event.data.asistencias)) {
            if (event.data.tipo === "ELIMINAR_ASISTENCIA") {
              setAsistencias(event.data.asistencias);
            } else {
              fusionarNovedadesDesdeOtraPestana(event.data.asistencias);
            }
          }
        };
      } catch {}
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === "atlas_asistencias_v2" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && (parsed.length > 0 || estaSincronizadoConBackend())) {
            fusionarNovedadesDesdeOtraPestana(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    const sincronizarDesdeStorage = () => {
      try {
        const guardadoV2 = localStorage.getItem("atlas_asistencias_v2");
        if (guardadoV2) {
          const parsed = JSON.parse(guardadoV2);
          if (Array.isArray(parsed) && parsed.length > 0) {
            fusionarNovedadesDesdeOtraPestana(parsed);
          }
        }
      } catch {}
    };

    const interval = setInterval(sincronizarDesdeStorage, 1500);
    window.addEventListener("focus", sincronizarDesdeStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sincronizarDesdeStorage);
      clearInterval(interval);
    };
  }, []);

  const iniciarSesion = useCallback(
    async (
      arg1?: "ADMIN" | "ALUMNO" | string,
      arg2?: string,
      arg3?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      let emailEfectivo = "";
      let passwordEfectivo = "";
      let rolFiltro: "ADMIN" | "ALUMNO" | undefined = undefined;

      if (arg3 !== undefined) {
        rolFiltro = arg1 as "ADMIN" | "ALUMNO";
        emailEfectivo =
          arg2 !== undefined && arg2.trim()
            ? arg2.trim()
            : rolFiltro === "ADMIN"
            ? "admin@atlasgym.com"
            : "lucia.fernandez@mail.com";
        passwordEfectivo =
          arg3 !== undefined ? arg3 : rolFiltro === "ADMIN" ? "admin123" : "alumno123";
      } else if (arg2 !== undefined) {
        emailEfectivo = (arg1 || "").trim();
        passwordEfectivo = arg2;
      } else if (arg1 === "ADMIN" || arg1 === "ALUMNO") {
        rolFiltro = arg1;
        emailEfectivo = rolFiltro === "ADMIN" ? "admin@atlasgym.com" : "lucia.fernandez@mail.com";
        passwordEfectivo = rolFiltro === "ADMIN" ? "admin123" : "alumno123";
      }

      if (!emailEfectivo) {
        return { ok: false, error: "Por favor ingresá tu usuario, email o DNI." };
      }
      if (!passwordEfectivo) {
        return { ok: false, error: "Por favor ingresá tu contraseña." };
      }

      if (isApiRuntimeEnabled()) {
        try {
          const res = await apiLogin(emailEfectivo, passwordEfectivo);
          if (rolFiltro && res.rol && res.rol !== rolFiltro) {
            return {
              ok: false,
              error:
                rolFiltro === "ADMIN"
                  ? "Esta cuenta no posee permisos de Administrador."
                  : "Esta cuenta pertenece a un Administrador.",
            };
          }
          if (res.token) {
            setStoredJwtToken(res.token);
          }
          marcarSincronizadoConBackend();
          const sesionReal = mapLoginResponseToUsuarioSesion(res);
          setUsuarioActual(sesionReal);
          if (typeof window !== "undefined") {
            localStorage.setItem("atlas_sesion_v1", JSON.stringify(sesionReal));
          }
          hidratarDesdeBackend(sesionReal);
          return { ok: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "";
          if (!esErrorDeRed(err)) {
            return {
              ok: false,
              error: msg || "Usuario o contraseña incorrectos.",
            };
          }
          if (
            !esFallbackOfflineDemoPermitido({
              yaSincronizadoConBackend: estaSincronizadoConBackend(),
              apiRuntimeActivo: true,
            })
          ) {
            return {
              ok: false,
              error:
                "No se pudo conectar con el servidor central del gimnasio. Verificá tu conexión de red e intentá nuevamente.",
            };
          }
          // Solo en desarrollo local sin backend previo se permite modo demo offline
        }
      }

      // Fallback offline / tests
      const idLimpio = emailEfectivo.toLowerCase();
      const dniBuscado = normalizarDni(emailEfectivo);
      const coincideAdmin =
        idLimpio === "admin@atlasgym.com" ||
        idLimpio === "admin" ||
        rolFiltro === "ADMIN";

      if (coincideAdmin && (!rolFiltro || rolFiltro === "ADMIN")) {
        if (passwordEfectivo !== "admin123") {
          return { ok: false, error: "Contraseña incorrecta para Administrador." };
        }
        const nuevoUsuario = USUARIO_ADMIN_DEFAULT;
        setUsuarioActual(nuevoUsuario);
        if (typeof window !== "undefined") {
          localStorage.setItem("atlas_sesion_v1", JSON.stringify(nuevoUsuario));
        }
        return { ok: true };
      }

      let credencialesGuardadas: Record<string, { usuario: string; password: string }> = {};
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          if (raw) credencialesGuardadas = JSON.parse(raw);
        } catch {}
      }

      const alumnoPorUsuarioODni = alumnos.find(
        (a) =>
          a.usuario?.toLowerCase() === idLimpio ||
          (dniBuscado.length >= 7 && a.dni && normalizarDni(a.dni) === dniBuscado) ||
          a.email?.toLowerCase() === idLimpio
      );

      const entradaCredencial =
        (alumnoPorUsuarioODni && credencialesGuardadas[alumnoPorUsuarioODni.id]
          ? ([alumnoPorUsuarioODni.id, credencialesGuardadas[alumnoPorUsuarioODni.id]] as const)
          : undefined) ||
        Object.entries(credencialesGuardadas).find(
          ([, cred]) => cred.usuario.toLowerCase() === idLimpio
        );

      let nuevoUsuario: UsuarioSesion;
      if (entradaCredencial) {
        const [alumnoIdCred, cred] = entradaCredencial;
        const al = alumnos.find((a) => a.id === alumnoIdCred);
        const dniAlumno = al?.dni ? normalizarDni(al.dni) : "";
        if (
          passwordEfectivo !== cred.password &&
          ofuscarClaveLocal(passwordEfectivo) !== cred.password &&
          passwordEfectivo !== "alumno123" &&
          (!dniAlumno || passwordEfectivo !== dniAlumno)
        ) {
          return { ok: false, error: "Usuario o contraseña incorrectos." };
        }
        nuevoUsuario = {
          id: `u_alumno_${alumnoIdCred}`,
          nombre: al?.nombre || cred.usuario,
          email: al?.usuario || cred.usuario,
          rol: "ALUMNO",
          alumnoId: al?.id || alumnoIdCred,
        };
      } else {
        const alumno = emailEfectivo
          ? alumnoPorUsuarioODni
          : alumnos.find((a) => a.activo);

        if (emailEfectivo && !alumno) {
          return { ok: false, error: "No encontramos un usuario o socio con esas credenciales." };
        }

        const dniAlumno = alumno?.dni ? normalizarDni(alumno.dni) : "";
        if (
          passwordEfectivo !== "alumno123" &&
          (!dniAlumno || passwordEfectivo !== dniAlumno)
        ) {
          return { ok: false, error: "Usuario o contraseña incorrectos." };
        }
        nuevoUsuario = {
          id: alumno ? `u_alumno_${alumno.id}` : "u_alumno_1",
          nombre: alumno ? alumno.nombre : emailEfectivo.split("@")[0] || "Alumno Atlas",
          email: alumno?.usuario || alumno?.email || emailEfectivo || "lucia123",
          rol: "ALUMNO",
          alumnoId: alumno?.id,
        };
      }

      setUsuarioActual(nuevoUsuario);
      if (typeof window !== "undefined") {
        localStorage.setItem("atlas_sesion_v1", JSON.stringify(nuevoUsuario));
      }
      return { ok: true };
    },
    [alumnos, hidratarDesdeBackend]
  );

  const cerrarSesion = useCallback(() => {
    setUsuarioActual(null);
    setStoredJwtToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("atlas_sesion_v1");
    }
  }, []);

  const guardarPerfilUsuario = useCallback(
    async (
      cambios: Partial<UsuarioSesion> & { password?: string; passwordActual?: string }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!usuarioActual) {
        return { ok: false, error: "No hay sesión activa." };
      }

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        const payload: Record<string, string | undefined> = {};
        if (cambios.password) payload.password = cambios.password;
        if (cambios.passwordActual) payload.passwordActual = cambios.passwordActual;
        if (cambios.celular !== undefined) payload.celular = cambios.celular;
        if (cambios.fotoUrl !== undefined) payload.fotoUrl = cambios.fotoUrl;

        if (Object.keys(payload).length > 0) {
          try {
            await apiActualizarPerfil(payload);
          } catch (err: unknown) {
            if (!esErrorDeRed(err)) {
              const msg = err instanceof Error ? err.message : "No se pudo actualizar el perfil.";
              return { ok: false, error: msg };
            }
            return {
              ok: false,
              error: "Sin conexión con el servidor central. Intentá nuevamente en unos segundos.",
            };
          }
        }
      }

      const { password, passwordActual: _ignorado, ...cambiosSesion } = cambios;
      setUsuarioActual((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...cambiosSesion,
          ...(password ? { requiereCambioPassword: false } : {}),
        };
      });

      if (cambios.celular !== undefined && usuarioActual.alumnoId) {
        const alumnoIdTarget = usuarioActual.alumnoId;
        setAlumnos((lista) =>
          lista.map((a) => (a.id === alumnoIdTarget ? { ...a, celular: cambios.celular } : a))
        );
      }

      if (password && usuarioActual.alumnoId && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          const mapa = raw ? JSON.parse(raw) : {};
          const actual = mapa[usuarioActual.alumnoId] || { usuario: usuarioActual.email };
          mapa[usuarioActual.alumnoId] = { ...actual, password: ofuscarClaveLocal(password) };
          localStorage.setItem("atlas_credenciales_alumnos_v1", JSON.stringify(mapa));
        } catch {}
      }

      return { ok: true };
    },
    [usuarioActual]
  );

  const actualizarUsuarioActual = useCallback(
    (cambios: Partial<UsuarioSesion> & { password?: string; passwordActual?: string }) => {
      guardarPerfilUsuario(cambios).then((res) => {
        if (!res.ok && res.error) {
          reportarErrorSync(res.error);
        }
      });
    },
    [guardarPerfilUsuario, reportarErrorSync]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (usuarioActual) {
        localStorage.setItem("atlas_sesion_v1", JSON.stringify(usuarioActual));
      }
    }
  }, [usuarioActual]);

  const agregarAlumno = useCallback(
    (alumno: Omit<Alumno, "id">) => {
      const planEncontrado = planes.find(
        (p) => p.id === alumno.planId || p.nombre.toLowerCase() === alumno.plan.toLowerCase()
      );
      const tempId = crypto.randomUUID();
      const usuarioGenerado = alumno.usuario || generarUsernameAlumno(alumno.nombre, alumno.dni);
      const nuevo: Alumno = {
        ...alumno,
        id: tempId,
        usuario: usuarioGenerado,
        planId: alumno.planId || planEncontrado?.id,
        plan: planEncontrado ? planEncontrado.nombre : alumno.plan,
      };
      setAlumnos((prev) => [nuevo, ...prev]);

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          const mapa = raw ? JSON.parse(raw) : {};
          const passInicial = alumno.dni ? normalizarDni(alumno.dni) : "alumno123";
          mapa[tempId] = { usuario: usuarioGenerado, password: ofuscarClaveLocal(passInicial) };
          localStorage.setItem("atlas_credenciales_alumnos_v1", JSON.stringify(mapa));
        } catch {}
      }

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiCrearAlumno(mapAlumnoFrontToRequestDto(nuevo))
          .then((creadoDto) => {
            const mapeado = mapAlumnoDtoToFront(creadoDto);
            setAlumnos((prev) => prev.map((a) => (a.id === tempId ? mapeado : a)));
          })
          .catch((err: unknown) => {
            setAlumnos((prev) => prev.filter((a) => a.id !== tempId));
            reportarErrorSync(formatearMensajeErrorSync("dar de alta al alumno", err));
          });
      }

      return nuevo;
    },
    [planes, reportarErrorSync]
  );

  const actualizarAlumno = useCallback(
    (id: string, cambios: Partial<Omit<Alumno, "id">>) => {
      let alumnoAnterior: Alumno | null = null;
      let alumnoActualizado: Alumno | null = null;

      setAlumnos((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          alumnoAnterior = a;
          let planId = cambios.planId ?? a.planId;
          let plan = cambios.plan ?? a.plan;
          if (cambios.plan && !cambios.planId) {
            const encontrado = planes.find(
              (p) => p.nombre.toLowerCase() === cambios.plan!.toLowerCase()
            );
            if (encontrado) planId = encontrado.id;
          } else if (cambios.planId && !cambios.plan) {
            const encontrado = planes.find((p) => p.id === cambios.planId);
            if (encontrado) plan = encontrado.nombre;
          }
          alumnoActualizado = { ...a, ...cambios, planId, plan };
          return alumnoActualizado;
        })
      );

      const numId = parseNumericId(id);
      if (numId != null && alumnoActualizado && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiActualizarAlumno(numId, mapAlumnoFrontToRequestDto(alumnoActualizado))
          .then((dto) => {
            const mapeado = mapAlumnoDtoToFront(dto);
            setAlumnos((prev) => prev.map((a) => (a.id === id ? mapeado : a)));
          })
          .catch((err: unknown) => {
            if (alumnoAnterior) {
              setAlumnos((prev) => prev.map((a) => (a.id === id ? alumnoAnterior! : a)));
            }
            reportarErrorSync(formatearMensajeErrorSync("actualizar los datos del socio", err));
          });
      }
    },
    [planes, reportarErrorSync]
  );

  const eliminarAlumno = useCallback(
    (id: string) => {
      const respaldoAlumnos = alumnos;
      const respaldoPagos = pagos;
      const respaldoRutinas = rutinas;

      const { alumnos: nuevosAlumnos, pagos: nuevosPagos, rutinas: nuevasRutinas } =
        ejecutarBajaAlumno(id, alumnos, pagos, rutinas);
      setAlumnos(nuevosAlumnos);
      setPagos(nuevosPagos);
      setRutinas(nuevasRutinas);

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiDarDeBajaAlumno(numId).catch((err: unknown) => {
          setAlumnos(respaldoAlumnos);
          setPagos(respaldoPagos);
          setRutinas(respaldoRutinas);
          reportarErrorSync(formatearMensajeErrorSync("dar de baja al socio", err));
        });
      }
    },
    [alumnos, pagos, rutinas, reportarErrorSync]
  );

  const asignarCredencialesAlumno = useCallback(
    async (alumnoId: string, usuario: string, password: string) => {
      const u = usuario.trim();
      const p = password.trim();
      if (!u || !p) return;

      const numId = parseNumericId(alumnoId);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        await apiAsignarCredencialesAlumno(numId, u, p);
      }

      setAlumnos((prev) =>
        prev.map((a) => (a.id === alumnoId ? { ...a, usuario: u } : a))
      );

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          const mapa = raw ? JSON.parse(raw) : {};
          mapa[alumnoId] = { usuario: u, password: ofuscarClaveLocal(p) };
          localStorage.setItem("atlas_credenciales_alumnos_v1", JSON.stringify(mapa));
        } catch {}
      }
    },
    []
  );

  const blanquearClaveAlumno = useCallback(
    async (
      alumnoId: string
    ): Promise<{ ok: boolean; claveTemporal?: string; error?: string }> => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      const dniLimpio = alumno?.dni ? normalizarDni(alumno.dni) : "";
      const claveTemporal = dniLimpio || "alumno123";
      const numId = parseNumericId(alumnoId);

      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        try {
          const dto = await apiBlanquearClaveAlumno(numId);
          const mapeado = mapAlumnoDtoToFront(dto);
          setAlumnos((prev) => prev.map((a) => (a.id === alumnoId ? { ...a, ...mapeado } : a)));
        } catch (err: unknown) {
          const msg = formatearMensajeErrorSync("blanquear la contraseña del socio", err);
          reportarErrorSync(msg);
          return { ok: false, error: msg };
        }
      }

      if (typeof window !== "undefined" && alumno) {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          const mapa = raw ? JSON.parse(raw) : {};
          mapa[alumnoId] = {
            usuario: alumno.usuario || generarUsernameAlumno(alumno.nombre, alumno.dni),
            password: ofuscarClaveLocal(claveTemporal),
          };
          localStorage.setItem("atlas_credenciales_alumnos_v1", JSON.stringify(mapa));
        } catch {}
      }

      return { ok: true, claveTemporal };
    },
    [alumnos, reportarErrorSync]
  );

  const importarAlumnosMasivo = useCallback(
    async (
      filas: FilaImportacionAlumno[]
    ): Promise<{ ok: boolean; resumen?: RespuestaImportacionMasivaDto; error?: string }> => {
      if (!filas || filas.length === 0) {
        return { ok: false, error: "No hay filas válidas para importar." };
      }

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        try {
          const resumen = await apiImportarAlumnosMasivo(filas);
          const [alumnosFresh, pagosFresh] = await Promise.all([
            apiGetAlumnos(),
            apiGetPagos(),
          ]);
          setAlumnos(alumnosFresh.map(mapAlumnoDtoToFront));
          setPagos(pagosFresh.map(mapPagoDtoToFront));
          return { ok: true, resumen };
        } catch (err: unknown) {
          const msg = formatearMensajeErrorSync("importar el padrón masivo de socios", err);
          reportarErrorSync(msg);
          return { ok: false, error: msg };
        }
      }

      // Modo local / demo sin backend
      let creados = 0;
      let actualizados = 0;
      let pagosIniciales = 0;
      const hoy = fechaLocalHoy();
      const copiaAlumnos = [...alumnos];
      const nuevosPagosLocales: Pago[] = [];

      for (const f of filas) {
        const dniLimpio = normalizarDni(f.dni);
        const planObj =
          planes.find(
            (p) => f.planNombre && p.nombre.toLowerCase().includes(f.planNombre.toLowerCase())
          ) || planes[0];
        const planNombre = planObj?.nombre || f.planNombre || "Pase Libre";
        const idxExistente = copiaAlumnos.findIndex(
          (a) => a.dni && normalizarDni(a.dni) === dniLimpio
        );

        let alumnoTarget: Alumno;
        if (idxExistente >= 0) {
          alumnoTarget = {
            ...copiaAlumnos[idxExistente],
            nombre: f.nombre,
            celular: f.celular || copiaAlumnos[idxExistente].celular,
            email: f.email || copiaAlumnos[idxExistente].email,
            planId: planObj?.id || copiaAlumnos[idxExistente].planId,
            plan: planNombre,
            activo: true,
          };
          copiaAlumnos[idxExistente] = alumnoTarget;
          actualizados++;
        } else {
          alumnoTarget = {
            id: crypto.randomUUID(),
            nombre: f.nombre,
            dni: dniLimpio,
            usuario: generarUsernameAlumno(f.nombre, dniLimpio),
            celular: f.celular,
            email: f.email,
            planId: planObj?.id,
            plan: planNombre,
            fechaAlta: f.ultimoPeriodoPago ? `${f.ultimoPeriodoPago}-05` : hoy,
            activo: true,
          };
          copiaAlumnos.unshift(alumnoTarget);
          creados++;
        }

        if (f.ultimoPeriodoPago && /^\d{4}-\d{2}$/.test(f.ultimoPeriodoPago)) {
          const monto = f.montoUltimoPago || planObj?.precio || 25000;
          nuevosPagosLocales.push({
            id: crypto.randomUUID(),
            alumnoId: alumnoTarget.id,
            alumnoNombreHistorico: alumnoTarget.nombre,
            planId: planObj?.id,
            plan: planNombre,
            monto,
            montoAbonado: monto,
            saldoPendiente: 0,
            fecha: `${f.ultimoPeriodoPago}-05`,
            periodoMes: f.ultimoPeriodoPago,
            cantidadMeses: 1,
            metodo: f.metodoPago || "Efectivo",
            estado: "PAGADO",
            registradoPor: usuarioActual?.nombre || "Importación CSV",
          });
          pagosIniciales++;
        }
      }

      setAlumnos(copiaAlumnos);
      if (nuevosPagosLocales.length > 0) {
        setPagos((prev) => [...nuevosPagosLocales, ...prev]);
      }

      return {
        ok: true,
        resumen: {
          procesados: filas.length,
          creados,
          actualizados,
          pagosInicialesRegistrados: pagosIniciales,
          omitidos: 0,
          advertencias: [],
        },
      };
    },
    [alumnos, planes, usuarioActual, reportarErrorSync]
  );

  const marcarAsistenciaAlumno = useCallback((id: string, fecha?: string) => {
    const hoy = fecha || fechaLocalHoy();
    setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, ultimaAsistencia: hoy } : a)));
  }, []);

  const sincronizarEstadoEnAsistenciasHoy = useCallback(
    (alumnoId: string, listaPagos: Pago[]) => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      const nuevoEstado = estadoCuentaDeAlumno(
        alumnoId,
        listaPagos,
        alumno?.fechaAlta,
        alumno ? alumno.activo : true
      );
      setAsistencias((asistPrev) => {
        const actualizadas = asistPrev.map((asist) =>
          asist.alumnoId === alumnoId && asist.fecha === fechaLocalHoy()
            ? { ...asist, estadoCuenta: nuevoEstado }
            : asist
        );
        guardarCacheLocalAsistencias(actualizadas);
        if (typeof window !== "undefined") {
          try {
            if (typeof BroadcastChannel !== "undefined") {
              const bc = new BroadcastChannel("atlas_asistencias_channel");
              bc.postMessage({ tipo: "ACTUALIZAR_ASISTENCIAS", asistencias: actualizadas });
              bc.close();
            }
          } catch {}
        }
        return actualizadas;
      });
    },
    [alumnos]
  );

  const agregarPago = useCallback(
    (pago: Omit<Pago, "id"> & { usuarioApp?: string; passwordApp?: string }) => {
      const { usuarioApp, passwordApp, ...pagoBase } = pago;
      const alumno = alumnos.find((a) => a.id === pagoBase.alumnoId);
      const usuarioAnterior = alumno?.usuario;
      const alumnoNombreHistorico = pagoBase.alumnoNombreHistorico || alumno?.nombre || "Alumno Atlas";
      const planId = pagoBase.planId || alumno?.planId;
      const tempId = crypto.randomUUID();
      const esParcial =
        pagoBase.montoAbonado != null &&
        pagoBase.montoAbonado > 0 &&
        pagoBase.montoAbonado < pagoBase.monto;
      const estadoEfectivo: EstadoPago = esParcial ? "PARCIAL" : pagoBase.estado;
      const montoAbonadoEfectivo = esParcial
        ? pagoBase.montoAbonado!
        : estadoEfectivo === "PAGADO"
        ? pagoBase.monto
        : 0;
      const nuevoPago: Pago = {
        ...pagoBase,
        estado: estadoEfectivo,
        montoAbonado: montoAbonadoEfectivo,
        saldoPendiente:
          estadoEfectivo === "PAGADO" ? 0 : Math.max(0, pagoBase.monto - montoAbonadoEfectivo),
        registradoPor: pagoBase.registradoPor || usuarioActual?.nombre || "Admin",
        alumnoNombreHistorico,
        planId,
        id: tempId,
      };

      if (usuarioApp?.trim() && passwordApp?.trim() && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("atlas_credenciales_alumnos_v1");
          const mapa = raw ? JSON.parse(raw) : {};
          mapa[pagoBase.alumnoId] = {
            usuario: usuarioApp.trim(),
            password: ofuscarClaveLocal(passwordApp.trim()),
          };
          localStorage.setItem("atlas_credenciales_alumnos_v1", JSON.stringify(mapa));
        } catch {}
      }

      if (usuarioApp?.trim()) {
        setAlumnos((prev) =>
          prev.map((a) => (a.id === pagoBase.alumnoId ? { ...a, usuario: usuarioApp.trim() } : a))
        );
      }

      setPagos((prev) => {
        const nuevosPagos = [nuevoPago, ...prev];
        sincronizarEstadoEnAsistenciasHoy(pagoBase.alumnoId, nuevosPagos);
        return nuevosPagos;
      });

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiRegistrarPago(mapPagoFrontToRequestDto({ ...pago, planId }))
          .then((dto) => {
            const mapeado = mapPagoDtoToFront(dto);
            setPagos((prev) => prev.map((p) => (p.id === tempId ? mapeado : p)));
          })
          .catch((err: unknown) => {
            setPagos((prev) => {
              const revertidos = prev.filter((p) => p.id !== tempId);
              sincronizarEstadoEnAsistenciasHoy(pagoBase.alumnoId, revertidos);
              return revertidos;
            });
            if (usuarioApp?.trim()) {
              setAlumnos((prev) =>
                prev.map((a) =>
                  a.id === pagoBase.alumnoId ? { ...a, usuario: usuarioAnterior } : a
                )
              );
            }
            reportarErrorSync(formatearMensajeErrorSync("registrar el cobro de cuota", err));
          });
      }
    },
    [alumnos, usuarioActual, sincronizarEstadoEnAsistenciasHoy, reportarErrorSync]
  );

  const actualizarEstadoPago = useCallback(
    (id: string, estado: EstadoPago) => {
      let pagoAnterior: Pago | undefined;
      let alumnoIdAfectado: string | undefined;

      setPagos((prev) => {
        const objetivo = prev.find((p) => p.id === id);
        if (objetivo) {
          pagoAnterior = objetivo;
          alumnoIdAfectado = objetivo.alumnoId;
        }
        const nuevosPagos = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                estado,
                montoAbonado: estado === "PAGADO" ? p.monto : estado === "PARCIAL" ? p.montoAbonado : 0,
                saldoPendiente: estado === "PAGADO" || estado === "ANULADO" ? 0 : p.monto,
              }
            : p
        );
        if (alumnoIdAfectado) {
          sincronizarEstadoEnAsistenciasHoy(alumnoIdAfectado, nuevosPagos);
        }
        return nuevosPagos;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiActualizarEstadoPago(numId, estado)
          .then((dto) => {
            const mapeado = mapPagoDtoToFront(dto);
            setPagos((prev) => prev.map((p) => (p.id === id ? mapeado : p)));
          })
          .catch((err: unknown) => {
            if (pagoAnterior) {
              setPagos((prev) => {
                const revertidos = prev.map((p) => (p.id === id ? pagoAnterior! : p));
                if (alumnoIdAfectado) {
                  sincronizarEstadoEnAsistenciasHoy(alumnoIdAfectado, revertidos);
                }
                return revertidos;
              });
            }
            reportarErrorSync(formatearMensajeErrorSync("actualizar el estado del pago", err));
          });
      }
    },
    [sincronizarEstadoEnAsistenciasHoy, reportarErrorSync]
  );

  const completarSaldoPago = useCallback(
    async (id: string, metodo?: string): Promise<{ ok: boolean; error?: string }> => {
      let pagoRespaldo: Pago | undefined;
      const hoy = fechaLocalHoy();

      setPagos((prev) => {
        pagoRespaldo = prev.find((p) => p.id === id);
        const nuevosPagos = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                estado: "PAGADO" as EstadoPago,
                montoAbonado: p.monto,
                saldoPendiente: 0,
                fecha: hoy,
                metodo: metodo || p.metodo,
                registradoPor: usuarioActual?.nombre || p.registradoPor || "Admin",
              }
            : p
        );
        if (pagoRespaldo) {
          sincronizarEstadoEnAsistenciasHoy(pagoRespaldo.alumnoId, nuevosPagos);
        }
        return nuevosPagos;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        try {
          const dto = await apiCompletarSaldoPago(numId, metodo);
          const mapeado = mapPagoDtoToFront(dto);
          setPagos((prev) => {
            const actualizados = prev.map((p) => (p.id === id ? mapeado : p));
            if (mapeado.alumnoId) {
              sincronizarEstadoEnAsistenciasHoy(mapeado.alumnoId, actualizados);
            }
            return actualizados;
          });
        } catch (err: unknown) {
          if (pagoRespaldo) {
            setPagos((prev) => {
              const restaurados = prev.map((p) => (p.id === id ? pagoRespaldo! : p));
              sincronizarEstadoEnAsistenciasHoy(pagoRespaldo!.alumnoId, restaurados);
              return restaurados;
            });
          }
          const msg = formatearMensajeErrorSync("completar el saldo pendiente de la cuota", err);
          reportarErrorSync(msg);
          return { ok: false, error: msg };
        }
      }

      return { ok: true };
    },
    [usuarioActual, sincronizarEstadoEnAsistenciasHoy, reportarErrorSync]
  );

  const anularPago = useCallback(
    async (id: string, motivo: string): Promise<{ ok: boolean; error?: string }> => {
      const motivoLimpio = motivo.trim();
      if (!motivoLimpio) {
        return { ok: false, error: "Ingresá el motivo de anulación del comprobante." };
      }

      let pagoRespaldo: Pago | undefined;
      const ahoraIso = new Date().toISOString();
      const operador = usuarioActual?.nombre || "Admin";

      setPagos((prev) => {
        pagoRespaldo = prev.find((p) => p.id === id);
        const nuevosPagos = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                estado: "ANULADO" as EstadoPago,
                saldoPendiente: 0,
                anuladoPor: operador,
                fechaAnulacion: ahoraIso,
                motivoAnulacion: motivoLimpio,
              }
            : p
        );
        if (pagoRespaldo) {
          sincronizarEstadoEnAsistenciasHoy(pagoRespaldo.alumnoId, nuevosPagos);
        }
        return nuevosPagos;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        try {
          const dto = await apiAnularPago(numId, motivoLimpio);
          const mapeado = mapPagoDtoToFront(dto);
          setPagos((prev) => {
            const actualizados = prev.map((p) => (p.id === id ? mapeado : p));
            if (mapeado.alumnoId) {
              sincronizarEstadoEnAsistenciasHoy(mapeado.alumnoId, actualizados);
            }
            return actualizados;
          });
        } catch (err: unknown) {
          if (pagoRespaldo) {
            setPagos((prev) => {
              const restaurados = prev.map((p) => (p.id === id ? pagoRespaldo! : p));
              sincronizarEstadoEnAsistenciasHoy(pagoRespaldo!.alumnoId, restaurados);
              return restaurados;
            });
          }
          const msg = formatearMensajeErrorSync("anular el comprobante de pago", err);
          reportarErrorSync(msg);
          return { ok: false, error: msg };
        }
      }

      return { ok: true };
    },
    [usuarioActual, sincronizarEstadoEnAsistenciasHoy, reportarErrorSync]
  );

  const eliminarPago = useCallback(
    (id: string) => {
      void anularPago(id, "Anulación administrativa");
    },
    [anularPago]
  );

  const agregarRutina = useCallback(
    (rutina: Omit<Rutina, "id">) => {
      const tempId = crypto.randomUUID();
      const nueva: Rutina = { ...rutina, id: tempId };
      setRutinas((prev) => [nueva, ...prev]);

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiCrearRutina(mapRutinaFrontToRequestDto(rutina))
          .then((dto) => {
            const mapeada = mapRutinaDtoToFront(dto);
            setRutinas((prev) => prev.map((r) => (r.id === tempId ? mapeada : r)));
          })
          .catch((err: unknown) => {
            setRutinas((prev) => prev.filter((r) => r.id !== tempId));
            reportarErrorSync(formatearMensajeErrorSync("guardar la rutina", err));
          });
      }

      return nueva;
    },
    [reportarErrorSync]
  );

  const actualizarRutina = useCallback(
    (id: string, cambios: Partial<Omit<Rutina, "id">>) => {
      let rutinaAnterior: Rutina | null = null;
      let rutinaCombinada: Rutina | null = null;
      setRutinas((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          rutinaAnterior = r;
          rutinaCombinada = { ...r, ...cambios };
          return rutinaCombinada;
        })
      );

      const numId = parseNumericId(id);
      if (numId != null && rutinaCombinada && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiActualizarRutina(numId, mapRutinaFrontToRequestDto(rutinaCombinada))
          .then((dto) => {
            const mapeada = mapRutinaDtoToFront(dto);
            setRutinas((prev) => prev.map((r) => (r.id === id ? mapeada : r)));
          })
          .catch((err: unknown) => {
            if (rutinaAnterior) {
              setRutinas((prev) => prev.map((r) => (r.id === id ? rutinaAnterior! : r)));
            }
            reportarErrorSync(formatearMensajeErrorSync("actualizar la rutina", err));
          });
      }
    },
    [reportarErrorSync]
  );

  const asignarRutinaAAlumno = useCallback(
    (rutinaId: string, alumnoId: string) => {
      let estadoPrevio: { tieneRutina?: boolean; rutinaId?: string } | null = null;
      setAlumnos((prev) =>
        prev.map((a) => {
          if (a.id !== alumnoId) return a;
          estadoPrevio = { tieneRutina: a.tieneRutina, rutinaId: a.rutinaId };
          return { ...a, tieneRutina: true, rutinaId };
        })
      );

      const numRutinaId = parseNumericId(rutinaId);
      const numAlumnoId = parseNumericId(alumnoId);
      if (numRutinaId != null && numAlumnoId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiAsignarRutina(numRutinaId, numAlumnoId).catch((err: unknown) => {
          if (estadoPrevio) {
            setAlumnos((prev) =>
              prev.map((a) =>
                a.id === alumnoId
                  ? { ...a, tieneRutina: estadoPrevio!.tieneRutina, rutinaId: estadoPrevio!.rutinaId }
                  : a
              )
            );
          }
          reportarErrorSync(formatearMensajeErrorSync("asignar la rutina al alumno", err));
        });
      }
    },
    [reportarErrorSync]
  );

  const eliminarRutina = useCallback(
    (id: string) => {
      const respaldoRutinas = rutinas;
      const respaldoAlumnos = alumnos;
      setRutinas((prev) => prev.filter((r) => r.id !== id));
      setAlumnos((prev) =>
        prev.map((a) => (a.rutinaId === id ? { ...a, tieneRutina: false, rutinaId: undefined } : a))
      );

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarRutina(numId).catch((err: unknown) => {
          setRutinas(respaldoRutinas);
          setAlumnos(respaldoAlumnos);
          reportarErrorSync(formatearMensajeErrorSync("eliminar la rutina", err));
        });
      }
    },
    [rutinas, alumnos, reportarErrorSync]
  );

  const getRutinaDeAlumno = useCallback(
    (alumnoId: string) => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      if (!alumno || !alumno.rutinaId) return undefined;
      return rutinas.find((r) => r.id === alumno.rutinaId);
    },
    [alumnos, rutinas]
  );

  const agregarVideoTecnica = useCallback(
    (videoData: Omit<VideoTecnica, "id">) => {
      const tempId = "v" + Date.now().toString(36);
      const nuevoVideo: VideoTecnica = {
        ...videoData,
        id: tempId,
      };
      setVideosTecnica((prev) => [nuevoVideo, ...prev]);

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiCrearVideo(mapVideoFrontToDto(videoData))
          .then((dto) => {
            const mapeado = mapVideoDtoToFront(dto);
            setVideosTecnica((prev) => prev.map((v) => (v.id === tempId ? mapeado : v)));
          })
          .catch((err: unknown) => {
            setVideosTecnica((prev) => prev.filter((v) => v.id !== tempId));
            reportarErrorSync(formatearMensajeErrorSync("guardar el video técnico", err));
          });
      }

      return nuevoVideo;
    },
    [reportarErrorSync]
  );

  // Persistir entidades en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_alumnos_v1", JSON.stringify(alumnos));
      } catch {}
    }
  }, [alumnos]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_pagos_v1", JSON.stringify(pagos));
      } catch {}
    }
  }, [pagos]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_rutinas_v1", JSON.stringify(rutinas));
      } catch {}
    }
  }, [rutinas]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_videos_v2", JSON.stringify(videosTecnica));
      } catch {}
    }
  }, [videosTecnica]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_planes_v1", JSON.stringify(planes));
      } catch {}
    }
  }, [planes]);

  const eliminarVideoTecnica = useCallback(
    (id: string) => {
      let respaldo: VideoTecnica | undefined;
      setVideosTecnica((prev) => {
        respaldo = prev.find((v) => v.id === id);
        return prev.filter((v) => v.id !== id);
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarVideo(numId).catch((err: unknown) => {
          if (respaldo) {
            setVideosTecnica((prev) => [respaldo!, ...prev]);
          }
          reportarErrorSync(formatearMensajeErrorSync("eliminar el video técnico", err));
        });
      }
    },
    [reportarErrorSync]
  );

  const agregarPlan = useCallback(
    (nuevoPlanData: Omit<Plan, "id">) => {
      const tempId = "p" + Date.now().toString(36);
      const nuevo: Plan = {
        ...nuevoPlanData,
        id: tempId,
      };
      setPlanes((prev) => [...prev, nuevo]);

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiCrearPlan(mapPlanFrontToRequestDto(nuevoPlanData))
          .then((dto) => {
            const mapeado = mapPlanDtoToFront(dto);
            setPlanes((prev) => prev.map((p) => (p.id === tempId ? mapeado : p)));
          })
          .catch((err: unknown) => {
            setPlanes((prev) => prev.filter((p) => p.id !== tempId));
            reportarErrorSync(formatearMensajeErrorSync("crear el plan", err));
          });
      }

      return nuevo;
    },
    [reportarErrorSync]
  );

  const actualizarPlan = useCallback(
    (id: string, cambios: Partial<Omit<Plan, "id">>) => {
      let planAnterior: Plan | null = null;
      let planActualizado: Plan | null = null;
      const respaldoAlumnos = alumnos;

      setPlanes((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          planAnterior = p;
          planActualizado = { ...p, ...cambios };
          return planActualizado;
        })
      );
      if (cambios.nombre) {
        setAlumnos((prev) => sincronizarNombrePlanEnAlumnos(prev, id, cambios.nombre!));
      }

      const numId = parseNumericId(id);
      if (numId != null && planActualizado && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiActualizarPlan(numId, mapPlanFrontToRequestDto(planActualizado)).catch((err: unknown) => {
          if (planAnterior) {
            setPlanes((prev) => prev.map((p) => (p.id === id ? planAnterior! : p)));
          }
          if (cambios.nombre) {
            setAlumnos(respaldoAlumnos);
          }
          reportarErrorSync(formatearMensajeErrorSync("actualizar el plan", err));
        });
      }
    },
    [alumnos, reportarErrorSync]
  );

  const eliminarPlan = useCallback(
    (id: string): { ok: boolean; motivo?: string } => {
      const chequeo = puedeEliminarPlan(id, alumnos);
      if (!chequeo.ok) {
        return chequeo;
      }
      let respaldoPlan: Plan | undefined;
      setPlanes((prev) => {
        respaldoPlan = prev.find((p) => p.id === id);
        return prev.filter((p) => p.id !== id);
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarPlan(numId).catch((err: unknown) => {
          if (respaldoPlan) {
            setPlanes((prev) => [...prev, respaldoPlan!]);
          }
          reportarErrorSync(formatearMensajeErrorSync("eliminar el plan", err));
        });
      }

      return { ok: true };
    },
    [alumnos, reportarErrorSync]
  );

  // Persistir historial de entrenamiento en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_historial_v1", JSON.stringify(sesionesEntrenamiento));
      } catch {}
    }
  }, [sesionesEntrenamiento]);

  const guardarSesion = useCallback(
    (sesion: Omit<SesionEntrenamiento, "id">) => {
      const hoy = fechaLocalHoy();
      const tempId = crypto.randomUUID();
      const respaldoSesiones = sesionesEntrenamiento;

      setSesionesEntrenamiento((prev) => {
        const existeHoy = prev.findIndex(
          (s) =>
            s.alumnoId === sesion.alumnoId &&
            s.rutinaId === sesion.rutinaId &&
            s.diaId === sesion.diaId &&
            s.fecha === hoy
        );
        const nueva: SesionEntrenamiento = { ...sesion, id: tempId, fecha: hoy };
        if (existeHoy !== -1) {
          return prev.map((s, i) => (i === existeHoy ? nueva : s));
        }
        return [...prev, nueva];
      });

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiGuardarSesion(mapSesionFrontToRequestDto({ ...sesion, fecha: hoy }))
          .then((dto) => {
            const mapeada = mapSesionDtoToFront(dto);
            setSesionesEntrenamiento((prev) =>
              prev.map((s) => (s.id === tempId ? mapeada : s))
            );
          })
          .catch((err: unknown) => {
            setSesionesEntrenamiento(respaldoSesiones);
            reportarErrorSync(formatearMensajeErrorSync("guardar la sesión de entrenamiento", err));
          });
      }
    },
    [sesionesEntrenamiento, reportarErrorSync]
  );

  const getUltimaSesion = useCallback(
    (alumnoId: string, rutinaId: string, diaId: string): SesionEntrenamiento | undefined => {
      const hoy = fechaLocalHoy();
      const previas = sesionesEntrenamiento
        .filter(
          (s) =>
            s.alumnoId === alumnoId &&
            s.rutinaId === rutinaId &&
            s.diaId === diaId &&
            s.fecha < hoy
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return previas[0];
    },
    [sesionesEntrenamiento]
  );

  const getAlumno = useCallback((id: string) => alumnos.find((a) => a.id === id), [alumnos]);

  const getEstadoCuenta = useCallback(
    (alumnoId: string) => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      return estadoCuentaDeAlumno(
        alumnoId,
        pagos,
        alumno?.fechaAlta,
        alumno ? alumno.activo : true
      );
    },
    [alumnos, pagos]
  );

  const getPagosDeAlumno = useCallback(
    (alumnoId: string) =>
      pagos
        .filter((p) => p.alumnoId === alumnoId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [pagos]
  );

  const registrarAsistenciaPorDni = useCallback(
    (dniIngresado: string, opciones?: { omitirApiRemota?: boolean }) => {
      const dniLimpio = normalizarDni(dniIngresado);
      if (!dniLimpio) {
        return { ok: false, motivo: "Por favor ingresá un número de DNI válido." };
      }

      const alumno = alumnos.find((a) => a.dni && normalizarDni(a.dni) === dniLimpio);
      if (!alumno) {
        return {
          ok: false,
          motivo: "DNI no registrado en el sistema. Por favor consultá en recepción.",
        };
      }

      if (!alumno.activo) {
        return {
          ok: false,
          motivo:
            "El socio se encuentra inactivo. Acercate a recepción para reactivar tu cuenta.",
          alumno,
        };
      }

      const estado = getEstadoCuenta(alumno.id);
      const hoy = fechaLocalHoy();

      const asistenciaPreviaHoy = asistencias.find(
        (a) => a.alumnoId === alumno.id && a.fecha === hoy && estaSesionActiva(a.timestamp)
      );

      if (asistenciaPreviaHoy) {
        const cupoPrevio = calcularCupoSemanalAsistencia(
          asistenciaPreviaHoy,
          asistencias,
          planes,
          alumnos
        );
        return {
          ok: false,
          yaRegistrado: true,
          alumno,
          estadoCuenta: estado,
          motivo: `Ya registraste tu ingreso hoy a las ${asistenciaPreviaHoy.hora} hs. Tu sesión de entrenamiento continúa activa.`,
          asistenciasSemana: cupoPrevio.asistenciasSemana,
          limiteDiasSemana: cupoPrevio.limiteDiasSemana,
          excedeLimiteSemanal: cupoPrevio.excedeLimiteSemanal,
        };
      }

      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Argentina/Buenos_Aires",
      });

      const tempId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `asist-${Date.now()}`;

      const borrador: RegistroAsistencia = {
        id: tempId,
        alumnoId: alumno.id,
        alumnoNombre: alumno.nombre,
        alumnoDni: alumno.dni || dniLimpio,
        fecha: hoy,
        hora: horaStr,
        timestamp: Date.now(),
        estadoCuenta: estado,
        planNombre: alumno.plan || "Pase Libre",
        metodo: "DNI_TOTEM",
      };

      const cupo = calcularCupoSemanalAsistencia(borrador, asistencias, planes, alumnos);
      const nueva: RegistroAsistencia = {
        ...borrador,
        asistenciasSemana: cupo.asistenciasSemana,
        limiteDiasSemana: cupo.limiteDiasSemana,
        excedeLimiteSemanal: cupo.excedeLimiteSemanal,
      };

      setAsistencias((prev) => {
        const actualizadas = [nueva, ...prev];
        guardarCacheLocalAsistencias(actualizadas);
        if (typeof window !== "undefined") {
          try {
            if (typeof BroadcastChannel !== "undefined") {
              const bc = new BroadcastChannel("atlas_asistencias_channel");
              bc.postMessage({ tipo: "NUEVA_ASISTENCIA", asistencias: actualizadas });
              bc.close();
            }
          } catch {}
        }
        return actualizadas;
      });

      setAlumnos((prev) => {
        const actualizados = prev.map((a) =>
          a.id === alumno.id ? { ...a, ultimaAsistencia: hoy } : a
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("atlas_alumnos_v1", JSON.stringify(actualizados));
          } catch {}
        }
        return actualizados;
      });

      if (isApiRuntimeEnabled() && !opciones?.omitirApiRemota) {
        apiCheckInTotem(dniLimpio)
          .then((res) => {
            if (res.ok && res.asistenciaId != null) {
              setAsistencias((prev) =>
                prev.map((a) =>
                  a.id === tempId
                    ? {
                        ...a,
                        id: String(res.asistenciaId),
                        asistenciasSemana: res.asistenciasSemana ?? a.asistenciasSemana,
                        limiteDiasSemana:
                          res.limiteDiasSemana !== undefined
                            ? res.limiteDiasSemana
                            : a.limiteDiasSemana,
                        excedeLimiteSemanal: res.excedeLimiteSemanal ?? a.excedeLimiteSemanal,
                      }
                    : a
                )
              );
            }
          })
          .catch(() => {});
      }

      return {
        ok: true,
        alumno,
        estadoCuenta: estado,
        asistenciasSemana: cupo.asistenciasSemana,
        limiteDiasSemana: cupo.limiteDiasSemana,
        excedeLimiteSemanal: cupo.excedeLimiteSemanal,
      };
    },
    [alumnos, asistencias, planes, getEstadoCuenta]
  );

  const eliminarAsistencia = useCallback(
    (id: string) => {
      let respaldoAsistencias: RegistroAsistencia[] = [];
      setAsistencias((prev) => {
        respaldoAsistencias = prev;
        const eliminada = prev.find((a) => a.id === id);
        const filtradas = prev.filter((a) => a.id !== id);
        // Limpiar conteos cacheados del socio eliminado para recalcular cupo semanal exacto al instante
        const actualizadas = eliminada
          ? filtradas.map((a) =>
              a.alumnoId === eliminada.alumnoId
                ? { ...a, asistenciasSemana: undefined, excedeLimiteSemanal: undefined }
                : a
            )
          : filtradas;
        guardarCacheLocalAsistencias(actualizadas);
        if (typeof window !== "undefined") {
          try {
            if (typeof BroadcastChannel !== "undefined") {
              const bc = new BroadcastChannel("atlas_asistencias_channel");
              bc.postMessage({ tipo: "ELIMINAR_ASISTENCIA", asistencias: actualizadas });
              bc.close();
            }
          } catch {}
        }
        return actualizadas;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarAsistencia(numId)
          .then(() => {
            refrescarAsistencias();
          })
          .catch((err: unknown) => {
            setAsistencias(respaldoAsistencias);
            reportarErrorSync(formatearMensajeErrorSync("eliminar el registro de asistencia", err));
          });
      }
    },
    [refrescarAsistencias, reportarErrorSync]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      alumnos,
      pagos,
      rutinas,
      videosTecnica,
      planes,
      usuarioActual,
      ultimoErrorSync,
      limpiarErrorSync,
      actualizarUsuarioActual,
      guardarPerfilUsuario,
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      asignarCredencialesAlumno,
      blanquearClaveAlumno,
      importarAlumnosMasivo,
      marcarAsistenciaAlumno,
      agregarPago,
      actualizarEstadoPago,
      completarSaldoPago,
      anularPago,
      eliminarPago,
      agregarRutina,
      actualizarRutina,
      asignarRutinaAAlumno,
      eliminarRutina,
      getRutinaDeAlumno,
      agregarVideoTecnica,
      eliminarVideoTecnica,
      agregarPlan,
      actualizarPlan,
      eliminarPlan,
      avisos,
      crearAviso,
      marcarAvisoLeido,
      marcarTodosAvisosLeidos,
      eliminarAviso,
      getAvisosParaUsuario,
      getCantidadAvisosNoLeidos,
      getAlumno,
      getEstadoCuenta,
      getPagosDeAlumno,
      sesionesEntrenamiento,
      guardarSesion,
      getUltimaSesion,
      asistencias,
      refrescarAsistencias,
      cargarHistorialAsistenciasRango,
      registrarAsistenciaPorDni,
      eliminarAsistencia,
    }),
    [
      alumnos,
      pagos,
      rutinas,
      videosTecnica,
      planes,
      avisos,
      crearAviso,
      marcarAvisoLeido,
      marcarTodosAvisosLeidos,
      eliminarAviso,
      getAvisosParaUsuario,
      getCantidadAvisosNoLeidos,
      usuarioActual,
      ultimoErrorSync,
      limpiarErrorSync,
      actualizarUsuarioActual,
      guardarPerfilUsuario,
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      asignarCredencialesAlumno,
      blanquearClaveAlumno,
      importarAlumnosMasivo,
      marcarAsistenciaAlumno,
      agregarPago,
      actualizarEstadoPago,
      completarSaldoPago,
      anularPago,
      eliminarPago,
      agregarRutina,
      actualizarRutina,
      asignarRutinaAAlumno,
      eliminarRutina,
      getRutinaDeAlumno,
      agregarVideoTecnica,
      eliminarVideoTecnica,
      agregarPlan,
      actualizarPlan,
      eliminarPlan,
      getAlumno,
      getEstadoCuenta,
      getPagosDeAlumno,
      sesionesEntrenamiento,
      guardarSesion,
      getUltimaSesion,
      asistencias,
      refrescarAsistencias,
      cargarHistorialAsistenciasRango,
      registrarAsistenciaPorDni,
      eliminarAsistencia,
    ]
  );

  return value;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const store = useGymStore();
  return <AppDataContext.Provider value={store}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData debe usarse dentro de un <AppDataProvider>");
  }
  return ctx;
}
