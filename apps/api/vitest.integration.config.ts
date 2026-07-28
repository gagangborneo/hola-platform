import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/setup-env.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
