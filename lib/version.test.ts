import { describe, expect, it } from 'vitest'
import { textoVersion } from './version'

describe('Versión visible en el login', () => {
  it('muestra la versión y el commit corto', () => {
    expect(textoVersion('1.0.0', '8ddc4bc1234567890abcdef')).toBe('v1.0.0 · 8ddc4bc')
  })

  it('sin commit (por ejemplo, build sin git) muestra solo la versión', () => {
    expect(textoVersion('1.0.0', '')).toBe('v1.0.0')
    expect(textoVersion('1.0.0', undefined)).toBe('v1.0.0')
  })

  it('sin versión no inventa un número', () => {
    expect(textoVersion(undefined, 'abc1234')).toBe('versión de desarrollo')
  })
})
