import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, E2E, iniciarSesionTitular, letrasUnicas, pesos } from './soporte'

test('el titular da de alta un socio y le cobra la cuota en efectivo', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const nombrePlan = `Plan Cobro ${letrasUnicas()}`
  const precio = 31000
  await api.crearPlan(nombrePlan, precio)
  const nombre = `Socio Cobro ${letrasUnicas()}`
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

  // Al recargar, el socio sigue ahí: quedó guardado en el servidor, no solo en el navegador
  await page.reload()
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await expect(page.getByText(nombre).first()).toBeVisible()

  // --- Cobro desde Finanzas ---
  await page.goto('/finanzas')
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  await page.getByPlaceholder('Buscar alumno por nombre o DNI...').fill(dni)
  await page.locator('select[aria-label="Alumno"]').selectOption({ index: 0 })
  await page.getByLabel('Monto').fill(String(precio))
  await page.getByRole('button', { name: 'Guardar pago' }).click()

  // El cobro queda registrado en el servidor, a nombre del titular que lo hizo
  await expect
    .poll(async () => {
      const socio = await api.alumnoPorDni(dni)
      if (!socio) return 'socio no encontrado'
      const pagos = await api.pagosDeAlumno(socio.id)
      return pagos.map((p: { monto: number; estado: string; registradoPor: string }) =>
        `${p.monto}|${p.estado}|${p.registradoPor}`)
    })
    .toContain(`${precio}|PAGADO|${E2E.titular.nombre}`)
  await page.reload()
  await page.getByPlaceholder('Buscar socio u operador...').fill(nombre)
  await expect(page.getByText(nombre).first()).toBeVisible()

  // Y aparece en el arqueo de caja del día, en efectivo y a nombre del titular
  // (el panel es el bloque más chico que contiene el título y la línea "Por operador")
  const arqueo = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Arqueo de Caja del Día' }) })
    .filter({ hasText: 'Por operador:' })
    .last()
  await expect(arqueo.getByText(`${E2E.titular.nombre}:`)).toBeVisible()
  const efectivo = arqueo.locator('div').filter({ hasText: 'Efectivo en cajón' }).last()
  await expect(efectivo).toContainText(`$${pesos(precio)}`)
})
