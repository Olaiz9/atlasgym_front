import { request } from '@playwright/test'
import { E2E } from './soporte'

/**
 * Se corre una vez antes de los tests (globalSetup en playwright.config.ts).
 *
 * El alta inicial crea a los titulares con requiereCambioPassword=true (issue #35 del back): al
 * entrar, la app los tapa con el cartel "Actualizá tu contraseña inicial". Los tests usan al
 * titular para todo lo demas, asi que aca se hace ese cambio una sola vez por API, dejando la
 * misma clave (el back lo permite) para que los valores de e2e/soporte.ts sigan sirviendo.
 * El cambio obligatorio se prueba aparte con un socio (06-acceso-socio.spec.ts).
 */
export default async function prepararTitular() {
  const api = await request.newContext({ baseURL: E2E.backend })
  try {
    const login = await api.post('/api/auth/login', {
      data: { email: E2E.titular.email, password: E2E.titular.password },
    })
    if (!login.ok()) {
      throw new Error(`Login del titular de prueba por API -> ${login.status()} ${await login.text()}`)
    }
    const sesion = await login.json()
    if (!sesion.requiereCambioPassword) return

    const cambio = await api.put('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${sesion.token}` },
      data: { passwordActual: E2E.titular.password, password: E2E.titular.password },
    })
    if (!cambio.ok()) {
      throw new Error(`Cambio de clave inicial del titular de prueba -> ${cambio.status()} ${await cambio.text()}`)
    }
  } finally {
    await api.dispose()
  }
}
