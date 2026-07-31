import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/setup-env.ts'],
    // P1-13 / BR-TT-15: bagian perhitungan murni harus 100% tertutup. Query
    // repository diverifikasi terpisah lewat integration test PostgreSQL.
    coverage: {
      provider: 'v8',
      include: ['src/modules/pricing/pricing-pipeline.ts'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
