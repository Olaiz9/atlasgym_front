import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, letrasUnicas } from './soporte'

test('la tablet del tótem se vincula y un socio registra su entrada con el DNI', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Totem ${letrasUnicas()}`, 29000)
  const nombre = `Socio Totem ${letrasUnicas()}`
  const dni = dniUnico()
  const socio = await api.crearAlumno(nombre, dni, plan.id)
  await api.registrarPago(socio.id, plan.id, 29000)

  // El tótem no usa login: se desbloquea con el PIN de pantalla...
  await page.goto('/totem')
  await page.getByLabel('PIN de terminal').pressSequentially(E2E.totemPin)

  // ...y se vincula con el servidor usando la clave secreta de la terminal
  const clave = page.getByPlaceholder('Clave secreta de terminal...')
  if (!(await clave.isVisible())) {
    await page.getByRole('button', { name: /Vincular terminal/ }).click()
  }
  await clave.fill(E2E.totemSecret)
  await page.getByRole('button', { name: 'Verificar y vincular' }).click()
  await expect(page.getByText('Terminal vinculada', { exact: true })).toBeVisible()

  // Un DNI que no existe se rechaza
  await page.getByLabel('Ingresar DNI').fill('11111111')
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  await expect(page.getByText(/no (se )?encontr|no figura/i).first()).toBeVisible()

  // El socio ficha con su DNI
  await page.goto('/totem')
  await page.getByLabel('Ingresar DNI').fill(dni)
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  await expect(page.getByText(nombre.split(' ')[0]).first()).toBeVisible()

  // La asistencia quedó registrada en el servidor
  await expect
    .poll(async () => (await api.asistenciasDeHoy()).map((a: { alumnoDni: string }) => a.alumnoDni))
    .toContain(dni)
})

test('Escape cierra el modal de vinculación sin borrar el DNI de la pantalla principal', async ({ page }) => {
  await page.goto('/totem')
  await page.getByLabel('PIN de terminal').pressSequentially(E2E.totemPin)

  await page.getByLabel('Ingresar DNI').fill('30123456')
  await expect(page.getByText('30.123.456')).toBeVisible()

  const clave = page.getByPlaceholder('Clave secreta de terminal...')
  if (!(await clave.isVisible())) {
    await page.getByRole('button', { name: /Vincular terminal|Offline listo/ }).click()
  }
  await expect(page.getByText('Vincular tablet física del Tótem')).toBeVisible()
  await clave.fill('clave-descartada')

  await page.keyboard.press('Escape')
  await expect(page.getByText('Vincular tablet física del Tótem')).toBeHidden()
  await expect(page.getByText('30.123.456')).toBeVisible()

})
