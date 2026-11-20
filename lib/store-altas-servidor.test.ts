import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("./api-client", async (importOriginal) => {
  const real = await importOriginal<typeof import("./api-client")>();
  const simulado: Record<string, unknown> = { ...real };
  for (const [nombre, valor] of Object.entries(real)) {
    if (nombre.startsWith("api") && typeof valor === "function") {
      simulado[nombre] = vi.fn(async () => []);
    }
  }
  simulado.isApiRuntimeEnabled = () => true;
  simulado.permiteDatosDeEjemplo = () => false;
  simulado.getStoredJwtToken = vi.fn(() => "jwt-de-prueba");
  return simulado;
});

import * as api from "./api-client";
import { AppDataProvider, useAppData } from "./store";

const PLAN_DTO = { id: 3, nombre: "Plan 3 días", precio: 20000, diaPorSemana: "3 días", activo: true };
const CREADO_DTO = {
  id: 7,
  nombre: "Socio Nuevo",
  dni: "40111222",
  email: null,
  celular: "2611234567",
  planId: 3,
  planNombre: "Plan 3 días",
  fechaAlta: "2026-11-18",
  ultimaAsistencia: null,
  activo: true,
  estadoCuenta: "PENDIENTE",
  rutinaId: null,
  rutinaNombre: null,
  version: 0,
};
const nuevo = {
  nombre: "Socio Nuevo",
  dni: "40111222",
  celular: "2611234567",
  planId: "3",
  plan: "Plan 3 días",
  fechaAlta: "2026-11-18",
  activo: true,
};

const mock = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AppDataProvider, null, children);
}

async function montarStore() {
  const hook = renderHook(() => useAppData(), { wrapper });
  await waitFor(() => expect(hook.result.current.planes.map((p) => p.id)).toContain("3"));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mock(api.getStoredJwtToken).mockReturnValue("jwt-de-prueba");
  mock(api.apiCrearAlumno).mockReset();
  localStorage.clear();
  localStorage.setItem(
    "atlas_sesion_v1",
    JSON.stringify({ id: "u1", nombre: "Titular", rol: "ADMIN", email: "titular@e2e.local" })
  );
  mock(api.apiGetAlumnos).mockResolvedValue([]);
  mock(api.apiGetPlanes).mockResolvedValue([PLAN_DTO]);
  mock(api.apiGetConfiguracionCobro).mockResolvedValue({ alias: "", titular: "" });
});

describe("altas de socios confirmadas por el servidor", () => {
  it("no muestra al socio mientras espera y usa el ID que da el servidor", async () => {
    let resolver!: (v: unknown) => void;
    mock(api.apiCrearAlumno).mockReturnValue(new Promise((r) => { resolver = r; }));
    const { result } = await montarStore();
    let pendiente!: ReturnType<typeof result.current.agregarAlumno>;
    act(() => { pendiente = result.current.agregarAlumno(nuevo); });
    expect(result.current.alumnos).toEqual([]);
    await act(async () => {
      resolver(CREADO_DTO);
      expect((await pendiente).ok).toBe(true);
    });
    expect(result.current.alumnos.map((a) => a.id)).toEqual(["7"]);
  });

  it.each([409, 500])("ante %s no agrega al socio y devuelve el error", async (status) => {
    mock(api.apiCrearAlumno).mockRejectedValue(
      Object.assign(new Error("El DNI 40111222 ya pertenece a un socio registrado."), { status })
    );
    const { result } = await montarStore();
    await act(async () =>
      expect(await result.current.agregarAlumno(nuevo)).toMatchObject({
        ok: false,
        error: "El DNI 40111222 ya pertenece a un socio registrado.",
        status,
      })
    );
    expect(result.current.alumnos).toEqual([]);
  });

  it("si se corta la red avisa que hay que buscarlo por DNI antes de reintentar", async () => {
    mock(api.apiCrearAlumno).mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = await montarStore();
    const res = await act(async () => result.current.agregarAlumno(nuevo));
    expect(res).toMatchObject({ ok: false });
    expect(res.ok ? "" : res.error).toContain("Buscá al socio por DNI");
    expect(result.current.alumnos).toEqual([]);
  });

  it("sin sesión no manda el alta ni agrega un socio local", async () => {
    const { result } = await montarStore();
    mock(api.getStoredJwtToken).mockReturnValue(null);
    await act(async () =>
      expect(await result.current.agregarAlumno(nuevo)).toMatchObject({ ok: false, status: 401 })
    );
    expect(api.apiCrearAlumno).not.toHaveBeenCalled();
    expect(result.current.alumnos).toEqual([]);
  });
});
