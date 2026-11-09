import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, iniciarSesionTitular, letrasUnicas } from './soporte'

/** "YYYY-MM" de hace `meses` meses. */
function periodo(meses: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - meses)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

test('el Día Cero se revisa con un simulacro (morosos incluidos) antes de importar', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Import ${letrasUnicas()}`, 25000)
  const alDia = { nombre: `Socia Al Dia ${letrasUnicas()}`, dni: dniUnico() }
  const moroso = { nombre: `Socio Moroso ${letrasUnicas()}`, dni: `${Number(dniUnico()) + 1}` }

  const planilla = [
    'Nombre;DNI;Plan;Ultimo_Mes_Pago',
    `${alDia.nombre};${alDia.dni};${plan.nombre};${periodo(0)}`,
    `${moroso.nombre};${moroso.dni};${plan.nombre};${periodo(2)}`,
  ].join(String.fromCharCode(10))

  await iniciarSesionTitular(page)
  await page.goto('/alumnos')
  await page.getByRole('button', { name: 'Importar CSV' }).click()
  const textoPlanilla = page.getByPlaceholder(/Nombre;DNI/)
  await textoPlanilla.fill(planilla)

  // Sin revisar no hay forma de importar
  await expect(page.getByRole('button', { name: /Confirmar importación/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Revisar 2 socio(s)' }).click()

  const revision = page.getByRole('region', { name: 'Revisión antes de importar' })
  await expect(revision.getByText('Así quedaría el padrón')).toBeVisible()
  await expect(revision.getByText('2 nuevos')).toBeVisible()
  await expect(revision.getByText('Moroso: 1')).toBeVisible()
  await expect(revision.getByText('1 socio(s) quedarían morosos.')).toBeVisible()
  await expect(revision.getByRole('cell', { name: moroso.nombre })).toBeVisible()
  await expect(revision.getByRole('cell', { name: alDia.nombre })).toHaveCount(0)

  // El simulacro no guardó nada
  expect(await api.alumnoPorDni(alDia.dni)).toBeFalsy()
  expect(await api.alumnoPorDni(moroso.dni)).toBeFalsy()

  // Si se toca la planilla, hay que volver a revisar
  await textoPlanilla.fill(`${planilla} `)
  await expect(page.getByRole('button', { name: /Confirmar importación/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Revisar 2 socio(s)' }).click()

  await page.getByRole('button', { name: 'Confirmar importación (2)' }).click()
  await expect.poll(async () => (await api.alumnoPorDni(alDia.dni))?.activo).toBe(true)
  await expect.poll(async () => (await api.alumnoPorDni(moroso.dni))?.activo).toBe(true)
})
