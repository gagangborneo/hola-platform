/**
 * `@hola/shared` — satu-satunya sumber kebenaran untuk konstanta, schema
 * validasi, dan helper pure lintas app (docs/01-ARCHITECTURE.md § 3.6).
 *
 * Larangan yang ditegakkan mesin (biome.json + tsconfig `types: []`):
 * tanpa API Node, tanpa `process.env`, tanpa `@hola/db` — paket ini juga jalan
 * di React Native.
 */

export * from './constants/enums'
export * from './constants/error-codes'
export * from './constants/limits'
export * from './constants/notification-templates'
export * from './constants/queues'
export * from './constants/settings-keys'

export * from './format/date'
export * from './format/duration'
export * from './format/money'

export * from './redis-keys'

export * from './schemas/auth'
export * from './schemas/common'

export * from './types/quote'

export * from './utils/iso-week'
export * from './utils/round'
export * from './utils/slot-grid'
export * from './utils/wita'

// `env/` SENGAJA tidak di-reexport dari barrel: hanya dipakai saat boot oleh
// masing-masing app dan oleh scripts/check-env.ts. Impor langsung dari
// '@hola/shared/env/index.ts' agar zod schema env tidak ikut ke bundle mobile.
