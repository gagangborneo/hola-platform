import { defineConfig } from 'vitest/config'

// Test unit: tanpa infra. Test integrasi dipisahkan supaya `pnpm test` tetap
// bisa jalan di mesin tanpa database (docs/16 § 8.1).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts', '**/*.api.test.ts'],
  },
})
