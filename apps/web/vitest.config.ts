import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          exclude: [...configDefaults.exclude, 'src/components/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'happy-dom',
          globals: true,
          include: ['src/components/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
