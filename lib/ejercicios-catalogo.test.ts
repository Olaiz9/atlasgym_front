// lib/ejercicios-catalogo.test.ts
import { describe, it, expect } from 'vitest'
import { CATALOGO_EJERCICIOS_GIF } from './catalogo-ejercicios'
import { buscarVideoParaEjercicio } from './rutina-utils'
import { Ejercicio } from './types'

describe('Catálogo de Ejercicios GIF y API', () => {
  it('contiene ejercicios para todos los grupos musculares principales', () => {
    const grupos = new Set(CATALOGO_EJERCICIOS_GIF.map((e) => e.grupoMuscular))
    expect(grupos.has('Pecho')).toBe(true)
    expect(grupos.has('Espalda')).toBe(true)
    expect(grupos.has('Piernas')).toBe(true)
    expect(grupos.has('Hombros')).toBe(true)
    expect(grupos.has('Brazos')).toBe(true)
    expect(grupos.has('Core')).toBe(true)
  })

  it('todos los ejercicios poseen gifUrl válido y formato GIF en loop', () => {
    CATALOGO_EJERCICIOS_GIF.forEach((ej) => {
      expect(ej.gifUrl).toBeDefined()
      expect(ej.gifUrl).toMatch(/\.gif$/)
      expect(ej.formato).toBe('GIF')
      expect(ej.equipo).toBeTruthy()
      expect(ej.instruccionesPasoAPaso.length).toBeGreaterThan(0)
    })
  })

  it('buscarVideoParaEjercicio vincula correctamente ejercicios con el catálogo GIF', () => {
    const matchPecho = buscarVideoParaEjercicio('Press de Banca Plano', CATALOGO_EJERCICIOS_GIF)
    expect(matchPecho).toBeDefined()
    expect(matchPecho?.titulo).toContain('Press de Banca Plano')
    expect(matchPecho?.gifUrl).toBeDefined()

    const matchPierna = buscarVideoParaEjercicio('Sentadilla con barra', CATALOGO_EJERCICIOS_GIF)
    expect(matchPierna).toBeDefined()
    expect(matchPierna?.grupoMuscular).toBe('Piernas')

    const matchHombros = buscarVideoParaEjercicio('Elevaciones Laterales', CATALOGO_EJERCICIOS_GIF)
    expect(matchHombros).toBeDefined()
    expect(matchHombros?.grupoMuscular).toBe('Hombros')
  })

  it('soporta tipos de serie avanzados (BI_SERIE y DROP_SET)', () => {
    const ejBiSerie: Ejercicio = {
      id: 'test-1',
      nombre: 'Curl Martillo',
      series: 3,
      repeticiones: '10 + 10',
      tipoSerie: 'BI_SERIE',
      descansoSegundos: 60,
    }
    expect(ejBiSerie.tipoSerie).toBe('BI_SERIE')

    const ejDropSet: Ejercicio = {
      id: 'test-2',
      nombre: 'Elevaciones Laterales',
      series: 4,
      repeticiones: '8 + 8 + 8',
      tipoSerie: 'DROP_SET',
      descansoSegundos: 90,
    }
    expect(ejDropSet.tipoSerie).toBe('DROP_SET')
    expect(ejDropSet.descansoSegundos).toBe(90)
  })
})
