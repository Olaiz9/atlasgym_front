import { describe, it, expect } from "vitest";
import { AVISOS_MOCK } from "@/lib/mock-data";
import { CATEGORIA_AVISO_STYLES, Aviso, UsuarioSesion } from "@/lib/types";

describe("Módulo de Avisos y Notificaciones (lib/avisos.test.ts)", () => {
  describe("Definición de Categorías y Estilos", () => {
    it("debe contener estilos visuales para todas las categorías requeridas", () => {
      expect(CATEGORIA_AVISO_STYLES).toHaveProperty("IMPORTANTE");
      expect(CATEGORIA_AVISO_STYLES).toHaveProperty("NOVEDAD");
      expect(CATEGORIA_AVISO_STYLES).toHaveProperty("HORARIO");
    });

    it("cada categoría debe definir etiqueta, badge y borde", () => {
      const categorias = ["IMPORTANTE", "NOVEDAD", "HORARIO"] as const;
      for (const cat of categorias) {
        const estilo = CATEGORIA_AVISO_STYLES[cat];
        expect(estilo.label).toBeDefined();
        expect(estilo.badge).toBeDefined();
        expect(estilo.border).toBeDefined();
      }
    });
  });

  describe("Datos Mock Iniciales (AVISOS_MOCK)", () => {
    it("debe contener al menos 3 avisos iniciales con estructura válida", () => {
      expect(AVISOS_MOCK.length).toBeGreaterThanOrEqual(3);
      for (const aviso of AVISOS_MOCK) {
        expect(aviso.id).toBeDefined();
        expect(aviso.titulo).toBeTruthy();
        expect(aviso.mensaje).toBeTruthy();
        expect(aviso.fecha).toBeTruthy();
        expect(["IMPORTANTE", "NOVEDAD", "HORARIO"]).toContain(aviso.categoria);
        expect(Array.isArray(aviso.leidoPor)).toBe(true);
      }
    });

    it("debe incluir avisos generales y avisos individuales para alumnos", () => {
      const generales = AVISOS_MOCK.filter((a) => a.paraTodos);
      const individuales = AVISOS_MOCK.filter((a) => !a.paraTodos);
      expect(generales.length).toBeGreaterThan(0);
      expect(individuales.length).toBeGreaterThan(0);
      expect(individuales[0].alumnoId).toBeDefined();
    });
  });

  describe("Lógica de Filtrado por Rol y Usuario", () => {
    const usuarioAdmin: UsuarioSesion = {
      id: "u_admin",
      nombre: "Franco Admin",
      rol: "ADMIN",
    };

    const usuarioAlumnoA1: UsuarioSesion = {
      id: "u_alumno_1",
      nombre: "Lucía Fernández",
      rol: "ALUMNO",
      alumnoId: "a1",
    };

    const usuarioAlumnoA2: UsuarioSesion = {
      id: "u_alumno_2",
      nombre: "Carlos Gómez",
      rol: "ALUMNO",
      alumnoId: "a2",
    };

    function filtrarAvisos(avisos: Aviso[], usuario: UsuarioSesion): Aviso[] {
      if (usuario.rol === "ADMIN") {
        return avisos;
      }
      return avisos.filter(
        (av) => av.paraTodos || (usuario.alumnoId && av.alumnoId === usuario.alumnoId)
      );
    }

    it("el ADMIN debe ver todos los avisos sin excepción", () => {
      const visiblesAdmin = filtrarAvisos(AVISOS_MOCK, usuarioAdmin);
      expect(visiblesAdmin).toHaveLength(AVISOS_MOCK.length);
    });

    it("el Alumno a1 debe ver avisos generales y los dirigidos a él (a1)", () => {
      const visiblesA1 = filtrarAvisos(AVISOS_MOCK, usuarioAlumnoA1);
      const todosAvisosSonValidos = visiblesA1.every(
        (av) => av.paraTodos || av.alumnoId === "a1"
      );
      expect(todosAvisosSonValidos).toBe(true);
      expect(visiblesA1).toHaveLength(3);
    });

    it("el Alumno a2 NO debe ver avisos dirigidos exclusivamente a a1", () => {
      const visiblesA2 = filtrarAvisos(AVISOS_MOCK, usuarioAlumnoA2);
      const contieneAvisoDeA1 = visiblesA2.some((av) => av.alumnoId === "a1");
      expect(contieneAvisoDeA1).toBe(false);
      expect(visiblesA2).toHaveLength(2);
    });
  });

  describe("Lógica de Lectura y Conteo de No Leídos", () => {
    const usuarioAlumnoA1: UsuarioSesion = {
      id: "u_alumno_1",
      nombre: "Lucía Fernández",
      rol: "ALUMNO",
      alumnoId: "a1",
    };

    it("debe calcular correctamente la cantidad de avisos no leídos para un alumno", () => {
      const avisosParaA1 = AVISOS_MOCK.filter(
        (av) => av.paraTodos || av.alumnoId === "a1"
      );
      const noLeidos = avisosParaA1.filter(
        (av) => !av.leidoPor.includes(usuarioAlumnoA1.id)
      );
      expect(noLeidos.length).toBe(2);
    });

    it("debe marcar como leído agregando el id del usuario sin duplicar", () => {
      const aviso: Aviso = {
        id: "av-test",
        titulo: "Test",
        mensaje: "Mensaje de prueba",
        categoria: "NOVEDAD",
        fecha: "2026-09-06",
        paraTodos: true,
        leidoPor: [],
      };

      const userId = "u_alumno_1";
      const marcarLeido = (a: Aviso, uid: string): Aviso => {
        if (a.leidoPor.includes(uid)) return a;
        return { ...a, leidoPor: [...a.leidoPor, uid] };
      };

      const leido1 = marcarLeido(aviso, userId);
      expect(leido1.leidoPor).toContain(userId);
      expect(leido1.leidoPor.length).toBe(1);

      const leido2 = marcarLeido(leido1, userId);
      expect(leido2.leidoPor.length).toBe(1);
    });
  });
});
