// lib/store.tsx
// Fuente de verdad compartida entre módulos ("El Amortiguador").
//
// Centraliza todo el estado de la aplicación y sincroniza de forma transparente
// con el Backend Spring Boot (/api/*) mediante JWT, manteniendo actualizaciones
// optimistas en memoria/localStorage para respuesta instantánea en la UI.
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
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
import { fechaLocalHoy } from "./date-utils";
import {
  puedeEliminarPlan,
  ejecutarBajaAlumno,
  sincronizarNombrePlanEnAlumnos,
} from "./plan-utils";
import { normalizarDni } from "./asistencia-utils";
import {
  apiActualizarAlumno,
  apiActualizarEstadoPago,
  apiActualizarPlan,
  apiActualizarRutina,
  apiAsignarRutina,
  apiCheckInTotem,
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
  apiLogin,
  apiRegistrarPago,
  getStoredJwtToken,
  isApiRuntimeEnabled,
  setStoredJwtToken,
} from "./api-client";
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

const USUARIO_ADMIN_DEFAULT: UsuarioSesion = {
  id: "u1",
  nombre: "Julián Pérez",
  email: "admin@atlasgym.com",
  rol: "ADMIN",
};

interface AppDataContextValue {
  alumnos: Alumno[];
  pagos: Pago[];
  rutinas: Rutina[];
  videosTecnica: VideoTecnica[];
  planes: Plan[];
  avisos: Aviso[];
  usuarioActual: UsuarioSesion | null;
  actualizarUsuarioActual: (cambios: Partial<UsuarioSesion>) => void;
  iniciarSesion: (rol: "ADMIN" | "ALUMNO", email?: string, password?: string) => void;
  cerrarSesion: () => void;
  agregarAlumno: (alumno: Omit<Alumno, "id">) => Alumno;
  actualizarAlumno: (id: string, cambios: Partial<Omit<Alumno, "id">>) => void;
  eliminarAlumno: (id: string) => void;
  marcarAsistenciaAlumno: (id: string, fecha?: string) => void;
  agregarPago: (pago: Omit<Pago, "id">) => void;
  actualizarEstadoPago: (id: string, estado: EstadoPago) => void;
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
  registrarAsistenciaPorDni: (dni: string) => {
    ok: boolean;
    yaRegistrado?: boolean;
    alumno?: Alumno;
    estadoCuenta?: EstadoCuenta;
    motivo?: string;
  };
  eliminarAsistencia: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function useGymStore(): AppDataContextValue {
  const [alumnos, setAlumnos] = useState<Alumno[]>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_alumnos_v1");
      if (guardado) {
        try {
          const parsed = JSON.parse(guardado);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {}
      }
    }
    return ALUMNOS_MOCK;
  });

  const [pagos, setPagos] = useState<Pago[]>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_pagos_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {}
      }
    }
    return PAGOS_MOCK;
  });

  const [rutinas, setRutinas] = useState<Rutina[]>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_rutinas_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
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
      const guardado = localStorage.getItem("atlas_planes_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
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
      const guardado = localStorage.getItem("atlas_historial_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {}
      }
    }
    return SESIONES_MOCK;
  });

  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>(() => {
    if (typeof window !== "undefined") {
      const guardadoV2 = localStorage.getItem("atlas_asistencias_v2");
      if (guardadoV2) {
        try {
          const parsed = JSON.parse(guardadoV2);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {}
      }
      const guardadoV1 = localStorage.getItem("atlas_asistencias_v1");
      if (guardadoV1) {
        try {
          const parsed = JSON.parse(guardadoV1);
          if (Array.isArray(parsed) && parsed.length > 0) {
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
  } = useAvisosManager();

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

        if (planesDto && planesDto.length > 0) {
          setPlanes(planesDto.map(mapPlanDtoToFront));
        }

        if (videosDto && videosDto.length > 0) {
          const videosBack = videosDto.map(mapVideoDtoToFront);
          const titulosBack = new Set(videosBack.map((v) => v.titulo.toLowerCase()));
          const complementarios = VIDEOS_TECNICA_MOCK.filter(
            (v) => !titulosBack.has(v.titulo.toLowerCase())
          );
          setVideosTecnica([...videosBack, ...complementarios]);
        }

        // 2. Si hay sesión activa pero aún no hay JWT en localStorage (sesión previa), autenticar silenciosamente
        let token = getStoredJwtToken();
        let usuarioEfectivo = sesionActiva;

        if (sesionActiva && !token) {
          const emailLogin =
            sesionActiva.rol === "ADMIN"
              ? "admin@atlasgym.com"
              : sesionActiva.email || "lucia.fernandez@mail.com";
          const passLogin = sesionActiva.rol === "ADMIN" ? "admin123" : "alumno123";
          try {
            const loginRes = await apiLogin(emailLogin, passLogin);
            if (loginRes.token) {
              setStoredJwtToken(loginRes.token);
              token = loginRes.token;
              usuarioEfectivo = mapLoginResponseToUsuarioSesion(loginRes);
              setUsuarioActual(usuarioEfectivo);
            }
          } catch {}
        }

        if (!token || !usuarioEfectivo) return;

        // 3. Cargar colecciones protegidas desde MySQL
        const [alumnosDto, pagosDto, asistenciasDto] = await Promise.all([
          apiGetAlumnos().catch(() => null),
          apiGetPagos().catch(() => null),
          apiGetAsistencias().catch(() => null),
        ]);

        if (alumnosDto && alumnosDto.length > 0) {
          setAlumnos(alumnosDto.map(mapAlumnoDtoToFront));
        }

        if (pagosDto) {
          setPagos(pagosDto.map(mapPagoDtoToFront));
        }

        if (asistenciasDto) {
          setAsistencias(asistenciasDto.map(mapAsistenciaDtoToFront));
        }

        if (usuarioEfectivo.rol === "ADMIN") {
          const [rutinasDto, avisosDto] = await Promise.all([
            apiGetRutinas().catch(() => null),
            apiGetAvisosAdmin().catch(() => null),
          ]);
          if (rutinasDto && rutinasDto.length > 0) {
            setRutinas(rutinasDto.map(mapRutinaDtoToFront));
          }
          if (avisosDto) {
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

          if (misAvisosDto) {
            setAvisos(misAvisosDto.map((a) => mapAvisoDtoToFront(a, usuarioEfectivo?.id)));
          }

          if (misSesionesDto && misSesionesDto.length > 0) {
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("atlas_asistencias_v2", JSON.stringify(asistencias));
      } catch {}
    }
  }, [asistencias]);

  // Sincronización en tiempo real entre pestañas/ventanas (Tótem y Panel de Asistencias)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("atlas_asistencias_channel");
        bc.onmessage = (event) => {
          if (event.data?.asistencias && Array.isArray(event.data.asistencias)) {
            setAsistencias(event.data.asistencias);
          }
        };
      } catch {}
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === "atlas_asistencias_v2" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAsistencias(parsed);
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
            setAsistencias((prev) => {
              if (prev.length === parsed.length && prev[0]?.id === parsed[0]?.id) {
                return prev;
              }
              const parsedTime = parsed[0]?.timestamp || 0;
              const prevTime = prev[0]?.timestamp || 0;
              if (parsedTime >= prevTime || parsed.length > prev.length) {
                return parsed;
              }
              return prev;
            });
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
    (rol: "ADMIN" | "ALUMNO", email?: string, password?: string) => {
      let nuevoUsuario: UsuarioSesion;
      if (rol === "ADMIN") {
        nuevoUsuario = USUARIO_ADMIN_DEFAULT;
      } else {
        const alumno = email
          ? alumnos.find((a) => a.email?.toLowerCase() === email.toLowerCase()) ||
            alumnos.find((a) => a.activo)
          : alumnos.find((a) => a.activo);
        nuevoUsuario = {
          id: "u_alumno_1",
          nombre: alumno ? alumno.nombre : email ? email.split("@")[0] : "Alumno Atlas",
          email: alumno?.email || email || "lucia.fernandez@mail.com",
          rol: "ALUMNO",
          alumnoId: alumno?.id,
        };
      }
      setUsuarioActual(nuevoUsuario);
      if (typeof window !== "undefined") {
        localStorage.setItem("atlas_sesion_v1", JSON.stringify(nuevoUsuario));
      }

      if (isApiRuntimeEnabled()) {
        const emailEfectivo =
          rol === "ADMIN"
            ? email?.trim() || "admin@atlasgym.com"
            : email?.trim() || "lucia.fernandez@mail.com";
        const passwordEfectivo = password || (rol === "ADMIN" ? "admin123" : "alumno123");

        apiLogin(emailEfectivo, passwordEfectivo)
          .then((res) => {
            if (res.token) {
              setStoredJwtToken(res.token);
            }
            const sesionReal = mapLoginResponseToUsuarioSesion(res);
            setUsuarioActual(sesionReal);
            if (typeof window !== "undefined") {
              localStorage.setItem("atlas_sesion_v1", JSON.stringify(sesionReal));
            }
            hidratarDesdeBackend(sesionReal);
          })
          .catch(() => {});
      }
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

  const actualizarUsuarioActual = useCallback((cambios: Partial<UsuarioSesion>) => {
    setUsuarioActual((prev) => (prev ? { ...prev, ...cambios } : null));
  }, []);

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
      const nuevo: Alumno = {
        ...alumno,
        id: tempId,
        planId: alumno.planId || planEncontrado?.id,
        plan: planEncontrado ? planEncontrado.nombre : alumno.plan,
      };
      setAlumnos((prev) => [nuevo, ...prev]);

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiCrearAlumno(mapAlumnoFrontToRequestDto(nuevo))
          .then((creadoDto) => {
            const mapeado = mapAlumnoDtoToFront(creadoDto);
            setAlumnos((prev) => prev.map((a) => (a.id === tempId ? mapeado : a)));
          })
          .catch(() => {});
      }

      return nuevo;
    },
    [planes]
  );

  const actualizarAlumno = useCallback(
    (id: string, cambios: Partial<Omit<Alumno, "id">>) => {
      let alumnoActualizado: Alumno | null = null;

      setAlumnos((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
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
          .catch(() => {});
      }
    },
    [planes]
  );

  const eliminarAlumno = useCallback(
    (id: string) => {
      const { alumnos: nuevosAlumnos, pagos: nuevosPagos, rutinas: nuevasRutinas } =
        ejecutarBajaAlumno(id, alumnos, pagos, rutinas);
      setAlumnos(nuevosAlumnos);
      setPagos(nuevosPagos);
      setRutinas(nuevasRutinas);

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiDarDeBajaAlumno(numId).catch(() => {});
      }
    },
    [alumnos, pagos, rutinas]
  );

  const marcarAsistenciaAlumno = useCallback((id: string, fecha?: string) => {
    const hoy = fecha || fechaLocalHoy();
    setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, ultimaAsistencia: hoy } : a)));
  }, []);

  const agregarPago = useCallback(
    (pago: Omit<Pago, "id">) => {
      const alumno = alumnos.find((a) => a.id === pago.alumnoId);
      const alumnoNombreHistorico = pago.alumnoNombreHistorico || alumno?.nombre || "Alumno Atlas";
      const planId = pago.planId || alumno?.planId;
      const tempId = crypto.randomUUID();
      const nuevoPago: Pago = {
        ...pago,
        alumnoNombreHistorico,
        planId,
        id: tempId,
      };

      setPagos((prev) => {
        const nuevosPagos = [nuevoPago, ...prev];
        const nuevoEstado = estadoCuentaDeAlumno(
          pago.alumnoId,
          nuevosPagos,
          alumno?.fechaAlta,
          alumno ? alumno.activo : true
        );

        setAsistencias((asistPrev) => {
          const actualizadas = asistPrev.map((asist) =>
            asist.alumnoId === pago.alumnoId && asist.fecha === fechaLocalHoy()
              ? { ...asist, estadoCuenta: nuevoEstado }
              : asist
          );
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("atlas_asistencias_v2", JSON.stringify(actualizadas));
              if (typeof BroadcastChannel !== "undefined") {
                const bc = new BroadcastChannel("atlas_asistencias_channel");
                bc.postMessage({ tipo: "ACTUALIZAR_ASISTENCIAS", asistencias: actualizadas });
                bc.close();
              }
            } catch {}
          }
          return actualizadas;
        });

        return nuevosPagos;
      });

      if (isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiRegistrarPago(mapPagoFrontToRequestDto({ ...pago, planId }))
          .then((dto) => {
            const mapeado = mapPagoDtoToFront(dto);
            setPagos((prev) => prev.map((p) => (p.id === tempId ? mapeado : p)));
          })
          .catch(() => {});
      }
    },
    [alumnos]
  );

  const actualizarEstadoPago = useCallback(
    (id: string, estado: EstadoPago) => {
      setPagos((prev) => {
        const nuevosPagos = prev.map((p) => (p.id === id ? { ...p, estado } : p));
        const pagoModificado = nuevosPagos.find((p) => p.id === id);
        if (pagoModificado) {
          const alumno = alumnos.find((a) => a.id === pagoModificado.alumnoId);
          const nuevoEstado = estadoCuentaDeAlumno(
            pagoModificado.alumnoId,
            nuevosPagos,
            alumno?.fechaAlta,
            alumno ? alumno.activo : true
          );
          setAsistencias((asistPrev) => {
            const actualizadas = asistPrev.map((asist) =>
              asist.alumnoId === pagoModificado.alumnoId && asist.fecha === fechaLocalHoy()
                ? { ...asist, estadoCuenta: nuevoEstado }
                : asist
            );
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("atlas_asistencias_v2", JSON.stringify(actualizadas));
                if (typeof BroadcastChannel !== "undefined") {
                  const bc = new BroadcastChannel("atlas_asistencias_channel");
                  bc.postMessage({ tipo: "ACTUALIZAR_ASISTENCIAS", asistencias: actualizadas });
                  bc.close();
                }
              } catch {}
            }
            return actualizadas;
          });
        }
        return nuevosPagos;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiActualizarEstadoPago(numId, estado).catch(() => {});
      }
    },
    [alumnos]
  );

  const eliminarPago = useCallback(
    (id: string) => {
      setPagos((prev) => {
        const pagoAEliminar = prev.find((p) => p.id === id);
        const nuevosPagos = prev.filter((p) => p.id !== id);
        if (pagoAEliminar) {
          const alumno = alumnos.find((a) => a.id === pagoAEliminar.alumnoId);
          const nuevoEstado = estadoCuentaDeAlumno(
            pagoAEliminar.alumnoId,
            nuevosPagos,
            alumno?.fechaAlta,
            alumno ? alumno.activo : true
          );
          setAsistencias((asistPrev) => {
            const actualizadas = asistPrev.map((asist) =>
              asist.alumnoId === pagoAEliminar.alumnoId && asist.fecha === fechaLocalHoy()
                ? { ...asist, estadoCuenta: nuevoEstado }
                : asist
            );
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("atlas_asistencias_v2", JSON.stringify(actualizadas));
                if (typeof BroadcastChannel !== "undefined") {
                  const bc = new BroadcastChannel("atlas_asistencias_channel");
                  bc.postMessage({ tipo: "ACTUALIZAR_ASISTENCIAS", asistencias: actualizadas });
                  bc.close();
                }
              } catch {}
            }
            return actualizadas;
          });
        }
        return nuevosPagos;
      });

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarPago(numId).catch(() => {});
      }
    },
    [alumnos]
  );

  const agregarRutina = useCallback((rutina: Omit<Rutina, "id">) => {
    const tempId = crypto.randomUUID();
    const nueva: Rutina = { ...rutina, id: tempId };
    setRutinas((prev) => [nueva, ...prev]);

    if (isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiCrearRutina(mapRutinaFrontToRequestDto(rutina))
        .then((dto) => {
          const mapeada = mapRutinaDtoToFront(dto);
          setRutinas((prev) => prev.map((r) => (r.id === tempId ? mapeada : r)));
        })
        .catch(() => {});
    }

    return nueva;
  }, []);

  const actualizarRutina = useCallback((id: string, cambios: Partial<Omit<Rutina, "id">>) => {
    let rutinaCombinada: Rutina | null = null;
    setRutinas((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
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
        .catch(() => {});
    }
  }, []);

  const asignarRutinaAAlumno = useCallback((rutinaId: string, alumnoId: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, tieneRutina: true, rutinaId } : a))
    );

    const numRutinaId = parseNumericId(rutinaId);
    const numAlumnoId = parseNumericId(alumnoId);
    if (numRutinaId != null && numAlumnoId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiAsignarRutina(numRutinaId, numAlumnoId).catch(() => {});
    }
  }, []);

  const eliminarRutina = useCallback((id: string) => {
    setRutinas((prev) => prev.filter((r) => r.id !== id));
    setAlumnos((prev) =>
      prev.map((a) => (a.rutinaId === id ? { ...a, tieneRutina: false, rutinaId: undefined } : a))
    );

    const numId = parseNumericId(id);
    if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiEliminarRutina(numId).catch(() => {});
    }
  }, []);

  const getRutinaDeAlumno = useCallback(
    (alumnoId: string) => {
      const alumno = alumnos.find((a) => a.id === alumnoId);
      if (!alumno || !alumno.rutinaId) return undefined;
      return rutinas.find((r) => r.id === alumno.rutinaId);
    },
    [alumnos, rutinas]
  );

  const agregarVideoTecnica = useCallback((videoData: Omit<VideoTecnica, "id">) => {
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
        .catch(() => {});
    }

    return nuevoVideo;
  }, []);

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
      localStorage.setItem("atlas_planes_v1", JSON.stringify(planes));
    }
  }, [planes]);

  const eliminarVideoTecnica = useCallback((id: string) => {
    setVideosTecnica((prev) => prev.filter((v) => v.id !== id));

    const numId = parseNumericId(id);
    if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiEliminarVideo(numId).catch(() => {});
    }
  }, []);

  const agregarPlan = useCallback((nuevoPlanData: Omit<Plan, "id">) => {
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
        .catch(() => {});
    }

    return nuevo;
  }, []);

  const actualizarPlan = useCallback((id: string, cambios: Partial<Omit<Plan, "id">>) => {
    let planActualizado: Plan | null = null;
    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        planActualizado = { ...p, ...cambios };
        return planActualizado;
      })
    );
    if (cambios.nombre) {
      setAlumnos((prev) => sincronizarNombrePlanEnAlumnos(prev, id, cambios.nombre!));
    }

    const numId = parseNumericId(id);
    if (numId != null && planActualizado && isApiRuntimeEnabled() && getStoredJwtToken()) {
      apiActualizarPlan(numId, mapPlanFrontToRequestDto(planActualizado)).catch(() => {});
    }
  }, []);

  const eliminarPlan = useCallback(
    (id: string): { ok: boolean; motivo?: string } => {
      const chequeo = puedeEliminarPlan(id, alumnos);
      if (!chequeo.ok) {
        return chequeo;
      }
      setPlanes((prev) => prev.filter((p) => p.id !== id));

      const numId = parseNumericId(id);
      if (numId != null && isApiRuntimeEnabled() && getStoredJwtToken()) {
        apiEliminarPlan(numId).catch(() => {});
      }

      return { ok: true };
    },
    [alumnos]
  );

  // Persistir historial de entrenamiento en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_historial_v1", JSON.stringify(sesionesEntrenamiento));
    }
  }, [sesionesEntrenamiento]);

  const guardarSesion = useCallback((sesion: Omit<SesionEntrenamiento, "id">) => {
    const hoy = fechaLocalHoy();
    const tempId = crypto.randomUUID();
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
        .catch(() => {});
    }
  }, []);

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
    (dniIngresado: string) => {
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
        (a) => a.alumnoId === alumno.id && a.fecha === hoy
      );

      if (asistenciaPreviaHoy) {
        return {
          ok: false,
          yaRegistrado: true,
          alumno,
          estadoCuenta: estado,
          motivo: `Ya registraste tu ingreso hoy a las ${asistenciaPreviaHoy.hora} hs. Tu sesión de entrenamiento continúa activa.`,
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

      const nueva: RegistroAsistencia = {
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

      setAsistencias((prev) => {
        const actualizadas = [nueva, ...prev];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("atlas_asistencias_v2", JSON.stringify(actualizadas));
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

      if (isApiRuntimeEnabled()) {
        apiCheckInTotem(dniLimpio)
          .then((res) => {
            if (res.ok && res.asistenciaId != null) {
              setAsistencias((prev) =>
                prev.map((a) =>
                  a.id === tempId ? { ...a, id: String(res.asistenciaId) } : a
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
      };
    },
    [alumnos, asistencias, getEstadoCuenta]
  );

  const eliminarAsistencia = useCallback((id: string) => {
    setAsistencias((prev) => {
      const actualizadas = prev.filter((a) => a.id !== id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("atlas_asistencias_v2", JSON.stringify(actualizadas));
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
      apiEliminarAsistencia(numId).catch(() => {});
    }
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      alumnos,
      pagos,
      rutinas,
      videosTecnica,
      planes,
      usuarioActual,
      actualizarUsuarioActual,
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      marcarAsistenciaAlumno,
      agregarPago,
      actualizarEstadoPago,
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
      actualizarUsuarioActual,
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      marcarAsistenciaAlumno,
      agregarPago,
      actualizarEstadoPago,
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
