import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, iniciarSesionTitular, letrasUnicas, pesos } from './soporte'

test('dar de alta un socio y elegir "Cobrar ahora" abre el modal de cobro en Finanzas con ese socio seleccionado', async ({
  page,
  request,
}) => {
  const api = await ApiAtlas.comoTitular(request)
  const nombrePlan = `Plan Seguido ${letrasUnicas()}`
  const precio = 32000
  await api.crearPlan(nombrePlan, precio)
  const nombre = `Socio Seguido ${letrasUnicas()}`
  const dni = dniUnico()

  await iniciarSesionTitular(page)

  // --- Alta del socio desde la pantalla de Alumnos ---
  await page.goto('/alumnos')
  await page.getByRole('button', { name: 'Agregar alumno' }).click()
  await page.getByPlaceholder('Ej. Martín Gómez').fill(nombre)
  await page.getByPlaceholder('Ej. 32456789').fill(dni)
  await page.getByPlaceholder('Ej. 5491112345678').fill('2611234567')
  await page.getByLabel('Plan asignado').selectOption({ label: `${nombrePlan} — $${pesos(precio)}` })
  await page.getByRole('button', { name: 'Crear alumno' }).click()

  // --- Confirmación con "Cobrar ahora" y "Listo" ---
  await expect(page.getByRole('button', { name: 'Listo' })).toBeVisible()
  const btnCobrarAhora = page.getByRole('button', { name: 'Cobrar ahora' })
  await expect(btnCobrarAhora).toBeVisible()
  await btnCobrarAhora.click()

  // --- En Finanzas se abre el modal con el socio recién creado preseleccionado ---
  await expect(page).toHaveURL(/\/finanzas/)
  const selectAlumno = page.locator('select[aria-label="Alumno"]')
  await expect(selectAlumno).toBeVisible()
  await expect(selectAlumno.locator('option:checked')).toContainText(nombre)
  await expect(page.getByLabel('Monto')).toHaveValue(String(precio))

  await page.getByRole('button', { name: 'Guardar pago' }).click()

  // El pago queda registrado en el servidor y visible en la tabla de Finanzas
  await expect
    .poll(async () => {
      const socio = await api.alumnoPorDni(dni)
      if (!socio) return 'socio no encontrado'
      const pagos = await api.pagosDeAlumno(socio.id)
      return pagos.map((p: { monto: number; estado: string; registradoPor: string }) =>
        `${p.monto}|${p.estado}|${p.registradoPor}`
      )
    })
    .toContain(`${precio}|PAGADO|${E2E.titular.nombre}`)

  await page.getByPlaceholder('Buscar socio u operador...').fill(nombre)
  await expect(page.getByText(nombre).first()).toBeVisible()
})

test('entrar a /finanzas?cobrar=99999999 (DNI inexistente) no abre el modal ni rompe la pantalla', async ({
  page,
}) => {
  await iniciarSesionTitular(page)
  await page.goto('/finanzas?cobrar=99999999')
  await expect(page.getByRole('heading', { name: 'Finanzas y Caja' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar pago' })).toHaveCount(0)
})
