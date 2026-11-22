import { describe, expect, it } from "vitest";
import { coincideBusqueda } from "./utils";

describe("coincideBusqueda", () => {
  it("ignora acentos y mayúsculas en ambos sentidos", () => {
    expect(coincideBusqueda("ramirez", "Diego Ramírez")).toBe(true);
    expect(coincideBusqueda("RAMÍREZ", "diego ramirez")).toBe(true);
    expect(coincideBusqueda("pena", "Peña")).toBe(true);
  });

  it("ignora los puntos del DNI", () => {
    expect(coincideBusqueda("12.345.678", "12345678")).toBe(true);
    expect(coincideBusqueda("12345678", "12.345.678")).toBe(true);
  });

  it("busqueda vacía coincide y campos vacíos no rompen", () => {
    expect(coincideBusqueda("  ", null)).toBe(true);
    expect(coincideBusqueda("ana", undefined, null, "Juan")).toBe(false);
  });
});
