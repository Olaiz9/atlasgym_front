import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, iniciarSesionTitular, letrasUnicas } from './soporte'

test('el titular anula un cobro con motivo y queda auditado, sin borrarse', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Anulacion ${letrasUnicas()}`, 27000)
  const nombre = `Socio Anulacion ${letrasUnicas()}`
  const socio = await api.crearAlumno(nombre, dniUnico(), plan.id)
  const pago = await api.registrarPago(socio.id, plan.id, 27000)

  await iniciarSesionTitular(page)
  await page.goto('/finanzas')
  await page.getByPlaceholder('Buscar socio u operador...').fill(nombre)
  await page.getByRole('button', { name: `Anular comprobante de ${nombre}` }).click()

  // El motivo es obligatorio
  await page.getByRole('button', { name: 'Confirmar anulación' }).click()
  await expect(page.getByText('Indicá brevemente el motivo de anulación')).toBeVisible()

  const motivo = 'Importe mal cargado (prueba E2E)'
  await page.getByLabel('Motivo de anulación').fill(motivo)
  await page.getByRole('button', { name: 'Confirmar anulación' }).click()

  // En el servidor el comprobante sigue existiendo, marcado como ANULADO con titular y motivo
  await expect
    .poll(async () => {
      const p = await api.buscarPago(pago.id)
      return `${p.estado}|${p.anuladoPor}|${p.motivoAnulacion}`
    })
    .toBe(`ANULADO|${E2E.titular.nombre}|${motivo}`)

  // Y en pantalla, después de recargar, se ve como anulado con su motivo
  await page.reload()
  await page.getByPlaceholder('Buscar socio u operador...').fill(nombre)
  await expect(page.getByText(motivo).first()).toBeVisible()
})
