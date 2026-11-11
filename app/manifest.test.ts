import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('Web App Manifest (app/manifest.ts)', () => {
  it('devuelve la configuración standalone en español y apunta a íconos que existen en public/', () => {
    const data = manifest()

    expect(data.name).toBe('ATLAS GYM')
    expect(data.short_name).toBe('ATLAS')
    expect(data.description).toBe('Plataforma de entrenamiento y gestión ATLAS GYM.')
    expect(data.start_url).toBe('/')
    expect(data.display).toBe('standalone')
    expect(data.lang).toBe('es')
    expect(data.background_color).toBe('#172554')
    expect(data.theme_color).toBe('#172554')

    expect(Array.isArray(data.icons)).toBe(true)
    expect(data.icons!.length).toBeGreaterThan(0)

    for (const icon of data.icons!) {
      const rutaEnPublic = path.join(process.cwd(), 'public', icon.src.replace(/^\//, ''))
      expect(fs.existsSync(rutaEnPublic)).toBe(true)
    }
  })
})
