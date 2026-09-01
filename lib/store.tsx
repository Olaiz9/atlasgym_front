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

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { Alumno, Pago, EstadoPago, EstadoCuenta, estadoCuentaDeAlumno } from "./types";
import { ALUMNOS_MOCK, PAGOS_MOCK } from "./mock-data";

interface AppDataContextValue {
  alumnos: Alumno[];
  pagos: Pago[];
  agregarAlumno: (alumno: Omit<Alumno, "id">) => Alumno;
  actualizarAlumno: (id: string, cambios: Partial<Omit<Alumno, "id">>) => void;
  eliminarAlumno: (id: string) => void;
  agregarPago: (pago: Omit<Pago, "id">) => void;
  actualizarEstadoPago: (id: string, estado: EstadoPago) => void;
  eliminarPago: (id: string) => void;
  getAlumno: (id: string) => Alumno | undefined;
  getEstadoCuenta: (alumnoId: string) => EstadoCuenta;
  getPagosDeAlumno: (alumnoId: string) => Pago[];
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [alumnos, setAlumnos] = useState<Alumno[]>(ALUMNOS_MOCK);
  const [pagos, setPagos] = useState<Pago[]>(PAGOS_MOCK);

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

  const value = useMemo<AppDataContextValue>(
    () => ({
      alumnos,
      pagos,
      agregarAlumno,
      actualizarAlumno,
      eliminarAlumno,
      agregarPago,
      actualizarEstadoPago,
      eliminarPago,
      getAlumno: (id) => alumnos.find((a) => a.id === id),
      getEstadoCuenta: (alumnoId) => estadoCuentaDeAlumno(alumnoId, pagos),
      getPagosDeAlumno: (alumnoId) =>
        pagos
          .filter((p) => p.alumnoId === alumnoId)
          .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }),
    [alumnos, pagos]
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
