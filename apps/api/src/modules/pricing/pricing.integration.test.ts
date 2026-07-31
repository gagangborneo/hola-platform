import { addons, appSettings, courts, priceRules, specialDates, sports, venues } from '@hola/db'
import { SETTINGS_KEY } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { computeQuote } from './pricing.service.ts'

const ids = {
  venue: '018f0000-0000-7000-8000-000000000901',
  sport: '018f0000-0000-7000-8000-000000000902',
  court: '018f0000-0000-7000-8000-000000000903',
  addon: '018f0000-0000-7000-8000-000000000904',
  priceRule: '018f0000-0000-7000-8000-000000000905',
  specialDate: '018f0000-0000-7000-8000-000000000906',
} as const

async function cleanPricingFixtures(): Promise<void> {
  await db.delete(priceRules).where(eq(priceRules.id, ids.priceRule))
  await db.delete(specialDates).where(eq(specialDates.id, ids.specialDate))
  await db.delete(addons).where(eq(addons.id, ids.addon))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(appSettings).where(eq(appSettings.key, SETTINGS_KEY.TAX_RATE))
}

async function insertPricingFixtures(): Promise<void> {
  await db.insert(venues).values({ id: ids.venue, name: 'Pricing fixture venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'PRICING', name: 'Pricing fixture sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'PRICE-01',
    name: 'Pricing fixture court',
    slotDurationMinutes: 60,
  })
  await db.insert(addons).values({
    id: ids.addon,
    code: 'PRICE-RACKET',
    name: 'Pricing racket',
    priceAmount: 25_000,
  })
  await db.insert(priceRules).values({
    id: ids.priceRule,
    sportId: ids.sport,
    dayType: 'holiday',
    startsTime: '00:00',
    endsTime: '23:00',
    rateClass: 'special',
    pricePerHourAmount: 200_000,
  })
  await db.insert(specialDates).values({
    id: ids.specialDate,
    date: '2026-08-01',
    name: 'Pricing holiday',
    dayTypeOverride: 'holiday',
  })
  await db.insert(appSettings).values({ key: SETTINGS_KEY.TAX_RATE, value: 0.11 })
}

beforeEach(async () => {
  await cleanPricingFixtures()
  await insertPricingFixtures()
})

afterAll(cleanPricingFixtures)

describe('pricing.computeQuote dengan PostgreSQL', () => {
  it('P0/P2/P5/P8: memakai tanggal WITA untuk special date dan tax_rate app_settings', async () => {
    // 00:00 WITA tanggal 1 Agustus masih 31 Juli dalam UTC. Ini mengunci agar
    // query special_dates tidak salah memakai potongan tanggal UTC dari input.
    const result = await computeQuote(
      { db },
      {
        kind: 'booking',
        at: '2026-07-31T00:00:00.000Z',
        actor: { role: 'customer' },
        booking: {
          items: [{ court_id: ids.court, starts_at: '2026-07-31T16:00:00.000Z' }],
          addons: [{ addon_id: ids.addon, quantity: 1 }],
        },
      },
    )

    expect(result).toMatchObject({
      subtotal_amount: 200_000,
      addon_amount: 25_000,
      tax_rate: 0.11,
      tax_amount: 24_800,
      total_amount: 249_800,
    })
    expect(result.lines[0]).toMatchObject({ rate_class: 'special', price_rule_id: ids.priceRule })
  })

  it('P1: resolver payable yang disuntikkan membentuk fee line tanpa schema event kosong', async () => {
    const result = await computeQuote(
      {
        db,
        resolvePayable: async ({ id, kind, now }) => {
          expect({ id, kind, now: now.toISOString() }).toEqual({
            id: 'event-1',
            kind: 'event_registration',
            now: '2026-07-31T00:00:00.000Z',
          })
          return { id, label: 'Open play', amount: 100_000 }
        },
      },
      {
        kind: 'event_registration',
        at: '2026-07-31T00:00:00.000Z',
        actor: { role: 'customer' },
        event: { event_id: 'event-1' },
      },
    )

    expect(result.lines).toEqual([
      expect.objectContaining({ type: 'fee', line_total_amount: 100_000 }),
    ])
    expect(result.total_amount).toBe(111_000)
  })
})
