import { describe, expect, it } from 'vitest'
import { DATOS_LEGALES, datosLegalesPendientes, nombreResponsable } from './datos-legales'

describe('Datos legales de /privacidad', () => {
  const base = { ...DATOS_LEGALES, responsable: '', cuit: '', domicilio: '', contactoPrivacidad: '' }

  it('razón social, CUIT y domicilio son opcionales: sin ellos no hay cartel de "pendientes"', () => {
    expect(datosLegalesPendientes({ ...base, contactoPrivacidad: 'consultas@gimnasio.com' })).toEqual([])
  })

  it('los datos reales del gimnasio están completos: /privacidad no muestra el cartel de "pendientes"', () => {
    expect(datosLegalesPendientes()).toEqual([])
    expect(DATOS_LEGALES.contactoPrivacidad).toContain('@')
  })

  it('el contacto de privacidad sigue siendo obligatorio', () => {
    expect(datosLegalesPendientes(base)).toEqual(['contacto para consultas de privacidad'])
  })

  it('sin razón social nombra a los titulares del gimnasio, sin textos de "a completar"', () => {
    expect(nombreResponsable(base)).toBe('los titulares de ATLAS Gym')
    expect(nombreResponsable({ ...base, responsable: 'Gimnasio SRL' })).toBe('Gimnasio SRL')
  })
})
