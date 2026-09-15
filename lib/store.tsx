// lib/store.tsx
// Fuente de verdad compartida entre módulos, mientras no hay backend.
//
// Por qué existe esto: si cada página maneja su propio useState con datos
// mock, agregar un alumno en /alumnos nunca se refleja en /finanzas, y
// terminás pudiendo cargar el "mismo" alumno dos veces con datos distintos.
// Centralizando el estado acá, ambos módulos leen y escriben la misma
// lista. Cuando exista el backend, solo hay que reemplazar el cuerpo de
// estas funciones por fetch/POST/PUT — los componentes que consumen
// useAppData() no deberían necesitar cambios.
"use client";

import { createContext, useContext, useMemo, useState, useEffect, useCallback, ReactNode } from "react";
import { Alumno, Pago, EstadoPago, EstadoCuenta, estadoCuentaDeAlumno, UsuarioSesion, Rutina, VideoTecnica, Plan, Aviso, SesionEntrenamiento } from "./types";
import { ALUMNOS_MOCK, PAGOS_MOCK, RUTINAS_MOCK, VIDEOS_TECNICA_MOCK, PLANES_MOCK, SESIONES_MOCK } from "./mock-data";
import { useAvisosManager } from "./use-avisos";
import { fechaLocalHoy } from "./date-utils";
import { puedeEliminarPlan, ejecutarBajaAlumno, sincronizarNombrePlanEnAlumnos } from "./plan-utils";

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
  iniciarSesion: (rol: "ADMIN" | "ALUMNO", email?: string) => void;
  cerrarSesion: () => void;
  agregarAlumno: (alumno: Omit<Alumno, "id">) => Alumno;
  actualizarAlumno: (id: string, cambios: Partial<Omit<Alumno, "id">>) => void;
  eliminarAlumno: (id: string) => void;
  agregarPago: (pago: Omit<Pago, "id">) => void;
  actualizarEstadoPago: (id: string, estado: EstadoPago) => void;
  eliminarPago: (id: string) => void;
  agregarRutina: (rutina: Omit<Rutina, "id">) => Rutina;
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
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function useGymStore(): AppDataContextValue {
  const [alumnos, setAlumnos] = useState<Alumno[]>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_alumnos_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
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
      const guardado = localStorage.getItem("atlas_videos_v1");
      if (guardado) {
        try {
          return JSON.parse(guardado);
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

  // Historial de entrenamiento: se hidrata desde localStorage o desde el mock inicial
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

  const iniciarSesion = useCallback((rol: "ADMIN" | "ALUMNO", email?: string) => {
    let nuevoUsuario: UsuarioSesion;
    if (rol === "ADMIN") {
      nuevoUsuario = USUARIO_ADMIN_DEFAULT;
    } else {
      const alumno = email
        ? alumnos.find((a) => a.email?.toLowerCase() === email.toLowerCase()) || alumnos.find((a) => a.activo)
        : alumnos.find((a) => a.activo);
      nuevoUsuario = {
        id: "u_alumno_1",
        nombre: alumno ? alumno.nombre : (email ? email.split("@")[0] : "Alumno Atlas"),
        email: alumno?.email || email || "alumno@atlasgym.com",
        rol: "ALUMNO",
        alumnoId: alumno?.id,
      };
    }
    setUsuarioActual(nuevoUsuario);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_sesion_v1", JSON.stringify(nuevoUsuario));
    }
  }, [alumnos]);

  const cerrarSesion = useCallback(() => {
    setUsuarioActual(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("atlas_sesion_v1");
    }
  }, []);

  const agregarAlumno = useCallback((alumno: Omit<Alumno, "id">) => {
    const planEncontrado = planes.find(
      (p) => p.id === alumno.planId || p.nombre.toLowerCase() === alumno.plan.toLowerCase()
    );
    const nuevo: Alumno = {
      ...alumno,
      id: crypto.randomUUID(),
      planId: alumno.planId || planEncontrado?.id,
      plan: planEncontrado ? planEncontrado.nombre : alumno.plan,
    };
    setAlumnos((prev) => [nuevo, ...prev]);
    return nuevo;
  }, [planes]);

  const actualizarAlumno = useCallback((id: string, cambios: Partial<Omit<Alumno, "id">>) => {
    setAlumnos((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        let planId = cambios.planId ?? a.planId;
        let plan = cambios.plan ?? a.plan;
        if (cambios.plan && !cambios.planId) {
          const encontrado = planes.find((p) => p.nombre.toLowerCase() === cambios.plan!.toLowerCase());
          if (encontrado) planId = encontrado.id;
        } else if (cambios.planId && !cambios.plan) {
          const encontrado = planes.find((p) => p.id === cambios.planId);
          if (encontrado) plan = encontrado.nombre;
        }
        return { ...a, ...cambios, planId, plan };
      })
    );
  }, [planes]);

  const eliminarAlumno = useCallback((id: string) => {
    const { alumnos: nuevosAlumnos, pagos: nuevosPagos, rutinas: nuevasRutinas } =
      ejecutarBajaAlumno(id, alumnos, pagos, rutinas);
    setAlumnos(nuevosAlumnos);
    setPagos(nuevosPagos);
    setRutinas(nuevasRutinas);
  }, [alumnos, pagos, rutinas]);

  const agregarPago = useCallback((pago: Omit<Pago, "id">) => {
    const alumno = alumnos.find((a) => a.id === pago.alumnoId);
    const alumnoNombreHistorico = pago.alumnoNombreHistorico || alumno?.nombre || "Alumno Atlas";
    const planId = pago.planId || alumno?.planId;
    setPagos((prev) => [{ ...pago, alumnoNombreHistorico, planId, id: crypto.randomUUID() }, ...prev]);
  }, [alumnos]);

  const actualizarEstadoPago = useCallback((id: string, estado: EstadoPago) => {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
  }, []);

  const eliminarPago = useCallback((id: string) => {
    setPagos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const agregarRutina = useCallback((rutina: Omit<Rutina, "id">) => {
    const nueva: Rutina = { ...rutina, id: crypto.randomUUID() };
    setRutinas((prev) => [nueva, ...prev]);
    return nueva;
  }, []);

  const asignarRutinaAAlumno = useCallback((rutinaId: string, alumnoId: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, tieneRutina: true, rutinaId } : a))
    );
  }, []);

  const eliminarRutina = useCallback((id: string) => {
    setRutinas((prev) => prev.filter((r) => r.id !== id));
    setAlumnos((prev) =>
      prev.map((a) => (a.rutinaId === id ? { ...a, tieneRutina: false, rutinaId: undefined } : a))
    );
  }, []);

  const getRutinaDeAlumno = useCallback((alumnoId: string) => {
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno || !alumno.rutinaId) return undefined;
    return rutinas.find((r) => r.id === alumno.rutinaId);
  }, [alumnos, rutinas]);

  const agregarVideoTecnica = useCallback((videoData: Omit<VideoTecnica, "id">) => {
    const nuevoVideo: VideoTecnica = {
      ...videoData,
      id: "v" + Date.now().toString(36),
    };
    setVideosTecnica((prev) => [nuevoVideo, ...prev]);
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
        localStorage.setItem("atlas_videos_v1", JSON.stringify(videosTecnica));
      } catch {}
    }
  }, [videosTecnica]);

  // Persistir planes en localStorage cuando cambian (sin efectos secundarios en el updater)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_planes_v1", JSON.stringify(planes));
    }
  }, [planes]);

  const eliminarVideoTecnica = useCallback((id: string) => {
    setVideosTecnica((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const agregarPlan = useCallback((nuevoPlanData: Omit<Plan, "id">) => {
    const nuevo: Plan = {
      ...nuevoPlanData,
      id: "p" + Date.now().toString(36),
    };
    setPlanes((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  const actualizarPlan = useCallback((id: string, cambios: Partial<Omit<Plan, "id">>) => {
    setPlanes((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    if (cambios.nombre) {
      setAlumnos((prev) => sincronizarNombrePlanEnAlumnos(prev, id, cambios.nombre!));
    }
  }, []);

  const eliminarPlan = useCallback(
    (id: string): { ok: boolean; motivo?: string } => {
      const chequeo = puedeEliminarPlan(id, alumnos);
      if (!chequeo.ok) {
        return chequeo;
      }
      setPlanes((prev) => prev.filter((p) => p.id !== id));
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

  // Guarda o reemplaza la sesión del día para ese alumno/rutina/día
  const guardarSesion = useCallback((sesion: Omit<SesionEntrenamiento, "id">) => {
    const hoy = fechaLocalHoy();
    setSesionesEntrenamiento((prev) => {
      // Reemplaza si ya existe una sesión del mismo alumno/rutina/día/fecha de hoy
      const existeHoy = prev.findIndex(
        (s) => s.alumnoId === sesion.alumnoId && s.rutinaId === sesion.rutinaId && s.diaId === sesion.diaId && s.fecha === hoy
      );
      const nueva: SesionEntrenamiento = { ...sesion, id: crypto.randomUUID(), fecha: hoy };
      if (existeHoy !== -1) {
        return prev.map((s, i) => (i === existeHoy ? nueva : s));
      }
      return [...prev, nueva];
    });
  }, []);

  // Devuelve la sesión más reciente que NO sea del día de hoy (la "previa")
  const getUltimaSesion = useCallback(
    (alumnoId: string, rutinaId: string, diaId: string): SesionEntrenamiento | undefined => {
      const hoy = fechaLocalHoy();
      const previas = sesionesEntrenamiento
        .filter((s) => s.alumnoId === alumnoId && s.rutinaId === rutinaId && s.diaId === diaId && s.fecha < hoy)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return previas[0];
    },
    [sesionesEntrenamiento]
  );

  const getAlumno = useCallback((id: string) => alumnos.find((a) => a.id === id), [alumnos]);

  const getEstadoCuenta = useCallback((alumnoId: string) => {
    const alumno = alumnos.find((a) => a.id === alumnoId);
    return estadoCuentaDeAlumno(alumnoId, pagos, alumno?.fechaAlta, alumno ? alumno.activo : true);
  }, [alumnos, pagos]);

  const getPagosDeAlumno = useCallback((alumnoId: string) =>
    pagos
      .filter((p) => p.alumnoId === alumnoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [pagos]
  );

  const {
    avisos,
    crearAviso,
    marcarAvisoLeido,
    marcarTodosAvisosLeidos,
    eliminarAviso,
    getAvisosParaUsuario,
    getCantidadAvisosNoLeidos,
  } = useAvisosManager();

  const value = useMemo<AppDataContextValue>(
    () => ({
      alumnos,
      pagos,
      rutinas,
      videosTecnica,
      planes,
      usuarioActual,
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      agregarPago,
      actualizarEstadoPago,
      eliminarPago,
      agregarRutina,
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
      // Historial de entrenamiento
      sesionesEntrenamiento,
      guardarSesion,
      getUltimaSesion,
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
      iniciarSesion,
      cerrarSesion,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      agregarPago,
      actualizarEstadoPago,
      eliminarPago,
      agregarRutina,
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
    ]
  );

  return value;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const value = useGymStore();
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  }
  return ctx;
}
