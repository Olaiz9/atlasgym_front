import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    // Cobertura: "npm run test:coverage" genera coverage/index.html (abrir en el navegador).
    // Solo mide; no hace fallar los tests por porcentaje.
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', 'lib/mock-data.ts'],
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
