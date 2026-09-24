// lib/asistencias.test.ts
import { describe, it, expect } from 'vitest'
import {
  normalizarDni,
  estaSesionActiva,
  calcularMinutosTranscurridos,
  formatearTiempoEnSala,
  filtrarAsistenciasActivas,
  calcularDistribucionHoraria,
  calcularDistribucionSemanal,
  DURACION_SESION_MINUTOS,
  DURACION_SESION_MS,
} from './asistencia-utils'
import { RegistroAsistencia } from './types'

describe('Módulo de Asistencias y Caducidad de Sesiones (1h 40m)', () => {
  describe('normalizarDni', () => {
    it('elimina puntos, guiones y espacios de un DNI', () => {
      expect(normalizarDni('41.890.123')).toBe('41890123')
      expect(normalizarDni(' 39-456-789 ')).toBe('39456789')
      expect(normalizarDni('42 123 456')).toBe('42123456')
    })

    it('maneja valores vacíos o nulos', () => {
      expect(normalizarDni('')).toBe('')
      expect(normalizarDni(null as unknown as string)).toBe('')
      expect(normalizarDni(undefined as unknown as string)).toBe('')
    })
  })

  describe('estaSesionActiva y caducidad automática a 1h 40m (100 min)', () => {
    const ahora = 1700000000000 // Timestamp base

    it('retorna true si el alumno ingresó hace menos de 100 minutos', () => {
      const hace30Min = ahora - 30 * 60 * 1000
      const hace99Min = ahora - 99 * 60 * 1000
      expect(estaSesionActiva(hace30Min, ahora)).toBe(true)
      expect(estaSesionActiva(hace99Min, ahora)).toBe(true)
    })

    it('retorna false si el alumno ingresó hace 100 o más minutos (sesión caducada)', () => {
      const hace100Min = ahora - 100 * 60 * 1000
      const hace120Min = ahora - 120 * 60 * 1000
      expect(estaSesionActiva(hace100Min, ahora)).toBe(false)
      expect(estaSesionActiva(hace120Min, ahora)).toBe(false)
    })

    it('maneja timestamps inválidos o cero', () => {
      expect(estaSesionActiva(0, ahora)).toBe(false)
      expect(estaSesionActiva(-100, ahora)).toBe(false)
    })
  })

  describe('calcularMinutosTranscurridos y formatearTiempoEnSala', () => {
    const ahora = 1700000000000

    it('calcula los minutos transcurridos correctamente', () => {
      expect(calcularMinutosTranscurridos(ahora - 45 * 60 * 1000, ahora)).toBe(45)
      expect(calcularMinutosTranscurridos(ahora, ahora)).toBe(0)
    })

    it('formatea el tiempo en sala para lectura humana', () => {
      expect(formatearTiempoEnSala(ahora - 10 * 1000, ahora)).toBe('Recién ingresó')
      expect(formatearTiempoEnSala(ahora - 25 * 60 * 1000, ahora)).toBe('Hace 25 min')
      expect(formatearTiempoEnSala(ahora - 60 * 60 * 1000, ahora)).toBe('Hace 1h')
      expect(formatearTiempoEnSala(ahora - 95 * 60 * 1000, ahora)).toBe('Hace 1h 35m')
      expect(formatearTiempoEnSala(ahora - 105 * 60 * 1000, ahora)).toBe('Sesión completada')
    })
  })

  describe('filtrarAsistenciasActivas', () => {
    const ahora = 1700000000000

    const asistenciasPrueba: RegistroAsistencia[] = [
      {
        id: '1',
        alumnoId: 'a1',
        alumnoNombre: 'Lucía',
        alumnoDni: '111',
        fecha: '2026-09-23',
        hora: '19:00',
        timestamp: ahora - 20 * 60 * 1000, // Activa (20 min)
        estadoCuenta: 'AL_DIA',
        planNombre: 'Musculación',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '2',
        alumnoId: 'a2',
        alumnoNombre: 'Martín',
        alumnoDni: '222',
        fecha: '2026-09-23',
        hora: '17:30',
        timestamp: ahora - 110 * 60 * 1000, // Expirada (110 min > 100 min)
        estadoCuenta: 'AL_DIA',
        planNombre: 'Full Access',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '3',
        alumnoId: 'a3',
        alumnoNombre: 'Diego',
        alumnoDni: '333',
        fecha: '2026-09-23',
        hora: '18:40',
        timestamp: ahora - 40 * 60 * 1000, // Activa (40 min)
        estadoCuenta: 'PENDIENTE',
        planNombre: 'Funcional',
        metodo: 'DNI_TOTEM',
      },
    ]

    it('filtra únicamente los alumnos cuya sesión no superó los 100 minutos', () => {
      const activas = filtrarAsistenciasActivas(asistenciasPrueba, ahora)
      expect(activas).toHaveLength(2)
      expect(activas.map((a) => a.id)).toEqual(['1', '3'])
    })
  })

  describe('calcularDistribucionHoraria', () => {
    const asistencias: RegistroAsistencia[] = [
      {
        id: '1',
        alumnoId: 'a1',
        alumnoNombre: 'A',
        alumnoDni: '1',
        fecha: '2026-09-23',
        hora: '18:15',
        timestamp: 1000,
        estadoCuenta: 'AL_DIA',
        planNombre: 'P',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '2',
        alumnoId: 'a2',
        alumnoNombre: 'B',
        alumnoDni: '2',
        fecha: '2026-09-23',
        hora: '18:45',
        timestamp: 2000,
        estadoCuenta: 'AL_DIA',
        planNombre: 'P',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '3',
        alumnoId: 'a3',
        alumnoNombre: 'C',
        alumnoDni: '3',
        fecha: '2026-09-23',
        hora: '09:00',
        timestamp: 3000,
        estadoCuenta: 'AL_DIA',
        planNombre: 'P',
        metodo: 'DNI_TOTEM',
      },
    ]

    it('devuelve todas las franjas de 07:00 a 22:00 hs', () => {
      const dist = calcularDistribucionHoraria(asistencias)
      expect(dist).toHaveLength(16) // 7 a 22 inclusive
      expect(dist[0].etiqueta).toBe('07:00')
      expect(dist[dist.length - 1].etiqueta).toBe('22:00')
    })

    it('acumula correctamente la cantidad y calcula el pico', () => {
      const dist = calcularDistribucionHoraria(asistencias)
      const h18 = dist.find((d) => d.hora === 18)
      const h9 = dist.find((d) => d.hora === 9)
      const h12 = dist.find((d) => d.hora === 12)

      expect(h18?.cantidad).toBe(2)
      expect(h18?.porcentaje).toBe(100) // Pico máximo
      expect(h9?.cantidad).toBe(1)
      expect(h9?.porcentaje).toBe(50)
      expect(h12?.cantidad).toBe(0)
      expect(h12?.porcentaje).toBe(0)
    })
  })

  describe('calcularDistribucionSemanal', () => {
    it('devuelve los 6 días laborables de la semana', () => {
      const asistencias: RegistroAsistencia[] = [
        {
          id: '1',
          alumnoId: 'a1',
          alumnoNombre: 'A',
          alumnoDni: '1',
          fecha: '2026-09-21', // Lunes
          hora: '18:00',
          timestamp: 1000,
          estadoCuenta: 'AL_DIA',
          planNombre: 'P',
          metodo: 'DNI_TOTEM',
        },
      ]

      const dist = calcularDistribucionSemanal(asistencias)
      expect(dist).toHaveLength(6)
      expect(dist.map((d) => d.dia)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'])
      const lunes = dist.find((d) => d.dia === 'Lunes')
      expect(lunes?.cantidad).toBe(1)
      expect(lunes?.porcentaje).toBe(100)
    })
  })
})
