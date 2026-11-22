import { beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function audioSimulado() {
  const osc = { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
  const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
  const ctx = { state: 'suspended', currentTime: 1, destination: {}, resume: vi.fn().mockResolvedValue(undefined), createOscillator: vi.fn(() => osc), createGain: vi.fn(() => gain) }
  const constructor = vi.fn(function () { return ctx })
  vi.stubGlobal('AudioContext', constructor)
  return { ctx, constructor, osc, gain }
}

it('desbloquea con el toque y reutiliza el contexto al terminar y reiniciar', async () => {
  const { ctx, constructor, osc, gain } = audioSimulado()
  const vibrate = vi.fn()
  vi.stubGlobal('navigator', { vibrate })
  const audio = await import('./asistencia-utils')
  audio.desbloquearAudioDescanso()
  expect(ctx.resume).toHaveBeenCalledOnce()
  expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1)
  expect(osc.stop).toHaveBeenCalledWith(1.01)
  audio.reproducirSonidoFinDescanso()
  expect(ctx.createOscillator).toHaveBeenCalledTimes(4)
  expect(osc.type).toBe('triangle')
  expect(vibrate).toHaveBeenCalledWith([200, 100, 200])
  audio.desbloquearAudioDescanso()
  expect(constructor).toHaveBeenCalledOnce()
})

it('sin Web Audio todavía vibra y no rompe la rutina', async () => {
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', undefined)
  const vibrate = vi.fn()
  vi.stubGlobal('navigator', { vibrate })
  const audio = await import('./asistencia-utils')
  expect(() => audio.desbloquearAudioDescanso()).not.toThrow()
  expect(() => audio.reproducirSonidoFinDescanso()).not.toThrow()
  expect(vibrate).toHaveBeenCalledOnce()
})

it('tolera el rechazo de resume sin promesas rechazadas sin manejar', async () => {
  const { ctx } = audioSimulado()
  ctx.resume.mockRejectedValue(new Error('Audio bloqueado'))
  const audio = await import('./asistencia-utils')
  audio.desbloquearAudioDescanso()
  await Promise.resolve()
})
