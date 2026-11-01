import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  apiFetch,
  esErrorDeRed,
  esFallbackOfflineDemoPermitido,
  normalizarApiBaseUrl,
  resolverUrlUpstreamBackend,
} from "./api-client";
import { GET, POST } from "@/app/backend-api/[...path]/route";

describe("Etapa 1 - Conectividad Real LAN/Móvil, Proxy Inverso y Bloqueo de Login Fantasma", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_INTERNAL_URL;
  });

  it("normalizarApiBaseUrl usa /backend-api por defecto y repara URLs externas sin sufijo /api", () => {
    expect(normalizarApiBaseUrl(undefined)).toBe("/backend-api");
    expect(normalizarApiBaseUrl("")).toBe("/backend-api");
    expect(normalizarApiBaseUrl("   ")).toBe("/backend-api");
    expect(normalizarApiBaseUrl("/backend-api/")).toBe("/backend-api");
    expect(normalizarApiBaseUrl("http://localhost:8080")).toBe("http://localhost:8080/api");
    expect(normalizarApiBaseUrl("http://localhost:8080/")).toBe("http://localhost:8080/api");
    expect(normalizarApiBaseUrl("http://localhost:8080/api/")).toBe("http://localhost:8080/api");
    expect(normalizarApiBaseUrl("https://api.atlasgym.com.ar/")).toBe(
      "https://api.atlasgym.com.ar/api"
    );
    expect(normalizarApiBaseUrl("https://atlasgym.com.ar/v1/api/")).toBe(
      "https://atlasgym.com.ar/v1/api"
    );
  });

  it("resolverUrlUpstreamBackend limpia barras finales y evita duplicar /api/api", () => {
    expect(resolverUrlUpstreamBackend(undefined)).toBe("http://127.0.0.1:8080");
    expect(resolverUrlUpstreamBackend("http://backend:8080/")).toBe("http://backend:8080");
    expect(resolverUrlUpstreamBackend("http://backend:8080/api")).toBe("http://backend:8080");
    expect(resolverUrlUpstreamBackend("http://backend:8080/api/")).toBe("http://backend:8080");
  });

  it("esFallbackOfflineDemoPermitido bloquea sesiones fantasma admin123 en producción o navegadores ya sincronizados", () => {
    expect(
      esFallbackOfflineDemoPermitido({
        apiRuntimeActivo: true,
        nodeEnv: "production",
        yaSincronizadoConBackend: false,
      })
    ).toBe(false);

    expect(
      esFallbackOfflineDemoPermitido({
        apiRuntimeActivo: true,
        nodeEnv: "development",
        yaSincronizadoConBackend: true,
      })
    ).toBe(false);

    expect(
      esFallbackOfflineDemoPermitido({
        apiRuntimeActivo: true,
        nodeEnv: "development",
        yaSincronizadoConBackend: false,
      })
    ).toBe(true);

    expect(
      esFallbackOfflineDemoPermitido({
        apiRuntimeActivo: true,
        nodeEnv: "production",
        allowOfflineDemoEnv: "true",
      })
    ).toBe(true);

    expect(
      esFallbackOfflineDemoPermitido({
        apiRuntimeActivo: false,
        nodeEnv: "production",
      })
    ).toBe(true);
  });

  it("apiFetch y esErrorDeRed detectan caída del backend a través del proxy 503 BACKEND_UNREACHABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 503,
          codigo: "BACKEND_UNREACHABLE",
          mensaje: "No se pudo conectar con el servidor central del gimnasio.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "X-Atlas-Upstream-Offline": "1",
          },
        }
      )
    );

    let capturado: unknown = null;
    try {
      await apiFetch("/auth/login", { method: "POST" });
    } catch (err) {
      capturado = err;
    }

    expect(capturado).toBeInstanceOf(Error);
    expect(esErrorDeRed(capturado)).toBe(true);
    expect(esErrorDeRed(new Error("Credenciales inválidas"))).toBe(false);
  });

  it("proxy /backend-api/[...path] reenvía cabeceras seguras a Spring Boot sin filtrar Origin y responde 503 limpio si cae", async () => {
    process.env.BACKEND_INTERNAL_URL = "http://backend:8080/";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-ok", rol: "ADMIN" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://192.168.1.50:3000/backend-api/auth/login?modo=admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-previo",
        "X-Totem-Secret": "secreto-tablet",
        Origin: "http://192.168.1.50:3000",
      },
      body: JSON.stringify({ email: "admin@atlasgym.com", password: "clave" }),
    });

    const res = await POST(req, { params: Promise.resolve({ path: ["auth", "login"] }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("jwt-ok");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe("http://backend:8080/api/auth/login?modo=admin");
    const forwardedHeaders = calledInit?.headers as Headers;
    expect(forwardedHeaders.get("authorization")).toBe("Bearer token-previo");
    expect(forwardedHeaders.get("x-totem-secret")).toBe("secreto-tablet");
    // No debe reenviar Origin en llamada server-to-server para no disparar 403 CORS desde IPs LAN dinámicas
    expect(forwardedHeaders.get("origin")).toBeNull();

    // Si Spring Boot está apagado, devuelve 503 estructurado con X-Atlas-Upstream-Offline: 1
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed: ECONNREFUSED"));
    const reqCaido = new NextRequest("http://192.168.1.50:3000/backend-api/planes");
    const resCaido = await GET(reqCaido, { params: Promise.resolve({ path: ["planes"] }) });
    expect(resCaido.status).toBe(503);
    expect(resCaido.headers.get("x-atlas-upstream-offline")).toBe("1");
    const bodyCaido = await resCaido.json();
    expect(bodyCaido.codigo).toBe("BACKEND_UNREACHABLE");
  });
});
