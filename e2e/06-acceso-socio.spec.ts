import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, iniciarSesion, iniciarSesionTitular, letrasUnicas } from './soporte'

test('el titular genera una clave temporal y el socio entra y la reemplaza por una propia', async ({
  page,
  request,
}) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Acceso ${letrasUnicas()}`, 26000)
  const nombre = `Socio Acceso ${letrasUnicas()}`
  const dni = dniUnico()
  const socio = await api.crearAlumno(nombre, dni, plan.id)

  // Un socio recién dado de alta NO puede entrar con su DNI (cualquiera podría saberlo)
  const conDni = await request.post(`${E2E.backend}/api/auth/login`, { data: { email: dni, password: dni } })
  expect(conDni.status()).toBe(401)

  // --- El titular genera la clave temporal desde la ficha del socio ---
  await iniciarSesionTitular(page)
  await page.goto(`/alumnos/${socio.id}`)
  await page.getByRole('button', { name: 'Generar clave temporal' }).click()
  const recuadro = page.getByRole('region', { name: 'Clave temporal generada' })
  await expect(recuadro).toBeVisible()
  const usuario = (await recuadro.getByTestId('usuario-socio').textContent())!.trim()
  const claveTemporal = (await recuadro.getByTestId('clave-temporal').textContent())!.trim()
  expect(claveTemporal).toHaveLength(8)
  expect(claveTemporal).not.toBe(dni)

  // El titular cierra su sesión
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).last().click()
  await expect(page).toHaveURL(/\/login/)

  // --- El socio entra con la clave temporal y el sistema le exige elegir una propia ---
  await iniciarSesion(page, usuario, claveTemporal)
  await expect(page.getByText('Actualizá tu contraseña inicial')).toBeVisible()
  const nuevaClave = 'MiClave2026!'
  await page.getByPlaceholder('Clave provisoria...').fill(claveTemporal)
  await page.getByPlaceholder('Nueva contraseña...').fill(nuevaClave)
  await page.getByPlaceholder('Repetí la nueva contraseña...').fill(nuevaClave)
  await page.getByRole('button', { name: 'Guardar nueva clave' }).click()
  await expect(page.getByText('Actualizá tu contraseña inicial')).toBeHidden()

  // La clave temporal ya no sirve; la nueva sí, y sin volver a pedir cambio
  const conTemporal = await request.post(`${E2E.backend}/api/auth/login`, {
    data: { email: usuario, password: claveTemporal },
  })
  expect(conTemporal.status()).toBe(401)
  const conNueva = await request.post(`${E2E.backend}/api/auth/login`, {
    data: { email: usuario, password: nuevaClave },
  })
  expect(conNueva.ok()).toBeTruthy()
  expect((await conNueva.json()).requiereCambioPassword).toBe(false)
})
