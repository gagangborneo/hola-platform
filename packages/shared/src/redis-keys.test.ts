/**
 * Test drift: 9 pola key ≡ docs/02-INFRASTRUCTURE.md § 4.1.
 *
 * EXPECTED disalin dari kolom "Pola key" tabel dokumen, dengan placeholder
 * diganti nilai contoh yang tetap.
 */
import { describe, expect, it } from 'vitest'
import { APP_ENV, createRedisKeys } from './redis-keys'

const COURT = 'c1'
const STARTS_AT = '2026-08-04T10:00:00Z'
const DATE = '2026-08-04'

describe('redis-keys ≡ docs/02-INFRASTRUCTURE.md § 4.1', () => {
  const k = createRedisKeys(APP_ENV.PROD)

  const cases: Array<[string, string, string]> = [
    ['Hold slot', k.holdSlot(COURT, STARTS_AT), `hola:prod:hold:slot:${COURT}:${STARTS_AT}`],
    ['Cache ketersediaan', k.availability(COURT, DATE), `hola:prod:avail:${COURT}:${DATE}`],
    ['Rate limit', k.rateLimit('auth-login', 'ip:1.2.3.4'), 'hola:prod:rl:auth-login:ip:1.2.3.4'],
    ['Idempotency', k.idempotency('bookings', 'abc'), 'hola:prod:idem:bookings:abc'],
    ['Leaderboard', k.leaderboard('sport:padel', 'p1'), 'hola:prod:lb:sport:padel:p1'],
    ['Kuota promo', k.promoQuota('pr1'), 'hola:prod:promo:quota:pr1'],
    ['Lock ringan', k.lock('daily-summary'), 'hola:prod:lock:daily-summary'],
    ['Worker heartbeat', k.workerHeartbeat(), 'hola:prod:worker:heartbeat'],
    ['BullMQ', k.bullPrefix(), 'hola:prod:bull'],
  ]

  it('tepat 9 pola key seperti tabel dokumen', () => {
    expect(cases).toHaveLength(9)
  })

  it.each(cases)('%s → %s', (_label, actual, expected) => {
    expect(actual).toBe(expected)
  })

  it('setiap key berprefiks hola:{env}: — tanpa kecuali', () => {
    for (const [label, actual] of cases) {
      expect(actual.startsWith('hola:prod:'), `${label} tidak berprefiks`).toBe(true)
    }
  })

  it.each(Object.values(APP_ENV))('prefiks mengikuti env %s', (env) => {
    expect(createRedisKeys(env).prefix()).toBe(`hola:${env}:`)
    expect(createRedisKeys(env).workerHeartbeat()).toBe(`hola:${env}:worker:heartbeat`)
  })

  it('env yang berbeda tidak pernah menghasilkan key yang sama', () => {
    const local = createRedisKeys(APP_ENV.LOCAL).holdSlot(COURT, STARTS_AT)
    const prod = createRedisKeys(APP_ENV.PROD).holdSlot(COURT, STARTS_AT)
    expect(local).not.toBe(prod)
  })

  it('builder itu pure — pemanggilan berulang menghasilkan nilai identik', () => {
    expect(k.holdSlot(COURT, STARTS_AT)).toBe(k.holdSlot(COURT, STARTS_AT))
  })
})
