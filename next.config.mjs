import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Versión visible en el login (ver lib/version.ts).
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Commit de la build: en Docker llega como build-arg GIT_COMMIT (la carpeta .git no entra a la imagen);
// en local se le pregunta a git. Si no hay ninguno, queda vacío y el login muestra solo la versión.
function commitActual() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.trim();
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Para probar desde un celular en el mismo Wi-Fi: DEV_ORIGINS=192.168.1.37 npm run dev
  // (Next bloquea en desarrollo los pedidos que no vienen de localhost).
  allowedDevOrigins: process.env.DEV_ORIGINS ? process.env.DEV_ORIGINS.split(",") : undefined,
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT: commitActual(),
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
