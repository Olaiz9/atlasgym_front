import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, iniciarSesion, letrasUnicas } from './soporte'

test('el descanso desbloquea audio al tocar y avisa una sola vez al terminar', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Descanso ${letrasUnicas()}`, 20000)
  const rutina = await api.crearRutina(`Descanso ${letrasUnicas()}`)
  const dni = dniUnico()
  const alumno = await api.crearAlumno(`Alumno ${letrasUnicas()}`, dni, plan.id)
  await api.editarAlumno(alumno.id, { rutinaId: rutina.id })
  const login = await request.post(`${E2E.backend}/api/auth/login`, { data: { email: E2E.titular.email, password: E2E.titular.password } })
  expect(login.ok()).toBeTruthy()
  const { token } = await login.json()
  const clave = 'DescansoPrueba2026!'
  const credenciales = await request.post(`${E2E.backend}/api/alumnos/${alumno.id}/credenciales`, {
    headers: { Authorization: `Bearer ${token}` }, data: { usuario: dni, password: clave },
  })
  expect(credenciales.ok()).toBeTruthy()
  // Instrumentamos solamente el audio: la rutina y el temporizador son los reales.
  await page.addInitScript(() => {
    const contadores = { contextos: 0, reanudaciones: 0, tonos: 0 }
    Object.assign(window, { audioDescansoPrueba: contadores })
    class AudioSimulado {
      state = 'suspended'
      currentTime = 0
      destination = {}
      constructor() { contadores.contextos++ }
      resume() { contadores.reanudaciones++; this.state = 'running'; return Promise.resolve() }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
      createOscillator() {
        return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() { contadores.tonos++ }, stop() {} }
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: AudioSimulado, configurable: true })
  })
  await iniciarSesion(page, dni, clave)
  await expect(page).not.toHaveURL(/\/login/)
  // Las credenciales asignadas por el titular pueden exigir el cambio inicial.
  {
    await expect(page.getByText('Actualizá tu contraseña inicial')).toBeVisible()
    await page.getByPlaceholder('Clave provisoria...').fill(clave)
    await page.getByPlaceholder('Nueva contraseña...', { exact: true }).fill('DescansoNueva2026!')
    await page.getByPlaceholder('Repetí la nueva contraseña...', { exact: true }).fill('DescansoNueva2026!')
    await page.getByRole('button', { name: 'Guardar nueva clave' }).click()
    await expect(page.getByText('Actualizá tu contraseña inicial')).toBeHidden()
  }
  await page.goto('/rutinas')
  const iniciar = page.getByRole('button', { name: 'Iniciar descanso', exact: true })
  await expect(iniciar).toBeVisible()
  await page.clock.install()
  await iniciar.click()
  const contadores = () => page.evaluate(() => (window as unknown as { audioDescansoPrueba: { contextos: number; reanudaciones: number; tonos: number } }).audioDescansoPrueba)
  expect(await contadores()).toEqual({ contextos: 1, reanudaciones: 1, tonos: 1 })
  // runFor ejecuta cada tick (fastForward puede saltearlos).
  await page.clock.runFor(91_000)
  await expect.poll(async () => (await contadores()).tonos).toBe(4)
  await page.clock.runFor(5000)
  expect((await contadores()).tonos).toBe(4)
  await iniciar.click()
  expect(await contadores()).toEqual({ contextos: 1, reanudaciones: 2, tonos: 5 })
})
