// lib/ejercicios-catalogo.test.ts
import { describe, it, expect } from 'vitest'
import { CATALOGO_EJERCICIOS_GIF } from './catalogo-ejercicios'
import { CLASICOS_CURADOS } from './clasicos-curados'
import { VIDEOS_TECNICA_MOCK } from './mock-data'
import { buscarVideoParaEjercicio } from './rutina-utils'
import { Ejercicio } from './types'

describe('Catálogo de Ejercicios GIF y API', () => {
  it('contiene una base masiva de más de 1.000 ejercicios', () => {
    expect(CATALOGO_EJERCICIOS_GIF.length).toBeGreaterThanOrEqual(1000)
  })

  it('contiene ejercicios para todos los grupos musculares principales', () => {
    const grupos = new Set(CATALOGO_EJERCICIOS_GIF.map((e) => e.grupoMuscular))
    expect(grupos.has('Pecho')).toBe(true)
    expect(grupos.has('Espalda')).toBe(true)
    expect(grupos.has('Piernas')).toBe(true)
    expect(grupos.has('Glúteos')).toBe(true)
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

    const matchGluteos = buscarVideoParaEjercicio('Hip Thrust con Barra', CATALOGO_EJERCICIOS_GIF)
    expect(matchGluteos).toBeDefined()
    expect(matchGluteos?.grupoMuscular).toBe('Glúteos')

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

  it('no existen IDs duplicados en todo el catálogo de ejercicios', () => {
    const ids = CATALOGO_EJERCICIOS_GIF.map((e) => e.id)
    const setIds = new Set(ids)
    expect(setIds.size).toBe(ids.length)
  })

  it('CLASICOS_CURADOS están distribuidos en los 7 grupos musculares sin repeticiones', () => {
    const grupos = ['Pecho', 'Espalda', 'Piernas', 'Glúteos', 'Hombros', 'Brazos', 'Core']
    grupos.forEach((g) => {
      const enGrupo = CLASICOS_CURADOS.filter((c: any) => c.grupoMuscular === g)
      expect(enGrupo.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('VIDEOS_TECNICA_MOCK contiene únicamente videos tutoriales de coaches sin duplicar el catálogo', () => {
    VIDEOS_TECNICA_MOCK.forEach((v: any) => {
      expect(v.id.startsWith('cat-')).toBe(false)
      expect(v.id.startsWith('ex-')).toBe(false)
      expect(v.videoUrl).toContain('youtube')
    })
  })

  it('traduce los 1.500 ejercicios al español sin palabras crudas en inglés (respetando la lista blanca de jerga argentina)', () => {
    const prohibidasIngles =
      /\b(with|legs|arms|chest|shoulder|shoulders|squat|squats|lunge|lunges|deadlift|deadlifts|bench|floor|rope|dumbbell|dumbbells|barbell|sled|stretch|kneeling|standing|seated|lying|male|female|pov|kickback|kickbacks|abduction|adduction|extension|extensions|raise|raises|row|rows|pulldown|pushdown|fly|flyes|dip|dips|shrug|shrugs|underhand|overhand|attachment|blaster|variation)\b/i

    for (const ej of CATALOGO_EJERCICIOS_GIF) {
      expect(ej.titulo, `Título con inglés sin traducir en ${ej.exerciseId}: "${ej.titulo}"`).not.toMatch(
        prohibidasIngles
      )
    }
  })

  it('mapea cada variante clave al GIF verificado y permite encontrarla por sus sinónimos argentinos', () => {
    const porId = (id: string) => CATALOGO_EJERCICIOS_GIF.find((e) => e.id === id || e.exerciseId === id)

    expect(porId('x69MAlq')?.titulo).toContain('Pullover en Polea Alta')
    expect(porId('2IxROQ1')?.titulo).toContain('Press Francés en Polea con Soga')
    expect(porId('iaapw0g')?.titulo).toContain('con Barra Z')
    expect(porId('YTur5nR')?.titulo).toContain('Curl de Bíceps a un Brazo en Polea Baja')
    expect(porId('0xDpB4L')?.titulo).toContain('Sentado con Banda Elástica')
    expect(porId('O95afRA')?.titulo).toContain('Pasos Laterales con Banda Elástica')
    expect(porId('sVQCCeG')?.titulo).toContain('Sentadilla Isométrica en Pared')

    expect(buscarVideoParaEjercicio('pasos laterales', CATALOGO_EJERCICIOS_GIF)?.id).toBe('cat-gluteos-8')
    expect(buscarVideoParaEjercicio('sentadilla isométrica', CATALOGO_EJERCICIOS_GIF)?.id).toBe('cat-piernas-10')
    expect(buscarVideoParaEjercicio('sillón de cuádriceps', CATALOGO_EJERCICIOS_GIF)?.id).toBe('cat-piernas-4')
  })
})

