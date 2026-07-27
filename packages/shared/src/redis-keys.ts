/**
 * Builder key Redis — 9 pola dari docs/02-INFRASTRUCTURE.md § 4.1.
 *
 * Semua key diawali `hola:{env}:`. Menyusun string key secara ad-hoc di service
 * DILARANG (docs/16-CONVENTIONS.md BR-RD-02, AI-6): satu typo pada prefiks
 * berarti dua lingkungan saling menimpa data.
 *
 * Fungsi di sini **pure** — tidak menyentuh `process.env` (packages/shared harus
 * jalan di React Native, docs/01-ARCHITECTURE.md § 3.6). `env` disuntikkan oleh
 * pemanggil: apps/api memanggil `createRedisKeys(env.APP_ENV)` satu kali di
 * config/redis.ts.
 */

export const APP_ENV = {
  LOCAL: 'local',
  STAGING: 'staging',
  PROD: 'prod',
} as const
export type AppEnv = (typeof APP_ENV)[keyof typeof APP_ENV]

/** Scope leaderboard: `global` atau `sport:{sportCode}` (docs/02 § 4.2 R-5). */
export type LeaderboardScope = string

export interface RedisKeys {
  /** Hold slot lapis 1 — `SET NX EX 600` (R-1). TTL: HOLD_SLOT_TTL_SECONDS. */
  holdSlot(courtId: string, startsAtIso: string): string
  /** Cache ketersediaan satu court satu tanggal (R-3). TTL: AVAILABILITY_TTL_SECONDS. */
  availability(courtId: string, dateYmd: string): string
  /** Counter rate limit fixed window (R-2). TTL: sesuai window bucket. */
  rateLimit(bucket: string, identifier: string): string
  /** Fast path idempotency (R-4). TTL: IDEMPOTENCY_TTL_SECONDS. */
  idempotency(scope: string, key: string): string
  /** Sorted set leaderboard (R-5). Tanpa TTL — dapat di-rebuild. */
  leaderboard(scope: LeaderboardScope, periodId: string): string
  /** Counter kuota promo, advisory saja (R-6). TTL: sampai `valid_until` + 1 hari. */
  promoQuota(promoId: string): string
  /** Lock ringan untuk job non-kritis (R-7). TTL: ≤ LOCK_MAX_TTL_SECONDS. */
  lock(name: string): string
  /** Heartbeat worker (docs/02 § 2). TTL: WORKER_HEARTBEAT_TTL_SECONDS. */
  workerHeartbeat(): string
  /** Prefiks yang diberikan ke BullMQ (R-8). BullMQ mengelola isinya sendiri. */
  bullPrefix(): string
  /** Prefiks mentah `hola:{env}:` — untuk SCAN berpola, bukan untuk menyusun key. */
  prefix(): string
}

export function createRedisKeys(env: AppEnv): RedisKeys {
  const p = `hola:${env}:`
  return {
    holdSlot: (courtId, startsAtIso) => `${p}hold:slot:${courtId}:${startsAtIso}`,
    availability: (courtId, dateYmd) => `${p}avail:${courtId}:${dateYmd}`,
    rateLimit: (bucket, identifier) => `${p}rl:${bucket}:${identifier}`,
    idempotency: (scope, key) => `${p}idem:${scope}:${key}`,
    leaderboard: (scope, periodId) => `${p}lb:${scope}:${periodId}`,
    promoQuota: (promoId) => `${p}promo:quota:${promoId}`,
    lock: (name) => `${p}lock:${name}`,
    workerHeartbeat: () => `${p}worker:heartbeat`,
    bullPrefix: () => `${p}bull`,
    prefix: () => p,
  }
}
