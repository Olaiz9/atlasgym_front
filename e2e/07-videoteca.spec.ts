import { expect, test } from '@playwright/test'
import { iniciarSesionTitular } from './soporte'

// Videos de ejemplo de lib/mock-data.ts (links de YouTube). Con backend real no deben aparecer.
const TITULOS_DE_EJEMPLO = [
  'Press de Banca con Mancuernas',
  'Sentadilla Libre Profunda y Biomecánica',
  'Remo con Barra Agarre Prono',
  'Press Militar con Barra de Pie (Overhead Press)',
  'Curl Martillo con Mancuernas',
  'Plancha Abdominal y Tensión Global',
]

test('la videoteca no muestra los videos de ejemplo de YouTube, ni siquiera si quedaron en caché', async ({
  page,
}) => {
  // Simula un navegador que guardó los videos de ejemplo antes del arreglo
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'atlas_videos_v2',
      JSON.stringify([
        {
          id: 'v1',
          titulo: 'Press de Banca con Mancuernas',
          grupoMuscular: 'Pecho',
          duracion: '01:45',
          nivel: 'Técnica estricta',
          videoUrl: 'https://www.youtube.com/embed/VmB1G1K7v94',
          consejosClave: [],
        },
      ])
    )
  })

  await iniciarSesionTitular(page)
  const videoteca = page.waitForResponse((r) => r.url().includes('/api/videoteca') && r.ok())
  await page.goto('/videoteca')
  await videoteca
  await expect(page.getByRole('heading', { name: /Técnica por/ })).toBeVisible()

  for (const titulo of TITULOS_DE_EJEMPLO) {
    await expect(page.getByText(titulo, { exact: true })).toHaveCount(0)
  }
  await expect(page.locator('a[href*="youtube"], iframe[src*="youtube"], img[src*="ytimg"]')).toHaveCount(0)
})
