import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, iniciarSesionTitular, letrasUnicas } from './soporte'

test('dar de baja a un socio lo pasa a Inactivos sin borrarlo', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Baja ${letrasUnicas()}`, 25000)
  const nombre = `Socio Baja ${letrasUnicas()}`
  const dni = dniUnico()
  await api.crearAlumno(nombre, dni, plan.id)

  await iniciarSesionTitular(page)
  await page.goto('/alumnos')
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await page.getByRole('button', { name: `Dar de baja a ${nombre}` }).click()

  // Modal de confirmación: avisa que va a Inactivos (no es un borrado definitivo)
  await expect(page.getByText(`¿Dar de baja a ${nombre}?`)).toBeVisible()
  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()

  // En el servidor el socio existe, pero inactivo
  await expect.poll(async () => (await api.alumnoPorDni(dni))?.activo).toBe(false)

  // Después de recargar, aparece en la pestaña Inactivos
  await page.reload()
  await page.getByRole('button', { name: /Inactivos/ }).first().click()
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await expect(page.getByText(nombre).first()).toBeVisible()
  // ...y ahora la acción disponible es la eliminación definitiva (segundo paso, a propósito)
  await expect(page.getByRole('button', { name: `Eliminar definitivamente a ${nombre}` })).toBeVisible()
})
