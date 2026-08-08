import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Split by extension, not by directory: every test file under src is either
// .ts or .tsx, so this is exhaustive and nothing can fall between the two
// projects (a directory-based split can leave a file matching neither
// project's glob, which vitest then runs zero tests for — silently, with no
// warning). .tsx implies JSX implies (usually) a DOM, so it gets happy-dom;
// .ts stays on node. Escape hatch: a .ts test that genuinely needs a DOM adds
// `// @vitest-environment happy-dom` as the first line of that file.
// Pinned away from the machine's default zone on purpose: this repo's dev/CI
// hosts default to Asia/Makassar (WITA, UTC+8), which is exactly the zone
// `formatTimeWita`/`formatDateWita` hardcode as their `timeZone` option. If a
// change ever dropped that option, `Intl.DateTimeFormat` would silently fall
// back to the environment's local zone and, on a UTC+8 runner, produce the
// same output as the pinned-timezone code path — the regression would pass
// unnoticed. Setting TZ to a zone several hours off UTC+8 for both projects
// makes that class of regression fail loudly instead.
const TZ = 'America/New_York'

export default defineConfig({
  plugins: [react()],
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    env: { TZ },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          env: { TZ },
          include: ['src/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'happy-dom',
          globals: true,
          env: { TZ },
          include: ['src/**/*.{test,spec}.tsx'],
        },
      },
    ],
  },
})
