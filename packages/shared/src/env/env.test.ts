/**
 * F0-21 — larangan `packages/shared` + kesehatan schema env.
 *
 * Larangan import ditegakkan tiga lapis; test ini adalah lapis yang berjalan di
 * CI bersama test lain:
 *   1. `biome.json` override — `node:*`, `fs`, `path`, `crypto`, `pg`, `ioredis`,
 *      `@hola/db`, dan `process.env` ditolak di packages/shared/**
 *   2. `packages/shared/tsconfig.json` — `types: []`, jadi tipe Node tidak ada
 *   3. test di bawah — memindai teks sumbernya sendiri
 *
 * Pemindaian sumber di sini memakai `import.meta.glob`-style raw import dari
 * Vitest, BUKAN `node:fs` — file test pun tunduk pada larangan yang sama.
 */
import { describe, expect, it } from 'vitest'
import { ENV_SCHEMAS, type EnvAppName, envSchemaKeys } from './index.ts'

// `import.meta.glob` disediakan Vite saat runtime test. Tipenya dideklarasikan
// di sini, bukan dengan menambahkan `vite/client` ke tsconfig: `types: []` di
// packages/shared/tsconfig.json memang disengaja — begitu tipe ambient masuk,
// `process.env` dan API Node ikut lolos typecheck padahal dilarang.
declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { query: string; import: string; eager: true },
    ): Record<string, unknown>
  }
}

/** Seluruh sumber packages/shared sebagai teks, dimuat oleh Vite (bukan fs). */
const rawSources = import.meta.glob('../**/*.ts', { query: '?raw', import: 'default', eager: true })

/**
 * Buang komentar sebelum memindai.
 *
 * Tanpa ini, dokumentasi yang MENJELASKAN larangan ("tidak boleh menyentuh
 * `node:fs`") ikut tertangkap sebagai pelanggaran — pemindai jadi berisik dan
 * orang berhenti mempercayainya. Komentar baris hanya dibuang bila berada di
 * awal baris, supaya `http://` di dalam string tidak ikut terpotong.
 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
}

const sources = Object.fromEntries(
  Object.entries(rawSources).map(([path, code]) => [path, stripComments(code as string)]),
)

const FORBIDDEN_IMPORTS = [
  'node:fs',
  'node:path',
  'node:crypto',
  'node:os',
  'node:child_process',
  "from 'fs'",
  "from 'path'",
  "from 'crypto'",
  "from 'pg'",
  "from 'ioredis'",
  "from 'bullmq'",
  "from '@hola/db'",
  "from 'drizzle-orm'",
]

describe('F0-21 — packages/shared harus jalan di React Native (docs/01 § 3.6)', () => {
  const files = Object.entries(sources) as Array<[string, string]>

  it('memindai lebih dari satu file (kalau glob-nya kosong, test ini palsu)', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(FORBIDDEN_IMPORTS)('tidak ada yang mengimpor %s', (needle) => {
    const offenders = files.filter(([, code]) => code.includes(needle)).map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('tidak ada yang menyentuh process.env', () => {
    const offenders = files
      .filter(([path]) => !path.endsWith('env.test.ts'))
      .filter(([, code]) => /\bprocess\s*\.\s*env\b/.test(code))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('tidak memakai enum TypeScript (docs/16 BR-TS-05)', () => {
    const offenders = files
      .filter(([, code]) => /^\s*(export\s+)?(const\s+)?enum\s+\w/m.test(code))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('tidak memakai non-null assertion pada akses properti (docs/16 BR-TS-03)', () => {
    const offenders = files
      .filter(([path]) => !path.endsWith('env.test.ts'))
      .filter(([, code]) => /\w!\s*\./.test(code))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

describe('schema env (docs/02 § 8)', () => {
  const apps = Object.keys(ENV_SCHEMAS) as EnvAppName[]

  it('ada schema untuk keempat app', () => {
    expect(apps.sort()).toEqual(['admin', 'api', 'mobile', 'web'])
  })

  it.each(apps)('%s: envSchemaKeys mengembalikan daftar kunci non-kosong', (app) => {
    expect(envSchemaKeys(ENV_SCHEMAS[app]).length).toBeGreaterThan(0)
  })

  it('rahasia server TIDAK PERNAH ada di schema app frontend (docs/02 § 8.2 catatan)', () => {
    const forbidden = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_ACCESS_SECRET',
      'PASSWORD_PEPPER',
      'MIDTRANS_SERVER_KEY',
    ]
    for (const app of ['web', 'admin', 'mobile'] as const) {
      const keys = new Set(envSchemaKeys(ENV_SCHEMAS[app]))
      for (const key of forbidden) {
        expect(keys.has(key), `${key} bocor ke schema ${app}`).toBe(false)
      }
    }
  })

  it('setiap kunci yang sampai ke client berprefiks NEXT_PUBLIC_ / EXPO_PUBLIC_', () => {
    // Kunci build-time/server-side yang sah tanpa prefiks publik.
    const serverSide = new Set(['NODE_ENV', 'API_BASE_URL_INTERNAL', 'SENTRY_AUTH_TOKEN'])
    for (const [app, prefix] of [
      ['web', 'NEXT_PUBLIC_'],
      ['admin', 'NEXT_PUBLIC_'],
      ['mobile', 'EXPO_PUBLIC_'],
    ] as const) {
      const offenders = envSchemaKeys(ENV_SCHEMAS[app])
        .filter((k) => !serverSide.has(k) && k !== 'EAS_PROJECT_ID')
        .filter((k) => !k.startsWith(prefix))
      expect(offenders, `schema ${app}`).toEqual([])
    }
  })

  it('booleanFromEnv memperlakukan "false" sebagai false, bukan truthy', () => {
    // Jebakan nyata: z.coerce.boolean() menganggap string "false" bernilai true,
    // yang berarti MIDTRANS_IS_PRODUCTION=false akan menyalakan mode produksi.
    const base = {
      NODE_ENV: 'test',
      APP_ENV: 'local',
      API_BASE_URL: 'http://localhost:4000',
      WEB_BASE_URL: 'http://localhost:3000',
      ADMIN_BASE_URL: 'http://localhost:3001',
      CORS_ORIGINS: 'http://localhost:3000',
      DATABASE_URL: 'postgres://hola:hola@localhost:5432/hola',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      PASSWORD_PEPPER: 'y'.repeat(16),
      COOKIE_DOMAIN: 'localhost',
      MIDTRANS_SERVER_KEY: 'sk',
      MIDTRANS_CLIENT_KEY: 'ck',
      MIDTRANS_MERCHANT_ID: 'mid',
      MIDTRANS_IS_PRODUCTION: 'false',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'hola',
      S3_SECRET_ACCESS_KEY: 'hola12345',
      S3_BUCKET_MEDIA: 'hola-media',
      S3_BUCKET_PRIVATE: 'hola-private',
      S3_BUCKET_BACKUP: 'hola-backup',
      MEDIA_PUBLIC_BASE_URL: 'http://localhost:9000/hola-media',
      MAIL_TRANSPORT: 'console',
      MAIL_FROM: 'Hola <noreply@hola.test>',
      EXPO_ACCESS_TOKEN: 'tok',
      INTERNAL_TOKEN: 'i'.repeat(32),
      BULLBOARD_USER: 'admin',
      BULLBOARD_PASSWORD: 'secret',
    }
    const parsed = ENV_SCHEMAS.api.parse(base)
    expect(parsed.MIDTRANS_IS_PRODUCTION).toBe(false)
    expect(parsed.PORT).toBe(4000)
    expect(parsed.CORS_ORIGINS).toEqual(['http://localhost:3000'])
  })

  it('RESEND_API_KEY wajib saat MAIL_TRANSPORT=resend (docs/02 § 8.1, tanda ✓*)', () => {
    const base = {
      NODE_ENV: 'test',
      APP_ENV: 'local',
      API_BASE_URL: 'http://localhost:4000',
      WEB_BASE_URL: 'http://localhost:3000',
      ADMIN_BASE_URL: 'http://localhost:3001',
      CORS_ORIGINS: 'http://localhost:3000',
      DATABASE_URL: 'postgres://x',
      REDIS_URL: 'redis://x',
      JWT_ACCESS_SECRET: 'x'.repeat(32),
      PASSWORD_PEPPER: 'y'.repeat(16),
      COOKIE_DOMAIN: 'localhost',
      MIDTRANS_SERVER_KEY: 'sk',
      MIDTRANS_CLIENT_KEY: 'ck',
      MIDTRANS_MERCHANT_ID: 'mid',
      MIDTRANS_IS_PRODUCTION: 'false',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'a',
      S3_SECRET_ACCESS_KEY: 'b',
      S3_BUCKET_MEDIA: 'm',
      S3_BUCKET_PRIVATE: 'p',
      S3_BUCKET_BACKUP: 'k',
      MEDIA_PUBLIC_BASE_URL: 'http://localhost:9000/m',
      MAIL_FROM: 'Hola <noreply@hola.test>',
      EXPO_ACCESS_TOKEN: 'tok',
      INTERNAL_TOKEN: 'i'.repeat(32),
      BULLBOARD_USER: 'admin',
      BULLBOARD_PASSWORD: 'secret',
      MAIL_TRANSPORT: 'resend',
    }
    expect(ENV_SCHEMAS.api.safeParse(base).success).toBe(false)
    expect(ENV_SCHEMAS.api.safeParse({ ...base, RESEND_API_KEY: 're_x' }).success).toBe(true)
  })

  it('JWT_ACCESS_SECRET pendek ditolak', () => {
    expect(ENV_SCHEMAS.api.safeParse({ JWT_ACCESS_SECRET: 'pendek' }).success).toBe(false)
  })
})
