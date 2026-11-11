import { expect, test } from '@playwright/test'
import { ApiAtlas, dniUnico, iniciarSesionTitular, letrasUnicas } from './soporte'

/**
 * Los dos titulares usan la app al mismo tiempo, cada uno en su celular. Lo que ve cada uno
 * tiene que venir del servidor, y guardar con datos viejos no puede pisar lo que hizo el otro.
 */

test('guardar una ficha que el otro titular cambió mientras tanto no pisa su cambio', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Dos Titulares ${letrasUnicas()}`, 25000)
  const original = `Socia Compartida ${letrasUnicas()}`
  const renombrada = `Socia Renombrada ${letrasUnicas()}`
  const dni = dniUnico()
  const socia = await api.crearAlumno(original, dni, plan.id)

  // Titular 1 abre la ficha en su celular...
  await iniciarSesionTitular(page)
  await page.goto('/alumnos')
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await page.getByRole('button', { name: `Editar a ${original}` }).click()

  // ...mientras el titular 2 le cambia el celular desde el suyo
  await api.editarAlumno(socia.id, { celular: '1155550000' })

  // Titular 1 guarda su cambio con la ficha vieja: el servidor lo frena y se lo explica
  await page.getByLabel('Nombre y apellido').fill(renombrada)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText(/Otro titular cambió los datos de este socio/)).toBeVisible()

  // El cambio del titular 2 sigue en pie y la pantalla volvió a la ficha real
  const enServidor = await api.buscarAlumno(socia.id)
  expect(enServidor.celular).toBe('1155550000')
  expect(enServidor.nombre).toBe(original)
  await expect(page.getByRole('button', { name: `Editar a ${original}` })).toBeVisible()

  // Con la ficha actualizada, ahora sí guarda
  await page.getByRole('button', { name: `Editar a ${original}` }).click()
  await page.getByLabel('Nombre y apellido').fill(renombrada)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect.poll(async () => (await api.buscarAlumno(socia.id)).nombre).toBe(renombrada)
  expect((await api.buscarAlumno(socia.id)).celular).toBe('1155550000')
})

test('el padrón no queda guardado en el teléfono: siempre se pide al servidor', async ({ page, request }) => {
  const api = await ApiAtlas.comoTitular(request)
  const plan = await api.crearPlan(`Plan Sin Copia ${letrasUnicas()}`, 25000)
  const nombre = `Socio Sin Copia ${letrasUnicas()}`
  const dni = dniUnico()
  await api.crearAlumno(nombre, dni, plan.id)

  await iniciarSesionTitular(page)
  await page.goto('/alumnos')
  await page.getByPlaceholder('Buscar alumno...').fill(dni)
  await expect(page.getByRole('button', { name: `Editar a ${nombre}` })).toBeVisible()

  const clavesConDatos = () =>
    page.evaluate(() =>
      ['atlas_alumnos_v1', 'atlas_pagos_v1', 'atlas_planes_v1', 'atlas_rutinas_v1'].filter(
        (k) => localStorage.getItem(k) !== null
      )
    )
  expect(await clavesConDatos()).toEqual([])

  // Una copia vieja que dejó una versión anterior de la app se borra y no se muestra
  await page.evaluate(() =>
    localStorage.setItem(
      'atlas_alumnos_v1',
      JSON.stringify([{ id: '999999', nombre: 'Socio Fantasma De Copia Vieja', plan: 'X', fechaAlta: '2026-01-01', activo: true }])
    )
  )
  await page.reload()
  await page.getByPlaceholder('Buscar alumno...').fill('Fantasma')
  await expect(page.getByText('Socio Fantasma De Copia Vieja')).toHaveCount(0)
  expect(await clavesConDatos()).toEqual([])
})
