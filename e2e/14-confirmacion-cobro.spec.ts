import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, iniciarSesionTitular, letrasUnicas } from './soporte'

test('el cobro espera al servidor y no se envía dos veces', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan('Plan Confirmación ' + letrasUnicas(), 25000)
  const dni = dniUnico()
  await api.crearAlumno('Socio Confirmación ' + letrasUnicas(), dni, plan.id)
  await iniciarSesionTitular(page)
  await page.goto('/finanzas?cobrar=' + dni)
  let liberar!: () => void
  const espera = new Promise<void>(resolve => { liberar = resolve })
  let pedidos = 0
  await page.route('**/backend-api/pagos', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    pedidos++
    await espera
    await route.continue()
  })
  await page.getByRole('button', { name: 'Guardar pago', exact: true }).click()
  try {
    await expect(page.getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeDisabled()
    await expect(page.getByText('Pago registrado con éxito', { exact: true })).toHaveCount(0)
    await expect.poll(() => pedidos).toBe(1)
  } finally { liberar() }
  await expect(page.getByText('Pago registrado con éxito', { exact: true })).toBeVisible()
  expect(pedidos).toBe(1)
})

test('un rechazo del cobro conserva el formulario y muestra el error', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan('Plan Rechazo ' + letrasUnicas(), 25000)
  const dni = dniUnico()
  await api.crearAlumno('Socio Rechazo ' + letrasUnicas(), dni, plan.id)
  await iniciarSesionTitular(page)
  await page.goto('/finanzas?cobrar=' + dni)
  await page.route('**/backend-api/pagos', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ mensaje: 'El período ya está pagado' }) })
  })
  await page.getByRole('button', { name: 'Guardar pago', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('El período ya está pagado')
  await expect(page.getByRole('button', { name: 'Guardar pago', exact: true })).toBeEnabled()
  await expect(page.getByText('Pago registrado con éxito', { exact: true })).toHaveCount(0)
})
