// app/backend-api/[...path]/route.ts
// Proxy inverso dinámico en tiempo de ejecución (Next.js App Router -> Spring Boot).
// Permite que celulares en Wi-Fi LAN (192.168.x.x:3000), la tablet del Tótem y dominios HTTPS
// consuman el mismo origen (/backend-api/*) sin depender de "localhost:8080" en el navegador
// ni chocar con rutas internas de Next.js (/api/ejercicios).

import { NextRequest, NextResponse } from "next/server";
import { resolverUrlUpstreamBackend } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const HEADERS_REENVIABLES = [
  "authorization",
  "content-type",
  "accept",
  "x-totem-secret",
] as const;

async function proxyHaciaSpringBoot(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const subRuta = Array.isArray(path) ? path.join("/") : "";
  const upstreamBase = resolverUrlUpstreamBackend(process.env.BACKEND_INTERNAL_URL);
  const search = request.nextUrl.search || "";
  const targetUrl = `${upstreamBase}/api/${subRuta}${search}`;

  const headers = new Headers();
  for (const h of HEADERS_REENVIABLES) {
    const val = request.headers.get(h);
    if (val) {
      headers.set(h, val);
    }
  }

  // Preservar IP real del cliente para rate-limiting en Spring Boot (server.forward-headers-strategy=framework)
  const xff = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  if (xff) {
    headers.set("x-forwarded-for", xff);
  }
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  if (proto) {
    headers.set("x-forwarded-proto", proto);
  }
  const host = request.headers.get("host");
  if (host) {
    headers.set("x-forwarded-host", host);
  }

  const metodo = request.method.toUpperCase();
  let body: ArrayBuffer | undefined = undefined;
  if (metodo !== "GET" && metodo !== "HEAD") {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > 0) {
      body = buffer;
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: metodo,
      headers,
      body,
      cache: "no-store",
    });

    if (upstream.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const respBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/json";

    return new NextResponse(respBuffer, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: 503,
        codigo: "BACKEND_UNREACHABLE",
        mensaje: "No se pudo conectar con el servidor central del gimnasio.",
      },
      {
        status: 503,
        headers: {
          "X-Atlas-Upstream-Offline": "1",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyHaciaSpringBoot(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyHaciaSpringBoot(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyHaciaSpringBoot(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyHaciaSpringBoot(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyHaciaSpringBoot(request, context);
}
