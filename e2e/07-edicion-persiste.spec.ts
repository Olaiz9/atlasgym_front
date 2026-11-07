import { expect, test, type Page } from '@playwright/test'
import { ApiAtlas, dniUnico, iniciarSesionTitular, letrasUnicas } from './soporte'

/**
 * Editar un socio, un plan o una rutina tiene que llegar al servidor, no solo verse en pantalla.
 * Cada test edita DOS veces seguidas sin recargar y al final mira la base por API. El valor que
 * devuelve dice cuántas ediciones llegaron: el original (ninguna), el de la 1.ª (solo esa) o el
 * de la 2.ª (las dos, que es lo correcto).
 */

/** Deja terminar el guardado anterior, como cuando el titular edita una cosa y después otra. */
async function pausaEntreEdiciones(page: Page) {
  await page.waitForTimeout(1500)
}

test('editar dos veces a un socio guarda los cambios en el servidor', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Edicion ${letrasUnicas()}`, 25000)
  const original = `Socio Original ${letrasUnicas()}`
  const primera = `Socio Primera ${letrasUnicas()}`
  const segunda = `Socio Segunda ${letrasUnicas()}`
  const dni = dniUnico()
  const socio = await api.crearAlumno(original, dni, plan.id)

  await iniciarSesionTitular(page)
  await page.goto('/alumnos')
  await page.getByPlaceholder('Buscar alumno...').fill(dni)

  await page.getByRole('button', { name: `Editar a ${original}` }).click()
  await page.getByLabel('Nombre y apellido').fill(primera)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: `Editar a ${primera}` })).toBeVisible()
  await pausaEntreEdiciones(page)

  await page.getByRole('button', { name: `Editar a ${primera}` }).click()
  await page.getByLabel('Nombre y apellido').fill(segunda)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: `Editar a ${segunda}` })).toBeVisible()

  await expect.poll(async () => (await api.buscarAlumno(socio.id)).nombre).toBe(segunda)

  // Al recargar sigue ahí: quedó guardado en el servidor, no solo en el navegador
  await page.reload()
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await expect(page.getByRole('button', { name: `Editar a ${segunda}` })).toBeVisible()
})

test('editar dos veces un plan guarda los cambios en el servidor', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const nombre = `Plan Precio ${letrasUnicas()}`
  const plan = await api.crearPlan(nombre, 20000)
  const tarjeta = page.locator('div.group').filter({ hasText: nombre })

  async function cambiarPrecio(precio: number) {
    // La tarjeta sube 4px con el hover: con el mouse justo en su borde tiembla y Playwright no puede hacer clic.
    await page.mouse.move(0, 0)
    await tarjeta.getByRole('button', { name: 'Modificar precio' }).click()
    await page.getByLabel('Precio mensual ($)').fill(String(precio))
    await page.locator('form button[type="submit"]').click()
    await expect(tarjeta).toContainText(`$${precio.toLocaleString('es-AR')}`)
  }

  await iniciarSesionTitular(page)
  await page.goto('/planes')

  await cambiarPrecio(21000)
  await pausaEntreEdiciones(page)
  await cambiarPrecio(22000)

  await expect.poll(async () => Number((await api.buscarPlan(plan.id)).precio)).toBe(22000)

  await page.reload()
  await expect(tarjeta).toContainText('$22.000')
})

test('editar dos veces una rutina guarda los cambios en el servidor', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const original = `Rutina Original ${letrasUnicas()}`
  const primera = `Rutina Primera ${letrasUnicas()}`
  const segunda = `Rutina Segunda ${letrasUnicas()}`
  const rutina = await api.crearRutina(original)

  async function renombrar(desde: string, hasta: string) {
    await page.getByRole('button', { name: `Editar rutina ${desde}` }).click()
    await page.getByLabel('Nombre de la rutina').fill(hasta)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('button', { name: `Editar rutina ${hasta}` })).toBeVisible()
  }

  await iniciarSesionTitular(page)
  await page.goto('/rutinas')
  await page.getByPlaceholder('Buscar rutina...').fill('Rutina')

  await renombrar(original, primera)
  await pausaEntreEdiciones(page)
  await renombrar(primera, segunda)

  await expect.poll(async () => (await api.buscarRutina(rutina.id)).nombre).toBe(segunda)

  await page.reload()
  await page.getByPlaceholder('Buscar rutina...').fill(segunda)
  await expect(page.getByRole('button', { name: `Editar rutina ${segunda}` })).toBeVisible()
})
