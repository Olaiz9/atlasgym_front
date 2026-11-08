import { describe, expect, it } from "vitest";
import { resumirRevisionImportacion, type SocioImportadoDto } from "./importacion-revision";

const socio = (fila: number, estado: SocioImportadoDto["estado"]): SocioImportadoDto => ({
  fila,
  nombre: `Socio ${fila}`,
  dni: String(40000000 + fila),
  nuevo: true,
  plan: "Pase Libre",
  estado,
});

describe("revisión del simulacro de importación", () => {
  it("lista los morosos en el orden de la planilla y cuenta todos los estados", () => {
    const r = resumirRevisionImportacion({
      estados: { AL_DIA: 1, MOROSO: 2 },
      socios: [socio(7, "MOROSO"), socio(2, "AL_DIA"), socio(3, "MOROSO")],
    });
    expect(r.conEstados).toBe(true);
    expect(r.porEstado).toEqual({ AL_DIA: 1, PENDIENTE: 0, MOROSO: 2, INACTIVO: 0 });
    expect(r.morosos.map((s) => s.fila)).toEqual([3, 7]);
  });

  it("no se rompe con la respuesta de un back sin estados", () => {
    const r = resumirRevisionImportacion({});
    expect(r.conEstados).toBe(false);
    expect(r.morosos).toEqual([]);
    expect(r.porEstado.MOROSO).toBe(0);
  });
});
