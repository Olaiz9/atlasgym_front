import { expect, test } from '@playwright/test'
import { iniciarSesionTitular } from './soporte'

test('abrir una ruta inexistente muestra la página de no encontrado en español y permite volver al inicio', async ({
  page,
}) => {
  await iniciarSesionTitular(page)
  await page.goto('/esta-ruta-no-existe')
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
  await expect(page.getByText('Puede que el link esté mal o que la página ya no exista.')).toBeVisible()

  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page).toHaveURL(/\/$/)
})
