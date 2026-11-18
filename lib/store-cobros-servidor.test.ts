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
  simulado.getStoredJwtToken = vi.fn(() => "jwt-de-prueba");
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
  mock(api.getStoredJwtToken).mockReturnValue("jwt-de-prueba");
  mock(api.apiRegistrarPago).mockReset();
  mock(api.apiGetPagos).mockResolvedValue([]);
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


const nuevo = { alumnoId:"2", plan:"Plan 3 días", planId:"3", monto:20000, fecha:"2026-11-17", periodoMes:"2026-11", metodo:"Efectivo", estado:"PAGADO" as const };
const confirmado = { id:99, alumnoId:2, alumnoNombre:"Socio Prueba", planId:3, planNombre:"Plan 3 días", monto:20000, montoAbonado:20000, fecha:"2026-11-17", periodoMes:"2026-11", metodo:"EFECTIVO", estado:"PAGADO" };
describe("cobros confirmados por servidor",()=>{
 it("no inserta mientras espera y usa el ID confirmado",async()=>{
  let resolver!: (v: unknown)=>void;
  mock(api.apiRegistrarPago).mockReturnValue(new Promise(r=>{resolver=r;}));
  const {result}=await montarStoreConDatos();
  let pendiente!: ReturnType<typeof result.current.agregarPago>;
  act(()=>{pendiente=result.current.agregarPago(nuevo);});
  expect(result.current.pagos).toEqual([]);
  await act(async()=>{resolver(confirmado);expect((await pendiente).ok).toBe(true);});
  expect(result.current.pagos).toHaveLength(1);expect(result.current.pagos[0].id).toBe("99");
 });
 it.each([409,500])("no inserta ni informa éxito ante %s",async status=>{
  mock(api.apiRegistrarPago).mockRejectedValue(Object.assign(new Error("Rechazado"),{status}));
  const {result}=await montarStoreConDatos();
  await act(async()=>expect(await result.current.agregarPago(nuevo)).toMatchObject({ok:false,error:"Rechazado"}));
  expect(result.current.pagos).toEqual([]);
 });
 it("sin token no guarda un cobro local",async()=>{
  const {result}=await montarStoreConDatos();mock(api.getStoredJwtToken).mockReturnValue(null);
  await act(async()=>expect(await result.current.agregarPago(nuevo)).toMatchObject({ok:false,status:401}));
  expect(api.apiRegistrarPago).not.toHaveBeenCalled();expect(result.current.pagos).toEqual([]);
 });
 it("respuesta perdida: consultar recupera el pago sin otro POST",async()=>{
  mock(api.apiRegistrarPago).mockRejectedValue(new TypeError("Failed to fetch"));
  const {result}=await montarStoreConDatos();
  await act(async()=>expect(await result.current.agregarPago(nuevo)).toMatchObject({ok:false,esIncierto:true}));
  expect(result.current.pagos).toEqual([]);
  mock(api.apiGetPagos).mockResolvedValue([confirmado]);
  await act(async()=>expect(await result.current.refrescarPagos()).toBe(true));
  expect(result.current.pagos[0].id).toBe("99");expect(api.apiRegistrarPago).toHaveBeenCalledTimes(1);
 });
});
