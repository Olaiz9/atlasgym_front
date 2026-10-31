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
  obtenerUltimos7Dias,
  reproducirSonidoFinDescanso,
  extraerLimiteDiasSemana,
  inicioSemanaLunes,
  calcularCupoSemanalAsistencia,
  fusionarAsistenciasDeFecha,
  fusionarAsistenciasDeRango,
  recortarAsistenciasParaCacheLocal,
  DURACION_SESION_MINUTOS,
  DURACION_SESION_MS,
} from './asistencia-utils'
import { Alumno, Plan, RegistroAsistencia } from './types'

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

  describe('obtenerUltimos7Dias', () => {
    it('retorna exactamente 7 días empezando por Hoy y Ayer', () => {
      const dias = obtenerUltimos7Dias('2026-09-23')
      expect(dias).toHaveLength(7)
      expect(dias[0].etiqueta).toBe('Hoy')
      expect(dias[0].fecha).toBe('2026-09-23')
      expect(dias[1].etiqueta).toBe('Ayer')
      expect(dias[6].fecha).toBe('2026-09-17')
    })
  })

  describe('reproducirSonidoFinDescanso', () => {
    it('se ejecuta sin lanzar errores en entornos sin AudioContext o en node', () => {
      expect(() => reproducirSonidoFinDescanso()).not.toThrow()
    })
  })

  describe('clasificación tripartita de estados de cuota en asistencias', () => {
    const asistencias: RegistroAsistencia[] = [
      {
        id: '1',
        alumnoId: 'a1',
        alumnoNombre: 'Lucas Al Día',
        alumnoDni: '111',
        fecha: '2026-09-24',
        hora: '10:00',
        timestamp: 1000,
        estadoCuenta: 'AL_DIA',
        planNombre: 'Musculación',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '2',
        alumnoId: 'a2',
        alumnoNombre: 'Martín Pendiente',
        alumnoDni: '222',
        fecha: '2026-09-24',
        hora: '10:15',
        timestamp: 2000,
        estadoCuenta: 'PENDIENTE',
        planNombre: 'Full Access',
        metodo: 'DNI_TOTEM',
      },
      {
        id: '3',
        alumnoId: 'a3',
        alumnoNombre: 'Carla Vencida',
        alumnoDni: '333',
        fecha: '2026-09-24',
        hora: '10:30',
        timestamp: 3000,
        estadoCuenta: 'MOROSO',
        planNombre: 'Pase Libre',
        metodo: 'DNI_TOTEM',
      },
    ]

    it('diferencia correctamente entre Al día, Pendiente y Vencido', () => {
      const alDia = asistencias.filter((a) => a.estadoCuenta === 'AL_DIA')
      const pendientes = asistencias.filter((a) => a.estadoCuenta === 'PENDIENTE')
      const vencidos = asistencias.filter((a) => a.estadoCuenta !== 'AL_DIA' && a.estadoCuenta !== 'PENDIENTE')

      expect(alDia).toHaveLength(1)
      expect(alDia[0].alumnoNombre).toBe('Lucas Al Día')

      expect(pendientes).toHaveLength(1)
      expect(pendientes[0].alumnoNombre).toBe('Martín Pendiente')

      expect(vencidos).toHaveLength(1)
      expect(vencidos[0].alumnoNombre).toBe('Carla Vencida')
    })
  })

  describe('control de cupo de días semanales por plan (sin bloqueo en puerta)', () => {
    it('extrae correctamente el tope semanal de días o null para planes libres', () => {
      expect(extraerLimiteDiasSemana('2 días por semana')).toBe(2)
      expect(extraerLimiteDiasSemana('3 días')).toBe(3)
      expect(extraerLimiteDiasSemana('4 días por semana')).toBe(4)
      expect(extraerLimiteDiasSemana('5 días por semana')).toBe(5)
      expect(extraerLimiteDiasSemana('Libre')).toBeNull()
      expect(extraerLimiteDiasSemana('Pase Full')).toBeNull()
      expect(extraerLimiteDiasSemana('Ilimitado')).toBeNull()
      expect(extraerLimiteDiasSemana('')).toBeNull()
      expect(extraerLimiteDiasSemana(null)).toBeNull()
    })

    it('calcula el lunes de la semana ISO sin corrimientos por huso horario', () => {
      expect(inicioSemanaLunes('2026-10-26')).toBe('2026-10-26') // Lunes
      expect(inicioSemanaLunes('2026-10-30')).toBe('2026-10-26') // Viernes
      expect(inicioSemanaLunes('2026-11-01')).toBe('2026-10-26') // Domingo
    })

    it('deduplica doble turno el mismo día y alerta al superar los días semanales del plan', () => {
      const planes: Plan[] = [
        { id: 'p3', nombre: 'Plan 3 Días', precio: 20000, diasPorSemana: '3 días por semana', activo: true },
        { id: 'plibre', nombre: 'Pase Libre', precio: 28000, diasPorSemana: 'Libre', activo: true },
      ]
      const alumnos: Alumno[] = [
        {
          id: 'a1',
          nombre: 'Camila Morales',
          dni: '40111222',
          planId: 'p3',
          plan: 'Plan 3 Días',
          fechaAlta: '2026-09-01',
          activo: true,
          tieneRutina: true,
        },
      ]

      // Lunes doble turno (mañana y noche) + Miércoles + Jueves = 3 días distintos -> NO excede
      const lunManana: RegistroAsistencia = {
        id: 'as1',
        alumnoId: 'a1',
        alumnoNombre: 'Camila Morales',
        alumnoDni: '40111222',
        fecha: '2026-10-26',
        hora: '09:00',
        timestamp: 1000,
        estadoCuenta: 'AL_DIA',
        planNombre: 'Plan 3 Días',
        metodo: 'DNI_TOTEM',
      }
      const lunNoche: RegistroAsistencia = {
        ...lunManana,
        id: 'as2',
        hora: '20:00',
        timestamp: 2000,
      }
      const miercoles: RegistroAsistencia = {
        ...lunManana,
        id: 'as3',
        fecha: '2026-10-28',
        timestamp: 3000,
      }
      const jueves: RegistroAsistencia = {
        ...lunManana,
        id: 'as4',
        fecha: '2026-10-29',
        timestamp: 4000,
      }
      const viernesCuartoDia: RegistroAsistencia = {
        ...lunManana,
        id: 'as5',
        fecha: '2026-10-30',
        timestamp: 5000,
      }

      const historialHastaJueves = [jueves, miercoles, lunNoche, lunManana]
      const cupoJueves = calcularCupoSemanalAsistencia(jueves, historialHastaJueves, planes, alumnos)
      expect(cupoJueves.limiteDiasSemana).toBe(3)
      expect(cupoJueves.asistenciasSemana).toBe(3)
      expect(cupoJueves.excedeLimiteSemanal).toBe(false)

      const historialConViernes = [viernesCuartoDia, ...historialHastaJueves]
      const cupoViernes = calcularCupoSemanalAsistencia(viernesCuartoDia, historialConViernes, planes, alumnos)
      expect(cupoViernes.limiteDiasSemana).toBe(3)
      expect(cupoViernes.asistenciasSemana).toBe(4)
      expect(cupoViernes.excedeLimiteSemanal).toBe(true)
    })
  })

  describe('Etapa 2 - Polling escalable O(Hoy), fusión por rango y cuota segura de localStorage', () => {
    const baseAyer: RegistroAsistencia = {
      id: '10',
      alumnoId: 'a1',
      alumnoNombre: 'Socio Ayer',
      alumnoDni: '30111222',
      fecha: '2026-10-30',
      hora: '19:00',
      timestamp: 1000,
      estadoCuenta: 'AL_DIA',
      planNombre: 'Pase Libre',
      metodo: 'DNI_TOTEM',
    }
    const hoy1: RegistroAsistencia = {
      ...baseAyer,
      id: '20',
      alumnoNombre: 'Socio Hoy',
      alumnoDni: '35222333',
      fecha: '2026-10-31',
      hora: '09:00',
      timestamp: 2000,
    }
    const localOfflineHoy: RegistroAsistencia = {
      ...baseAyer,
      id: 'asist-local-999',
      alumnoNombre: 'Socio Offline Pendiente',
      alumnoDni: '40999888',
      fecha: '2026-10-31',
      hora: '09:10',
      timestamp: 2500,
    }

    it('fusionarAsistenciasDeFecha conserva días previos, preserva locales offline pendientes y mantiene igualdad referencial sin cambios', () => {
      const estadoInicial = [localOfflineHoy, hoy1, baseAyer]
      // Si el servidor devuelve hoy1 sin cambios, mantiene la misma referencia para no re-renderizar ni tocar localStorage
      const sinCambios = fusionarAsistenciasDeFecha(estadoInicial, [hoy1], '2026-10-31')
      expect(sinCambios).toBe(estadoInicial)

      // Si llega un nuevo ingreso de hoy desde otra tablet, se fusiona manteniendo baseAyer y el offline pendiente
      const hoy2: RegistroAsistencia = {
        ...hoy1,
        id: '21',
        alumnoDni: '41777666',
        hora: '10:30',
        timestamp: 3000,
      }
      const actualizado = fusionarAsistenciasDeFecha(estadoInicial, [hoy1, hoy2], '2026-10-31')
      expect(actualizado).toHaveLength(4)
      expect(actualizado[0].id).toBe('21')
      expect(actualizado.some((r) => r.id === '10')).toBe(true)
      expect(actualizado.some((r) => r.id === 'asist-local-999')).toBe(true)
    })

    it('fusionarAsistenciasDeRango incorpora consultas históricas sin borrar días fuera de esa ventana', () => {
      const historicoSeptiembre: RegistroAsistencia = {
        ...baseAyer,
        id: '1',
        fecha: '2026-09-15',
        timestamp: 500,
      }
      const combinado = fusionarAsistenciasDeRango(
        [hoy1, baseAyer],
        [historicoSeptiembre],
        '2026-09-01',
        '2026-09-30'
      )
      expect(combinado).toHaveLength(3)
      expect(combinado[0].id).toBe('20')
      expect(combinado[2].id).toBe('1')
    })

    it('recortarAsistenciasParaCacheLocal limita a 7 días y máximo de registros para impedir QuotaExceededError', () => {
      const coleccionGrande: RegistroAsistencia[] = []
      for (let i = 0; i < 650; i++) {
        coleccionGrande.push({
          ...hoy1,
          id: `reg-${i}`,
          fecha: i < 550 ? '2026-10-31' : '2026-09-01',
          timestamp: 10000 + i,
        })
      }
      const recortada = recortarAsistenciasParaCacheLocal(coleccionGrande, '2026-10-31', 7, 500)
      expect(recortada).toHaveLength(500)
      expect(recortada.every((r) => r.fecha >= '2026-10-24')).toBe(true)
      expect(recortada[0].timestamp).toBeGreaterThan(recortada[499].timestamp)
    })
  })
})
