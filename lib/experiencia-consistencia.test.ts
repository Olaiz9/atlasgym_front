import { describe, it, expect } from "vitest";
import { CONTACTO_ATLAS } from "./constants";
import { Rutina } from "./types";

describe("Fase 5: Experiencia de Uso y Consistencia (lib/experiencia-consistencia.test.ts)", () => {
  describe("Constantes Oficiales de Contacto (CONTACTO_ATLAS)", () => {
    it("posee el teléfono y enlace de WhatsApp oficial de Atlas Gym", () => {
      expect(CONTACTO_ATLAS.telefono).toBe("+54 9 261 566-5067");
      expect(CONTACTO_ATLAS.whatsappUrl).toBe("https://wa.me/5492615665067");
      expect(CONTACTO_ATLAS.whatsappUrl).not.toContain("1234567"); // No debe contener números dummy de prueba
    });

    it("posee el email oficial y el usuario de Instagram oficial", () => {
      expect(CONTACTO_ATLAS.email).toBe("gonzalo5jesus@gmail.com");
      expect(CONTACTO_ATLAS.instagram).toBe("@atlasgymoficial_");
      expect(CONTACTO_ATLAS.instagramUrl).toBe("https://www.instagram.com/atlasgymoficial_/");
    });

    it("construye correctamente la URL de WhatsApp con comprobante de pago para alumnos", () => {
      const nombreAlumno = "Lucas González";
      const mensaje = `Hola! Soy ${nombreAlumno}, les adjunto mi comprobante de pago de la cuota.`;
      const urlCompleta = `${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(mensaje)}`;

      expect(urlCompleta.startsWith("https://wa.me/5492615665067?text=")).toBe(true);
      expect(urlCompleta).toContain("Lucas%20Gonz%C3%A1lez");
      expect(urlCompleta).toContain("comprobante%20de%20pago");
    });

    it("construye correctamente la URL de WhatsApp para solicitud de rutina de alumno", () => {
      const nombre = "Carlos";
      const mensaje = `Hola! Soy ${nombre} de ATLAS Gym. Quería consultar con un coach sobre la asignación de mi rutina de entrenamiento.`;
      const urlCompleta = `${CONTACTO_ATLAS.whatsappUrl}?text=${encodeURIComponent(mensaje)}`;

      expect(urlCompleta.startsWith("https://wa.me/5492615665067?text=")).toBe(true);
      expect(urlCompleta).toContain("asignaci%C3%B3n%20de%20mi%20rutina");
    });
  });

  describe("Lógica de Acordeón y Navegación de Días en Rutinas", () => {
    const rutinaMock: Rutina = {
      id: "r-mock-1",
      nombre: "Fuerza e Hipertrofia",
      descripcion: "Rutina 3 días",
      objetivo: "Hipertrofia",
      nivel: "Intermedio",
      dias: [
        { id: "d-1", nombre: "Día 1: Pecho y Bíceps", ejercicios: [] },
        { id: "d-2", nombre: "Día 2: Espalda y Tríceps", ejercicios: [] },
        { id: "d-3", nombre: "Día 3: Piernas y Hombros", ejercicios: [] },
      ],
      alumnosAsignados: [],
    };

    it("evalúa como colapsado por defecto cuando el estado no está inicializado", () => {
      const diaExpandido: Record<string, boolean> = {};
      const expandido = !!diaExpandido[rutinaMock.dias[0].id];
      expect(expandido).toBe(false);
    });

    it("permite expandir y colapsar un día individualmente", () => {
      let diaExpandido: Record<string, boolean> = {};

      // Toggle día 1 -> abre
      diaExpandido = { ...diaExpandido, ["d-1"]: !diaExpandido["d-1"] };
      expect(!!diaExpandido["d-1"]).toBe(true);
      expect(!!diaExpandido["d-2"]).toBe(false);

      // Toggle día 1 nuevamente -> cierra
      diaExpandido = { ...diaExpandido, ["d-1"]: !diaExpandido["d-1"] };
      expect(!!diaExpandido["d-1"]).toBe(false);
    });

    it("permite expandir todos los días juntos cuando no todos están abiertos", () => {
      // Estado inicial: sólo d-1 abierto
      let diaExpandido: Record<string, boolean> = { "d-1": true };

      const estanTodosExpandidos = rutinaMock.dias.every((d) => diaExpandido[d.id]);
      expect(estanTodosExpandidos).toBe(false);

      // Función toggleTodosDias
      const siguiente = { ...diaExpandido };
      rutinaMock.dias.forEach((d) => {
        siguiente[d.id] = !estanTodosExpandidos;
      });
      diaExpandido = siguiente;

      expect(rutinaMock.dias.every((d) => diaExpandido[d.id])).toBe(true);
      expect(diaExpandido["d-1"]).toBe(true);
      expect(diaExpandido["d-2"]).toBe(true);
      expect(diaExpandido["d-3"]).toBe(true);
    });

    it("permite colapsar todos los días juntos cuando todos están abiertos", () => {
      // Estado inicial: todos abiertos
      let diaExpandido: Record<string, boolean> = { "d-1": true, "d-2": true, "d-3": true };

      const estanTodosExpandidos = rutinaMock.dias.every((d) => diaExpandido[d.id]);
      expect(estanTodosExpandidos).toBe(true);

      // Función toggleTodosDias -> colapsa todos
      const siguiente = { ...diaExpandido };
      rutinaMock.dias.forEach((d) => {
        siguiente[d.id] = !estanTodosExpandidos;
      });
      diaExpandido = siguiente;

      expect(rutinaMock.dias.every((d) => diaExpandido[d.id])).toBe(false);
      expect(diaExpandido["d-1"]).toBe(false);
      expect(diaExpandido["d-2"]).toBe(false);
      expect(diaExpandido["d-3"]).toBe(false);
    });
  });
});
