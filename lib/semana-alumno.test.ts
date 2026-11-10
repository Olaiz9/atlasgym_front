import { describe, expect, it } from 'vitest'
import { calcularSemanaAlumno } from './asistencia-utils'
import type { RegistroAsistencia } from './types'

const ingreso = (alumnoId: string, fecha: string): RegistroAsistencia =>
  ({ id: `${alumnoId}-${fecha}-${Math.random()}`, alumnoId, fecha, hora: '10:00', timestamp: 0 }) as RegistroAsistencia

// Miércoles 11/11/2026: la semana va del lunes 9 al domingo 15
const HOY = '2026-11-11'

describe('calcularSemanaAlumno', () => {
  it('arma los 7 días de lunes a domingo y marca hoy y los días que faltan', () => {
    const semana = calcularSemanaAlumno([], 'a1', '3 días por semana', HOY)
    expect(semana.dias.map((d) => d.letra)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
    expect(semana.dias[0].fecha).toBe('2026-11-09')
    expect(semana.dias[6].fecha).toBe('2026-11-15')
    expect(semana.dias.map((d) => d.esHoy)).toEqual([false, false, true, false, false, false, false])
    expect(semana.dias.map((d) => d.futuro)).toEqual([false, false, false, true, true, true, true])
  })

  it('cuenta días distintos del alumno en la semana: doble turno es 1 día, otras semanas y otros socios no cuentan', () => {
    const semana = calcularSemanaAlumno(
      [
        ingreso('a1', '2026-11-09'),
        ingreso('a1', '2026-11-09'),
        ingreso('a1', '2026-11-11'),
        ingreso('a1', '2026-11-06'),
        ingreso('a2', '2026-11-10'),
      ],
      'a1',
      '3 días por semana',
      HOY
    )
    expect(semana.dias.map((d) => d.fue)).toEqual([true, false, true, false, false, false, false])
    expect(semana.diasAsistidos).toBe(2)
    expect(semana.limite).toBe(3)
    expect(semana.restantes).toBe(1)
    expect(semana.excedido).toBe(false)
  })

  it('avisa cuando se pasó del plan, sin restantes negativos', () => {
    const semana = calcularSemanaAlumno(
      ['2026-11-09', '2026-11-10', '2026-11-11'].map((f) => ingreso('a1', f)),
      'a1',
      '2 días',
      HOY
    )
    expect(semana.excedido).toBe(true)
    expect(semana.restantes).toBe(0)
  })

  it('con plan libre no hay límite', () => {
    const semana = calcularSemanaAlumno([ingreso('a1', '2026-11-09')], 'a1', 'Libre', HOY)
    expect(semana.limite).toBeNull()
    expect(semana.restantes).toBeNull()
    expect(semana.excedido).toBe(false)
  })
})
