import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Split by extension, not by directory: every test file under src is either
// .ts or .tsx, so this is exhaustive and nothing can fall between the two
// projects (a directory-based split can leave a file matching neither
// project's glob, which vitest then runs zero tests for — silently, with no
// warning). .tsx implies JSX implies (usually) a DOM, so it gets happy-dom;
// .ts stays on node. Escape hatch: a .ts test that genuinely needs a DOM adds
// `// @vitest-environment happy-dom` as the first line of that file.
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
          include: ['src/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'happy-dom',
          globals: true,
          include: ['src/**/*.{test,spec}.tsx'],
        },
      },
    ],
  },
})
