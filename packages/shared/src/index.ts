/**
 * `@hola/shared` — satu-satunya sumber kebenaran untuk konstanta, schema
 * validasi, dan helper pure lintas app (docs/01-ARCHITECTURE.md § 3.6).
 *
 * Larangan yang ditegakkan mesin (biome.json + tsconfig `types: []`):
 * tanpa API Node, tanpa `process.env`, tanpa `@hola/db` — paket ini juga jalan
 * di React Native.
 */

export * from './constants/enums.ts'
export * from './constants/error-codes.ts'
export * from './constants/limits.ts'
export * from './constants/notification-templates.ts'
export * from './constants/queues.ts'
export * from './constants/settings-keys.ts'
export * from './constants/weak-passwords.ts'

export * from './format/date.ts'
export * from './format/duration.ts'
export * from './format/money.ts'

export * from './redis-keys.ts'

export * from './schemas/auth.ts'
export * from './schemas/common.ts'
export * from './schemas/system.ts'

export * from './types/quote.ts'

export * from './utils/iso-week.ts'
export * from './utils/round.ts'
export * from './utils/slot-grid.ts'
export * from './utils/wita.ts'

// `env/` SENGAJA tidak di-reexport dari barrel: hanya dipakai saat boot oleh
// masing-masing app dan oleh scripts/check-env.ts. Impor langsung dari
// '@hola/shared/env/index.ts' agar zod schema env tidak ikut ke bundle mobile.
