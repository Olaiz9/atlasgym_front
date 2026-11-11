import { describe, expect, it } from "vitest";
import { verificarClaveTerminal } from "./totem-offline";

function fetchFalso(status: number, body: unknown = []) {
  const llamadas: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, headers: (init?.headers || {}) as Record<string, string> });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, llamadas };
}

describe("Tótem — verificación real de la clave de terminal", () => {
  it("200 = clave válida y devuelve el padrón; manda solo el secreto (sin JWT)", async () => {
    const padron = [{ alumnoId: 1, nombre: "Prueba", dni: "30111222", planNombre: "X", limiteDiasSemana: 3, estadoCuenta: "AL_DIA", activo: true }];
    const { impl, llamadas } = fetchFalso(200, padron);
    const res = await verificarClaveTerminal(" secreto-ok ", "/backend-api", impl);
    expect(res).toEqual({ estado: "VALIDA", padron });
    expect(llamadas[0].url).toBe("/backend-api/asistencias/totem/padron-cache");
    expect(llamadas[0].headers["X-Totem-Secret"]).toBe("secreto-ok");
    expect(llamadas[0].headers).not.toHaveProperty("Authorization");
  });

  it("401/403 = clave incorrecta", async () => {
    expect((await verificarClaveTerminal("mala", "/b", fetchFalso(403).impl)).estado).toBe("INVALIDA");
    expect((await verificarClaveTerminal("mala", "/b", fetchFalso(401).impl)).estado).toBe("INVALIDA");
  });

  it("clave vacía es inválida sin consultar al servidor", async () => {
    const { impl, llamadas } = fetchFalso(200);
    expect((await verificarClaveTerminal("   ", "/b", impl)).estado).toBe("INVALIDA");
    expect(llamadas).toHaveLength(0);
  });

  it("503 del proxy o corte de red = sin conexión (no se descarta la clave guardada)", async () => {
    expect((await verificarClaveTerminal("x", "/b", fetchFalso(503).impl)).estado).toBe("SIN_CONEXION");
    const caido = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect((await verificarClaveTerminal("x", "/b", caido)).estado).toBe("SIN_CONEXION");
  });
});
