import { expect, test } from '@playwright/test'
import { iniciarSesionTitular } from './soporte'

/**
 * El gimnasio arranca sin videos propios en la videoteca: el buscador de la rutina tiene que
 * ofrecer igual el catálogo de ejercicios con GIF. Este flujo ya se perdió una vez al pisar
 * archivos en una sincronización; si vuelve a pasar, este test lo frena en el CI.
 */
test('al armar una rutina se puede agregar un ejercicio del catálogo con GIF', async ({ page }) => {
  await iniciarSesionTitular(page)
  await page.goto('/rutinas')
  await page.getByRole('button', { name: 'Nueva rutina' }).click()

  const buscarEnVideoteca = page.getByRole('button', { name: 'Buscar en videoteca' })
  if ((await buscarEnVideoteca.count()) === 0) {
    await page.getByRole('button', { name: 'Agregar día' }).click()
  }
  await buscarEnVideoteca.first().click()

  await page.getByPlaceholder(/Escribí para buscar/).fill('press banca')
  const agregar = page.getByRole('button', { name: /^Agregar$/ }).first()
  await expect(agregar).toBeVisible()
  await agregar.click()
  await expect(page.getByRole('button', { name: /Agregado/ }).first()).toBeVisible()

  await expect(page.getByPlaceholder('Nombre del ejercicio...').last()).toHaveValue(/press de banca/i)
})
