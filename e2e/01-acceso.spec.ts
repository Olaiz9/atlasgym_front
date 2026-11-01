import { expect, test } from '@playwright/test'
import { E2E, iniciarSesion, iniciarSesionTitular } from './soporte'

test.describe('Acceso de los titulares', () => {
  test('sin sesión, cualquier pantalla interna manda al login', async ({ page }) => {
    await page.goto('/finanzas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('una clave incorrecta muestra un error y no deja entrar', async ({ page }) => {
    await iniciarSesion(page, E2E.titular.email, 'clave-equivocada')
    await expect(page.getByText(/credenciales|inválid|incorrect/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('el titular entra, ve su nombre, y al cerrar sesión vuelve al login', async ({ page }) => {
    await iniciarSesionTitular(page)
    await expect(page.getByText(E2E.titular.nombre).first()).toBeVisible()

    // La sesión sobrevive a una recarga de página
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/)

    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click()
    // Confirmación del modal "¿Cerrar sesión?"
    await page.getByRole('button', { name: 'Cerrar sesión' }).last().click()
    await expect(page).toHaveURL(/\/login/)

    // Después de salir, volver atrás no reabre las pantallas internas
    await page.goto('/finanzas')
    await expect(page).toHaveURL(/\/login/)
  })
})
