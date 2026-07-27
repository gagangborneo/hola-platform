/**
 * `pnpm check:env` — membandingkan kunci di `apps/<app>/.env.example` dengan
 * kunci di schema zod `packages/shared/src/env/`.
 *
 * Ketidaksinkronan = keluar dengan status non-nol, sehingga CI gagal
 * (docs/02-INFRASTRUCTURE.md § 8; DoD-0-04 mewajibkan ini DIBUKTIKAN gagal saat
 * satu kunci dihapus dari `.env.example`).
 *
 * Skrip ini hidup di root, BUKAN di packages/shared, karena ia perlu `node:fs`
 * sementara packages/shared dilarang menyentuh API Node (harus jalan di React
 * Native, docs/01 § 3.6).
 *
 * Dijalankan langsung oleh Node (type stripping, Node ≥ 22.6) — tanpa build step.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENV_SCHEMAS, type EnvAppName, envSchemaKeys } from '../packages/shared/src/env/index.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Kunci yang boleh ada di `.env.example` tanpa muncul di schema. */
const ALLOWED_EXTRA: Partial<Record<EnvAppName, readonly string[]>> = {}

/** Kunci yang boleh ada di schema tanpa muncul di `.env.example`. */
const ALLOWED_MISSING: Partial<Record<EnvAppName, readonly string[]>> = {
  // Rahasia build yang hidup di EAS Secrets, bukan di repo (docs/02 § 8.4).
  mobile: ['SENTRY_AUTH_TOKEN'],
}

function parseEnvExampleKeys(path: string): string[] {
  const keys: string[] = []
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    keys.push(line.slice(0, eq).trim())
  }
  return keys
}

let failed = false
let checked = 0
const skipped: string[] = []

for (const [app, schema] of Object.entries(ENV_SCHEMAS) as Array<[EnvAppName, never]>) {
  const path = join(ROOT, 'apps', app, '.env.example')
  const rel = relative(ROOT, path)

  if (!existsSync(path)) {
    // App belum di-scaffold. Bukan kegagalan — tetapi DILAPORKAN, supaya
    // "tidak ada yang diperiksa" tidak pernah terbaca sebagai "semuanya lulus".
    skipped.push(`${app} (${rel} belum ada)`)
    continue
  }

  checked++
  const fileKeys = new Set(parseEnvExampleKeys(path))
  const schemaKeys = new Set(envSchemaKeys(schema))
  const allowedExtra = new Set(ALLOWED_EXTRA[app] ?? [])
  const allowedMissing = new Set(ALLOWED_MISSING[app] ?? [])

  const missing = [...schemaKeys].filter((k) => !fileKeys.has(k) && !allowedMissing.has(k)).sort()
  const extra = [...fileKeys].filter((k) => !schemaKeys.has(k) && !allowedExtra.has(k)).sort()

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ok   ${app.padEnd(6)} ${schemaKeys.size} kunci — ${rel}`)
    continue
  }

  failed = true
  console.error(`  GAGAL ${app.padEnd(6)} ${rel}`)
  for (const k of missing) console.error(`        ada di schema, hilang di .env.example : ${k}`)
  for (const k of extra) console.error(`        ada di .env.example, tidak di schema   : ${k}`)
}

console.log('')
if (skipped.length > 0) {
  console.log(`  dilewati: ${skipped.join(', ')}`)
}
console.log(`  ${checked} app diperiksa, ${skipped.length} dilewati`)

if (failed) {
  console.error('\ncheck:env GAGAL — .env.example dan schema zod tidak sinkron (docs/02 § 8).')
  process.exit(1)
}
