import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de punta a punta (E2E): un navegador real usa la app como lo haria un titular,
 * contra el backend y la base de datos reales.
 *
 * Requisito: el backend tiene que estar corriendo (por defecto en http://127.0.0.1:8080) con una
 * base de pruebas descartable. En local lo hace todo `scripts/e2e-local.ps1`; en GitHub, el CI.
 * El front lo levanta Playwright solo (o reutiliza el que ya este corriendo en :3000).
 */
const enCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  // Los flujos comparten la misma base: se corren de a uno para que no se pisen.
  workers: 1,
  fullyParallel: false,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // En CI, el reporter "github" muestra cada falla como anotacion en el resumen de la corrida.
  reporter: enCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.E2E_FRONT_URL ?? 'http://localhost:3000',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    // Si un test falla, queda grabado paso a paso (playwright-report/) para ver que paso.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // En CI se prueba el build de produccion; en local alcanza con el modo desarrollo.
    command: enCI ? 'npm run build && npm run start' : 'npm run dev',
    url: process.env.E2E_FRONT_URL ?? 'http://localhost:3000',
    reuseExistingServer: !enCI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_API_URL: '/backend-api',
      BACKEND_INTERNAL_URL: process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:8080',
    },
  },
})
