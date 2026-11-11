import { describe, it, expect } from 'vitest';
import { cn, generarPassword, formatearMoneda } from '@/lib/utils';

describe('Utilidades de Atlas Gym (lib/utils.ts)', () => {
  describe('cn (Classnames and Tailwind Merge)', () => {
    it('debe combinar clases simples correctamente', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('debe resolver conflictos de Tailwind dando prioridad a la última clase', () => {
      expect(cn('px-2 text-red-500', 'px-4 text-blue-500')).toBe('px-4 text-blue-500');
    });
  });

  describe('generarPassword', () => {
    it('debe generar una contraseña de longitud por defecto (8)', () => {
      const pass = generarPassword();
      expect(pass).toHaveLength(8);
    });

    it('debe generar una contraseña con longitud personalizada', () => {
      const pass = generarPassword(12);
      expect(pass).toHaveLength(12);
    });

    it('debe generar contraseñas distintas en llamadas sucesivas', () => {
      const pass1 = generarPassword();
      const pass2 = generarPassword();
      expect(pass1).not.toBe(pass2);
    });
  });

  describe('formatearMoneda', () => {
    it('debe formatear números a formato de moneda argentina', () => {
      const resultado = formatearMoneda(15000);
      expect(resultado).toContain('15');
      expect(resultado.startsWith('$')).toBe(true);
    });

    it('debe manejar montos inválidos o strings vacíos retornando $0', () => {
      expect(formatearMoneda('')).toBe('$0');
      expect(formatearMoneda('abc')).toBe('$0');
    });
  });
});
