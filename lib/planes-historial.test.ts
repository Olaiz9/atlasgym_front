import { describe, it, expect } from "vitest";
import { Plan, Alumno, Pago, Rutina } from "./types";
import {
  filtrarPlanesDisponibles,
  sincronizarNombrePlanEnAlumnos,
  puedeEliminarPlan,
  ejecutarBajaAlumno,
  resolverNombreParaMostrarPago,
} from "./plan-utils";

describe("Fase 3 & 5: Gestión de Planes e Integridad en Bajas (lib/planes-historial.test.ts)", () => {
  const planesMock: Plan[] = [
    { id: "p1", nombre: "Musculación Pase Libre", precio: 28000, activo: true, descripcion: "Acceso total" },
    { id: "p2", nombre: "Crossfit", precio: 32000, activo: true, descripcion: "Entrenamiento funcional" },
    { id: "p3", nombre: "Plan Antiguo Pausado", precio: 15000, activo: false, descripcion: "Plan discontinuado" },
  ];

  describe("Filtrado de planes activos vs pausados (filtrarPlanesDisponibles)", () => {
    it("excluye planes pausados (activo === false) para nuevas asignaciones", () => {
      const planesDisponiblesAlta = filtrarPlanesDisponibles(planesMock);
      expect(planesDisponiblesAlta.length).toBe(2);
      expect(planesDisponiblesAlta.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(planesDisponiblesAlta.some((p) => p.id === "p3")).toBe(false);
    });

    it("permite conservar el plan pausado si el alumno ya lo tenía asignado previamente", () => {
      const alumnoConPlanPausado: Alumno = {
        id: "a1",
        nombre: "Carlos Legado",
        planId: "p3",
        plan: "Plan Antiguo Pausado",
        fechaAlta: "2024-01-01",
        activo: true,
      };

      const planesDisponiblesEdicion = filtrarPlanesDisponibles(
        planesMock,
        alumnoConPlanPausado.planId,
        alumnoConPlanPausado.plan
      );

      expect(planesDisponiblesEdicion.length).toBe(3);
      expect(planesDisponiblesEdicion.some((p) => p.id === "p3")).toBe(true);
    });
  });

  describe("Sincronización de nombre de plan por planId (sincronizarNombrePlanEnAlumnos)", () => {
    it("sincroniza el nombre del plan en los alumnos cuando se renombra un plan", () => {
      const alumnosIniciales: Alumno[] = [
        { id: "a1", nombre: "Juan Pérez", planId: "p1", plan: "Musculación Pase Libre", fechaAlta: "2024-01-01", activo: true },
        { id: "a2", nombre: "Ana Gómez", planId: "p2", plan: "Crossfit", fechaAlta: "2024-01-01", activo: true },
      ];

      const resultado = sincronizarNombrePlanEnAlumnos(alumnosIniciales, "p1", "Musculación Premium Total");

      expect(resultado[0].plan).toBe("Musculación Premium Total");
      expect(resultado[1].plan).toBe("Crossfit");
    });
  });

  describe("Protección contra eliminación de planes en uso (puedeEliminarPlan)", () => {
    it("bloquea la eliminación si existen alumnos asignados al plan", () => {
      const alumnos = [
        { id: "a1", planId: "p1" },
        { id: "a2", planId: "p2" },
      ];

      const res = puedeEliminarPlan("p1", alumnos);
      expect(res.ok).toBe(false);
      expect(res.motivo).toContain("1 alumno(s) asignados");
    });

    it("permite la eliminación si ningún alumno tiene asignado el plan", () => {
      const alumnos = [{ id: "a1", planId: "p1" }];

      const res = puedeEliminarPlan("p2", alumnos);
      expect(res.ok).toBe(true);
    });
  });

  describe("Baja en cascada y auditoría de pagos (ejecutarBajaAlumno & resolverNombreParaMostrarPago)", () => {
    it("elimina el alumno, preserva el nombre en pagos y desasigna rutinas", () => {
      const alumno: Alumno = {
        id: "a-10",
        nombre: "Agustín Alumno",
        planId: "p1",
        plan: "Musculación Pase Libre",
        fechaAlta: "2024-02-01",
        activo: true,
      };

      const pagos: Pago[] = [
        {
          id: "pago-100",
          alumnoId: "a-10",
          plan: "Musculación Pase Libre",
          monto: 28000,
          fecha: "2024-03-01",
          metodo: "Efectivo",
          estado: "PAGADO",
        },
      ];

      const rutinas: Rutina[] = [
        {
          id: "r-1",
          nombre: "Rutina Fuerza",
          objetivo: "Fuerza",
          alumnoIdAsignado: "a-10",
          esGenerica: false,
          dias: [],
        },
      ];

      const res = ejecutarBajaAlumno("a-10", [alumno], pagos, rutinas);

      // 1. Alumno eliminado
      expect(res.alumnos.length).toBe(0);
      // 2. Pago preserva nombre histórico
      expect(res.pagos[0].alumnoNombreHistorico).toBe("Agustín Alumno");
      // 3. Rutina desasignada
      expect(res.rutinas[0].alumnoIdAsignado).toBeUndefined();
      // 4. Formato de visualización con marca de baja
      const label = resolverNombreParaMostrarPago(res.pagos[0]);
      expect(label).toBe("Agustín Alumno (Baja)");
    });
  });
});
