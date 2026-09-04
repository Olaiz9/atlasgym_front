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

import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { Alumno, Pago, EstadoPago, EstadoCuenta, estadoCuentaDeAlumno, UsuarioSesion, Rutina, VideoTecnica } from "./types";
import { ALUMNOS_MOCK, PAGOS_MOCK, RUTINAS_MOCK, VIDEOS_TECNICA_MOCK } from "./mock-data";

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
  usuarioActual: UsuarioSesion;
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
  getAlumno: (id: string) => Alumno | undefined;
  getEstadoCuenta: (alumnoId: string) => EstadoCuenta;
  getPagosDeAlumno: (alumnoId: string) => Pago[];
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [alumnos, setAlumnos] = useState<Alumno[]>(ALUMNOS_MOCK);
  const [pagos, setPagos] = useState<Pago[]>(PAGOS_MOCK);
  const [rutinas, setRutinas] = useState<Rutina[]>(RUTINAS_MOCK);
  const [videosTecnica, setVideosTecnica] = useState<VideoTecnica[]>(VIDEOS_TECNICA_MOCK);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioSesion>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("atlas_sesion");
      if (guardado) {
        try {
          return JSON.parse(guardado);
        } catch {}
      }
    }
    return USUARIO_ADMIN_DEFAULT;
  });

  const iniciarSesion = (rol: "ADMIN" | "ALUMNO", email?: string) => {
    let nuevoUsuario: UsuarioSesion = USUARIO_ADMIN_DEFAULT;
    if (rol === "ALUMNO") {
      const alumno = alumnos.find((a) => a.email === email) || alumnos[0];
      nuevoUsuario = {
        id: "u2",
        nombre: alumno ? alumno.nombre : "Lucía Fernández",
        email: alumno?.email || "lucia.fernandez@mail.com",
        rol: "ALUMNO",
        alumnoId: alumno ? alumno.id : "a1",
      };
    }
    setUsuarioActual(nuevoUsuario);
    if (typeof window !== "undefined") {
      localStorage.setItem("atlas_sesion", JSON.stringify(nuevoUsuario));
    }
  };

  const cerrarSesion = () => {
    setUsuarioActual(USUARIO_ADMIN_DEFAULT);
    if (typeof window !== "undefined") {
      localStorage.removeItem("atlas_sesion");
    }
  };

  const agregarAlumno = (alumno: Omit<Alumno, "id">) => {
    const nuevo: Alumno = { ...alumno, id: crypto.randomUUID() };
    setAlumnos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const actualizarAlumno = (id: string, cambios: Partial<Omit<Alumno, "id">>) => {
    setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
  };

  const eliminarAlumno = (id: string) => {
    // Nota: no borramos los pagos históricos del alumno, para no perder
    // el registro contable. El día del backend, esto probablemente se
    // resuelva con una baja lógica (activo: false) en vez de un delete real.
    setAlumnos((prev) => prev.filter((a) => a.id !== id));
  };

  const agregarPago = (pago: Omit<Pago, "id">) => {
    setPagos((prev) => [{ ...pago, id: crypto.randomUUID() }, ...prev]);
  };

  const actualizarEstadoPago = (id: string, estado: EstadoPago) => {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
  };

  const eliminarPago = (id: string) => {
    setPagos((prev) => prev.filter((p) => p.id !== id));
  };

  const agregarRutina = (rutina: Omit<Rutina, "id">) => {
    const nueva: Rutina = { ...rutina, id: crypto.randomUUID() };
    setRutinas((prev) => [nueva, ...prev]);
    return nueva;
  };

  const asignarRutinaAAlumno = (rutinaId: string, alumnoId: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, tieneRutina: true, rutinaId } : a))
    );
  };

  const eliminarRutina = (id: string) => {
    setRutinas((prev) => prev.filter((r) => r.id !== id));
    setAlumnos((prev) =>
      prev.map((a) => (a.rutinaId === id ? { ...a, tieneRutina: false, rutinaId: undefined } : a))
    );
  };

  const getRutinaDeAlumno = (alumnoId: string) => {
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno || !alumno.rutinaId) return undefined;
    return rutinas.find((r) => r.id === alumno.rutinaId);
  };

  const agregarVideoTecnica = (videoData: Omit<VideoTecnica, "id">) => {
    const nuevoVideo: VideoTecnica = {
      ...videoData,
      id: "v" + (videosTecnica.length + 1) + "_" + Date.now().toString(36),
    };
    setVideosTecnica((prev) => [nuevoVideo, ...prev]);
    return nuevoVideo;
  };

  const eliminarVideoTecnica = (id: string) => {
    setVideosTecnica((prev) => prev.filter((v) => v.id !== id));
  };

  const value = useMemo<AppDataContextValue>(
    () => ({
      alumnos,
      pagos,
      rutinas,
      videosTecnica,
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
      getAlumno: (id) => alumnos.find((a) => a.id === id),
      getEstadoCuenta: (alumnoId) => {
        const alumno = alumnos.find((a) => a.id === alumnoId);
        return estadoCuentaDeAlumno(alumnoId, pagos, alumno?.fechaAlta);
      },
      getPagosDeAlumno: (alumnoId) =>
        pagos
          .filter((p) => p.alumnoId === alumnoId)
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }),
    [alumnos, pagos, rutinas, videosTecnica, usuarioActual]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData debe usarse dentro de <AppDataProvider>");
  }
  return ctx;
}
