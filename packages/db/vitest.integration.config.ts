import { defineConfig } from 'vitest/config'

// Test integrasi: butuh PostgreSQL nyata (`pnpm dev:infra`) dan
// TEST_DATABASE_URL. Migration dijalankan SEKALI sebelum suite lewat
// globalSetup (docs/16 BR-TT-05).
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    // Race test butuh commit sungguhan; jalankan berurutan agar tidak saling
    // menimpa database yang sama.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
