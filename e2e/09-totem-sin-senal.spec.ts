import { expect, test } from '@playwright/test'
import { ApiAtlas, E2E, iniciarSesionTitular } from './soporte'

test('la tablet vinculada avisa que anda y el servidor la ve en línea', async ({ page, request }) => {
  await page.goto('/totem')
  await page.getByLabel('PIN de terminal').pressSequentially(E2E.totemPin)
  const clave = page.getByPlaceholder('Clave secreta de terminal...')
  if (!(await clave.isVisible())) {
    await page.getByRole('button', { name: /Vincular terminal/ }).click()
  }
  await clave.fill(E2E.totemSecret)
  await page.getByRole('button', { name: 'Verificar y vincular' }).click()
  await expect(page.getByText('Terminal vinculada', { exact: true })).toBeVisible()

  // La primera señal sale al abrir la pantalla; con la clave ya guardada, recargar la manda de nuevo
  const latido = page.waitForRequest((r) => r.url().includes('/asistencias/totem/latido') && r.method() === 'POST')
  await page.reload()
  expect((await latido).headers()['x-totem-secret']).toBe(E2E.totemSecret)

  const api = await ApiAtlas.comoTitular(request)
  await expect.poll(async () => (await api.estadoTotem()).estado).toBe('EN_LINEA')
})

test('el titular ve el cartel cuando el tótem se queda sin señal y lo puede ocultar', async ({ page }) => {
  // Simulamos la respuesta del servidor: esperar 5 minutos reales sin señal no tiene sentido en un test
  await page.route('**/asistencias/totem/estado', (route) =>
    route.fulfill({
      json: {
        estado: 'SIN_SENAL',
        ultimoLatido: '2026-11-09T18:05:00',
        minutosSinSenal: 12,
        pendientesOffline: 2,
        minutosAlerta: 5,
      },
    })
  )
  await iniciarSesionTitular(page)

  const cartel = page.getByRole('alert').filter({ hasText: 'El tótem no tiene señal' })
  await expect(cartel).toBeVisible()
  await expect(cartel).toContainText('desde las 18:05 (hace 12 min)')
  await expect(cartel).toContainText('2 ingreso(s) sin subir')

  await cartel.getByRole('button', { name: 'Ocultar aviso del tótem' }).click()
  await expect(cartel).toBeHidden()
  // Oculto para esta caída: navegar no lo vuelve a mostrar
  await page.goto('/asistencias')
  await expect(page.getByText('El tótem no tiene señal')).toBeHidden()
})
