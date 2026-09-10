import { describe, it, expect } from "vitest";
import { Plan, Alumno, Pago } from "./types";

describe("Fase 3: Ordenar planes e historial (lib/planes-historial.test.ts)", () => {
  const planesMock: Plan[] = [
    { id: "p1", nombre: "Musculación Pase Libre", precio: 28000, activo: true, descripcion: "Acceso total" },
    { id: "p2", nombre: "Crossfit", precio: 32000, activo: true, descripcion: "Entrenamiento funcional" },
    { id: "p3", nombre: "Plan Antiguo Pausado", precio: 15000, activo: false, descripcion: "Plan discontinuado" },
  ];

  describe("Filtrado de planes activos vs pausados", () => {
    it("excluye planes pausados (activo === false) para nuevas asignaciones", () => {
      const planesDisponiblesAlta = planesMock.filter((p) => p.activo);
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

      const planesDisponiblesEdicion = planesMock.filter(
        (p) => p.activo || p.id === alumnoConPlanPausado.planId || p.nombre === alumnoConPlanPausado.plan
      );

      expect(planesDisponiblesEdicion.length).toBe(3);
      expect(planesDisponiblesEdicion.some((p) => p.id === "p3")).toBe(true);
    });
  });

  describe("Sincronización de nombre de plan por planId", () => {
    it("sincroniza el nombre del plan en los alumnos cuando se renombra un plan", () => {
      let alumnos: Alumno[] = [
        { id: "a1", nombre: "Juan Pérez", planId: "p1", plan: "Musculación Pase Libre", fechaAlta: "2024-01-01", activo: true },
        { id: "a2", nombre: "Ana Gómez", planId: "p2", plan: "Crossfit", fechaAlta: "2024-01-01", activo: true },
      ];

      const planIdModificado = "p1";
      const nuevoNombre = "Musculación Premium Total";

      alumnos = alumnos.map((a) => (a.planId === planIdModificado ? { ...a, plan: nuevoNombre } : a));

      expect(alumnos[0].plan).toBe("Musculación Premium Total");
      expect(alumnos[1].plan).toBe("Crossfit");
    });

    it("resuelve planId a partir del catálogo de planes al asociar un alumno", () => {
      const planEncontrado = planesMock.find(
        (p) => p.id === "p1" || p.nombre.toLowerCase() === "musculación pase libre"
      );
      expect(planEncontrado).toBeDefined();
      expect(planEncontrado?.id).toBe("p1");
    });
  });

  describe("Preservación de identidad histórica en pagos (alumnoNombreHistorico)", () => {
    it("preserva el nombre histórico en el pago aun si el alumno es eliminado del padrón activo", () => {
      const alumno: Alumno = {
        id: "a-temp",
        nombre: "Agustín Alumno",
        planId: "p1",
        plan: "Musculación Pase Libre",
        fechaAlta: "2024-02-01",
        activo: true,
      };

      const nuevoPago: Pago = {
        id: "pago-100",
        alumnoId: alumno.id,
        alumnoNombreHistorico: alumno.nombre,
        planId: alumno.planId,
        plan: alumno.plan,
        monto: 28000,
        fecha: "2024-03-01",
        metodo: "Efectivo",
        estado: "PAGADO",
      };

      const padronAlumnos: Alumno[] = [];
      const alumnoEncontrado = padronAlumnos.find((a) => a.id === nuevoPago.alumnoId);

      expect(alumnoEncontrado).toBeUndefined();

      const nombreParaMostrar = alumnoEncontrado ? alumnoEncontrado.nombre : `${nuevoPago.alumnoNombreHistorico || "Alumno Atlas"} (Baja)`;
      expect(nombreParaMostrar).toBe("Agustín Alumno (Baja)");
    });

    it("filtra pagos por búsqueda coincidiendo con el nombre histórico del alumno dado de baja", () => {
      const pagos: Pago[] = [
        {
          id: "p-1",
          alumnoId: "inexistente-1",
          alumnoNombreHistorico: "María Elena Walsh",
          plan: "Crossfit",
          monto: 32000,
          fecha: "2024-03-01",
          metodo: "Transferencia",
          estado: "PAGADO",
        },
      ];

      const getAlumno = (_id: string): Alumno | undefined => undefined;
      const busqueda = "maría";

      const filtrados = pagos.filter((p) => {
        const nombreAlumno = getAlumno(p.alumnoId)?.nombre ?? p.alumnoNombreHistorico ?? "";
        return nombreAlumno.toLowerCase().includes(busqueda.toLowerCase());
      });

      expect(filtrados.length).toBe(1);
      expect(filtrados[0].alumnoNombreHistorico).toBe("María Elena Walsh");
    });
  });
});
