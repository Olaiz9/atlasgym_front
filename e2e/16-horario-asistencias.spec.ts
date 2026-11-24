import { expect, test } from '@playwright/test'
import { iniciarSesionTitular } from './soporte'

test('el panel de asistencias muestra el horario ampliado de 06 a 23', async ({ page }) => {
  await iniciarSesionTitular(page)
  await page.goto('/asistencias')
  const panel = page.getByRole('region', { name: 'Horarios y días de mayor movimiento' })
  await expect(panel.getByRole('heading', { name: 'Distribución por franja horaria (06:00 a 23:00 hs)' })).toBeVisible()
  await expect(panel.getByText('6h', { exact: true })).toBeVisible()
  await expect(panel.getByText('23h', { exact: true })).toBeVisible()
  await expect(panel.getByText('Apertura (06:00 hs)', { exact: true })).toBeVisible()
  await expect(panel.getByText('Cierre (23:00 hs)', { exact: true })).toBeVisible()
})
