/**
 * Cada edición de un socio, plan o rutina tiene que llegar al servidor.
 *
 * Bug: actualizarAlumno/actualizarPlan/actualizarRutina armaban el objeto actualizado DENTRO de la
 * función que se le pasa a setState(prev => ...) y después decidían si mandar el PUT según esa
 * variable. React no siempre ejecuta esa función en el momento: si el componente ya tiene una
 * actualización pendiente, la corre recién en el próximo render. En ese caso la variable seguía en
 * null, el PUT no salía, la pantalla mostraba el cambio y al recargar se perdía.
 *
 * Se prueba con el store real (AppDataProvider) y el api-client simulado como si hubiera servidor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("./api-client", async (importOriginal) => {
  const real = await importOriginal<typeof import("./api-client")>();
  const simulado: Record<string, unknown> = { ...real };
  // Todo pedido al servidor responde vacío salvo los que se definen abajo.
  for (const [nombre, valor] of Object.entries(real)) {
    if (nombre.startsWith("api") && typeof valor === "function") {
      simulado[nombre] = vi.fn(async () => []);
    }
  }
  simulado.isApiRuntimeEnabled = () => true;
  simulado.permiteDatosDeEjemplo = () => false;
  simulado.getStoredJwtToken = () => "jwt-de-prueba";
  return simulado;
});

import * as api from "./api-client";
import { AppDataProvider, useAppData } from "./store";

const ALUMNO_DTO = {
  id: 2,
  nombre: "Socio Prueba",
  dni: "30111222",
  email: null,
  celular: "5491100000000",
  planId: 3,
  planNombre: "Plan 3 días",
  fechaAlta: "2026-11-01",
  ultimaAsistencia: null,
  activo: true,
  estadoCuenta: "AL_DIA",
  rutinaId: null,
  rutinaNombre: null,
  version: 1,
};
const PLAN_DTO = { id: 3, nombre: "Plan 3 días", precio: 20000, diaPorSemana: "3 días", activo: true };
const RUTINA_DTO = {
  id: 1,
  nombre: "Rutina A",
  descripcion: "Desc",
  objetivo: "HIPERTROFIA",
  esGenerica: true,
  dias: [],
};

const mock = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AppDataProvider, null, children);
}

async function montarStoreConDatos() {
  const hook = renderHook(() => useAppData(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.alumnos.map((a) => a.id)).toContain("2");
    expect(hook.result.current.planes.map((p) => p.id)).toContain("3");
    expect(hook.result.current.rutinas.map((r) => r.id)).toContain("1");
  });
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(
    "atlas_sesion_v1",
    JSON.stringify({ id: "u1", nombre: "Titular", rol: "ADMIN", email: "titular@e2e.local" })
  );
  mock(api.apiGetAlumnos).mockResolvedValue([ALUMNO_DTO]);
  mock(api.apiGetPlanes).mockResolvedValue([PLAN_DTO]);
  mock(api.apiGetRutinas).mockResolvedValue([RUTINA_DTO]);
  mock(api.apiGetConfiguracionCobro).mockResolvedValue({ alias: "", titular: "" });
  // El servidor devuelve lo que recibió (como el backend real).
  mock(api.apiActualizarAlumno).mockImplementation(async (_id: number, dto: Record<string, unknown>) => ({
    ...ALUMNO_DTO,
    ...dto,
    id: 2,
  }));
  mock(api.apiActualizarPlan).mockImplementation(async (_id: number, dto: Record<string, unknown>) => ({
    ...PLAN_DTO,
    ...dto,
    id: 3,
  }));
  mock(api.apiActualizarRutina).mockImplementation(async (_id: number, dto: Record<string, unknown>) => ({
    ...RUTINA_DTO,
    ...dto,
    id: 1,
  }));
});

describe("ediciones que llegan al servidor", () => {
  it("dos ediciones seguidas de un socio mandan dos PUT, el último con el valor final", async () => {
    const { result } = await montarStoreConDatos();

    act(() => result.current.actualizarAlumno("2", { celular: "5491111111111" }));
    act(() => result.current.actualizarAlumno("2", { celular: "5491122222222" }));

    await waitFor(() => expect(api.apiActualizarAlumno).toHaveBeenCalledTimes(2));
    const ultimo = mock(api.apiActualizarAlumno).mock.calls.at(-1)!;
    expect(ultimo[0]).toBe(2);
    expect(ultimo[1]).toMatchObject({ celular: "5491122222222" });
  });

  it("una edición de socio con otra actualización pendiente en el mismo turno también sale", async () => {
    const { result } = await montarStoreConDatos();

    act(() => {
      result.current.actualizarAlumno("2", { celular: "5491111111111" });
      result.current.actualizarAlumno("2", { email: "socio@e2e.local" });
    });

    await waitFor(() => expect(api.apiActualizarAlumno).toHaveBeenCalledTimes(2));
    expect(mock(api.apiActualizarAlumno).mock.calls.at(-1)![1]).toMatchObject({
      celular: "5491111111111",
      email: "socio@e2e.local",
    });
  });

  it("dos ediciones seguidas de un plan mandan dos PUT, el último con el precio final", async () => {
    const { result } = await montarStoreConDatos();

    act(() => result.current.actualizarPlan("3", { precio: 21000 }));
    act(() => result.current.actualizarPlan("3", { precio: 22000 }));

    await waitFor(() => expect(api.apiActualizarPlan).toHaveBeenCalledTimes(2));
    expect(mock(api.apiActualizarPlan).mock.calls.at(-1)![1]).toMatchObject({ precio: 22000 });
  });

  it("dos ediciones seguidas de una rutina mandan dos PUT, el último con el nombre final", async () => {
    const { result } = await montarStoreConDatos();

    act(() => result.current.actualizarRutina("1", { nombre: "Rutina B" }));
    act(() => result.current.actualizarRutina("1", { nombre: "Rutina C" }));

    await waitFor(() => expect(api.apiActualizarRutina).toHaveBeenCalledTimes(2));
    expect(mock(api.apiActualizarRutina).mock.calls.at(-1)![1]).toMatchObject({ nombre: "Rutina C" });
  });

  it("si el servidor rechaza la edición del socio, la pantalla vuelve al valor anterior", async () => {
    const { result } = await montarStoreConDatos();
    mock(api.apiActualizarAlumno).mockRejectedValueOnce(new Error("Error de red"));

    act(() => result.current.actualizarAlumno("2", { celular: "5491199999999" }));

    await waitFor(() =>
      expect(result.current.alumnos.find((a) => a.id === "2")?.celular).toBe("5491100000000")
    );
  });
});
