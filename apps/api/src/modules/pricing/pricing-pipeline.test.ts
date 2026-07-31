import { ERROR_CODE, type QuoteInput, type QuotePromo } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../lib/errors.ts'
import type {
  PricingAddon,
  PricingCourt,
  PricingPriceRule,
  PricingSpecialDate,
} from './pricing.repository.ts'
import { comparePriceRules, computePricingPipeline } from './pricing-pipeline.ts'

const AT = '2026-07-31T00:00:00.000Z'
const WEEKEND_SLOT = '2026-08-01T11:00:00.000Z' // Sabtu 19:00 WITA
const WEEKDAY_SLOT = '2026-08-03T01:00:00.000Z' // Senin 09:00 WITA

const court: PricingCourt = {
  id: 'court-padel',
  code: 'PDL-01',
  sportId: 'sport-padel',
  slotDurationMinutes: 60,
  status: 'active',
}

const racket: PricingAddon = {
  id: 'addon-racket',
  code: 'RACKET',
  name: 'Sewa raket',
  priceAmount: 25_000,
  isActive: true,
}

function bookingInput(
  overrides: Partial<Extract<QuoteInput, { kind: 'booking' }>> = {},
): Extract<QuoteInput, { kind: 'booking' }> {
  return {
    kind: 'booking',
    at: AT,
    actor: { role: 'customer' },
    booking: { items: [{ court_id: court.id, starts_at: WEEKEND_SLOT }], addons: [] },
    ...overrides,
  }
}

function priceRule(overrides: Partial<PricingPriceRule> = {}): PricingPriceRule {
  return {
    id: 'rule-default',
    courtId: null,
    sportId: court.sportId,
    dayType: 'weekend',
    specificDate: null,
    startsTime: '06:00:00',
    endsTime: '23:00:00',
    rateClass: 'offpeak',
    pricePerHourAmount: 150_000,
    priority: 0,
    activeFrom: null,
    activeTo: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function quote(
  input: QuoteInput,
  options: {
    addons?: readonly PricingAddon[]
    courts?: readonly PricingCourt[]
    priceRules?: readonly PricingPriceRule[]
    promo?: { promo: QuotePromo | null; warnings: [] }
    specialDates?: readonly PricingSpecialDate[]
    taxRate?: number
  } = {},
) {
  return computePricingPipeline({
    input,
    courts: options.courts ?? [court],
    addons: options.addons ?? [racket],
    priceRules: options.priceRules ?? [priceRule()],
    specialDates: options.specialDates ?? [],
    ...(options.promo ? { promo: options.promo } : {}),
    taxRate: options.taxRate ?? 0,
  })
}

function expectAppError(fn: () => unknown, code: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe(code)
    return
  }
  throw new Error(`Expected ${code}`)
}

describe('pricing.computeQuote — P0 normalisasi dan batas input', () => {
  it('BR-P-01 / P0: memakai input.at sebagai computed_at tanpa membaca jam nyata', () => {
    expect(quote(bookingInput()).computed_at).toBe(AT)
  })

  it('P0: menolak slot duplikat dan batas keras 8 slot / 10 addon', () => {
    const duplicate = bookingInput({
      booking: {
        items: [
          { court_id: court.id, starts_at: WEEKEND_SLOT },
          { court_id: court.id, starts_at: WEEKEND_SLOT },
        ],
        addons: [],
      },
    })
    expectAppError(() => quote(duplicate), ERROR_CODE.VALIDATION_ERROR)

    const tooManySlots = bookingInput({
      booking: {
        items: Array.from({ length: 9 }, (_, index) => ({
          court_id: court.id,
          starts_at: `2026-08-01T${String(index).padStart(2, '0')}:00:00.000Z`,
        })),
        addons: [],
      },
    })
    expectAppError(() => quote(tooManySlots), ERROR_CODE.QUOTE_ITEM_LIMIT_EXCEEDED)

    const tooManyAddons = bookingInput({
      booking: {
        items: [{ court_id: court.id, starts_at: WEEKEND_SLOT }],
        addons: Array.from({ length: 11 }, () => ({ addon_id: racket.id, quantity: 1 })),
      },
    })
    expectAppError(() => quote(tooManyAddons), ERROR_CODE.QUOTE_ITEM_LIMIT_EXCEEDED)
  })

  it('P0: menolak timestamp tidak valid dan booking tanpa slot', () => {
    expectAppError(
      () => quote(bookingInput({ at: 'bukan-timestamp' })),
      ERROR_CODE.VALIDATION_ERROR,
    )
    expectAppError(
      () => quote(bookingInput({ booking: { items: [], addons: [] } })),
      ERROR_CODE.VALIDATION_ERROR,
    )
  })
})

describe('pricing.computeQuote — P1, P3–P10', () => {
  it('P1: event gratis menghasilkan satu fee line dan total 0', () => {
    const input: Extract<QuoteInput, { kind: 'event_registration' }> = {
      kind: 'event_registration',
      at: AT,
      actor: { role: 'customer' },
      event: { event_id: 'event-free' },
    }
    const result = computePricingPipeline({
      input,
      payable: { id: 'event-free', label: 'Open play gratis', amount: 0 },
      taxRate: 0,
    })
    expect(result.lines).toEqual([
      expect.objectContaining({ type: 'fee', unit_price_amount: 0, line_total_amount: 0 }),
    ])
    expect(result.total_amount).toBe(0)
  })

  it('P3–P10: menghitung proporsi durasi, addon, tax, clamp promo, dan total', () => {
    const ninetyMinuteCourt = { ...court, slotDurationMinutes: 90 }
    const result = quote(
      bookingInput({
        booking: {
          items: [{ court_id: court.id, starts_at: WEEKEND_SLOT }],
          addons: [{ addon_id: racket.id, quantity: 2 }],
        },
      }),
      {
        courts: [ninetyMinuteCourt],
        priceRules: [priceRule({ pricePerHourAmount: 175_000 })],
        promo: {
          promo: {
            promo_id: 'promo-too-large',
            code: 'BIG',
            name: 'Promo besar',
            type: 'fixed',
            discount_amount: 999_999,
          },
          warnings: [],
        },
        taxRate: 0.11,
      },
    )
    expect(result.lines[0]).toMatchObject({
      unit_price_amount: 262_500,
      line_total_amount: 262_500,
    })
    expect(result.subtotal_amount).toBe(262_500)
    expect(result.addon_amount).toBe(50_000)
    expect(result.tier_discount_amount).toBe(0)
    expect(result.discount_amount).toBe(312_500)
    expect(result.taxable_base_amount).toBe(0)
    expect(result.tax_amount).toBe(0)
    expect(result.fee_amount).toBe(0)
    expect(result.total_amount).toBe(0)
    expect(result.rounding_adjustment_amount).toBe(0)
    expect(result.warnings.map((warning) => warning.code)).toContain('DISCOUNT_CLAMPED')
  })

  it('P5: menolak addon tidak aktif dan quantity di luar 1..20', () => {
    const inactive = bookingInput({
      booking: {
        items: [{ court_id: court.id, starts_at: WEEKEND_SLOT }],
        addons: [{ addon_id: racket.id, quantity: 1 }],
      },
    })
    expectAppError(
      () => quote(inactive, { addons: [{ ...racket, isActive: false }] }),
      ERROR_CODE.ADDON_NOT_APPLICABLE,
    )
    const invalidQuantity = bookingInput({
      booking: {
        items: [{ court_id: court.id, starts_at: WEEKEND_SLOT }],
        addons: [{ addon_id: racket.id, quantity: 21 }],
      },
    })
    expectAppError(() => quote(invalidQuantity), ERROR_CODE.ADDON_NOT_APPLICABLE)
  })

  it('P0/P1: menolak court tidak bookable dan payable yang tidak konsisten', () => {
    expectAppError(
      () => quote(bookingInput(), { courts: [{ ...court, status: 'inactive' }] }),
      ERROR_CODE.COURT_NOT_BOOKABLE,
    )
    expectAppError(
      () => computePricingPipeline({ input: bookingInput(), taxRate: 0 }),
      ERROR_CODE.COURT_NOT_BOOKABLE,
    )
    expectAppError(
      () => computePricingPipeline({ input: bookingInput(), courts: [court], taxRate: 0 }),
      ERROR_CODE.PRICE_RULE_NOT_FOUND,
    )
    const tournament: Extract<QuoteInput, { kind: 'tournament_registration' }> = {
      kind: 'tournament_registration',
      at: AT,
      actor: { role: 'customer' },
      tournament: { tournament_id: 'tournament-1' },
    }
    expectAppError(
      () =>
        computePricingPipeline({
          input: tournament,
          payable: { id: 'wrong-id', label: 'Turnamen', amount: 100_000 },
          taxRate: 0,
        }),
      ERROR_CODE.INTERNAL_ERROR,
    )
    expectAppError(
      () => computePricingPipeline({ input: tournament, taxRate: 0 }),
      ERROR_CODE.INTERNAL_ERROR,
    )
  })
})

describe('pricing.computeQuote — P2 resolusi price rule', () => {
  it('E-11: menolak slot tanpa price rule, tidak memakai harga default', () => {
    expectAppError(() => quote(bookingInput(), { priceRules: [] }), ERROR_CODE.PRICE_RULE_NOT_FOUND)
  })

  it('P2: menerapkan lima kondisi cocok termasuk active, scope, tanggal, jam, dan tipe hari', () => {
    const rules = [
      priceRule({ id: 'inactive', isActive: false, pricePerHourAmount: 1 }),
      priceRule({ id: 'wrong-scope', sportId: 'other-sport', pricePerHourAmount: 2 }),
      priceRule({ id: 'expired', activeTo: '2026-07-31', pricePerHourAmount: 3 }),
      priceRule({ id: 'wrong-time', startsTime: '20:00:00', pricePerHourAmount: 4 }),
      priceRule({ id: 'wrong-day', dayType: 'weekday', pricePerHourAmount: 5 }),
      priceRule({
        id: 'match',
        startsTime: '19:00:00',
        endsTime: '20:00:00',
        pricePerHourAmount: 200_000,
      }),
    ]
    const result = quote(bookingInput(), { priceRules: rules })
    expect(result.lines[0]).toMatchObject({ price_rule_id: 'match', unit_price_amount: 200_000 })
  })

  it('P2: menolak konfigurasi waktu rule yang rusak sebagai invariant internal', () => {
    expectAppError(
      () => quote(bookingInput(), { priceRules: [priceRule({ startsTime: 'rusak' })] }),
      ERROR_CODE.INTERNAL_ERROR,
    )
  })

  it.each([
    [
      'priority',
      priceRule({ id: 'low', priority: 1 }),
      priceRule({ id: 'high', priority: 2 }),
      'high',
    ],
    [
      'court scope',
      priceRule({ id: 'sport' }),
      priceRule({ id: 'court', courtId: court.id }),
      'court',
    ],
    [
      'narrower time',
      priceRule({ id: 'wide' }),
      priceRule({ id: 'narrow', startsTime: '18:00:00', endsTime: '20:00:00' }),
      'narrow',
    ],
    [
      'latest created_at',
      priceRule({ id: 'old', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      priceRule({ id: 'new', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
      'new',
    ],
    ['id ASC terakhir', priceRule({ id: 'b' }), priceRule({ id: 'a' }), 'a'],
  ])('P2 tie-break %s memilih rule deterministik', (_name, first, second, expectedId) => {
    const result = quote(bookingInput(), { priceRules: [first, second] })
    expect(result.lines[0]?.price_rule_id).toBe(expectedId)
  })

  it('P2 tie-break tipe hari mengurutkan specific_date > holiday > weekend > weekday', () => {
    const ordered = [
      priceRule({ id: 'weekday', dayType: 'weekday' }),
      priceRule({ id: 'weekend', dayType: 'weekend' }),
      priceRule({ id: 'holiday', dayType: 'holiday' }),
      priceRule({ id: 'specific', dayType: 'specific_date' }),
    ].sort(comparePriceRules)
    expect(ordered.map((rule) => rule.id)).toEqual(['specific', 'holiday', 'weekend', 'weekday'])
  })

  it('P2 menentukan specific_date, special date, weekend, dan weekday secara berurutan', () => {
    const specific = quote(bookingInput(), {
      priceRules: [
        priceRule({ id: 'weekend', pricePerHourAmount: 100_000 }),
        priceRule({
          id: 'specific',
          dayType: 'specific_date',
          specificDate: '2026-08-01',
          pricePerHourAmount: 200_000,
        }),
      ],
    })
    expect(specific.lines[0]?.price_rule_id).toBe('specific')

    const holiday = quote(bookingInput(), {
      priceRules: [priceRule({ id: 'holiday', dayType: 'holiday', pricePerHourAmount: 225_000 })],
      specialDates: [{ date: '2026-08-01', dayTypeOverride: 'holiday' }],
    })
    expect(holiday.lines[0]?.price_rule_id).toBe('holiday')

    const weekday = quote(
      bookingInput({
        booking: { items: [{ court_id: court.id, starts_at: WEEKDAY_SLOT }], addons: [] },
      }),
      {
        priceRules: [priceRule({ id: 'weekday', dayType: 'weekday', pricePerHourAmount: 175_000 })],
      },
    )
    expect(weekday.lines[0]?.price_rule_id).toBe('weekday')
  })

  it('P2: menerima batas active_from/active_to yang mencakup tanggal slot', () => {
    const result = quote(bookingInput(), {
      priceRules: [
        priceRule({
          id: 'bounded',
          activeFrom: '2026-08-01',
          activeTo: '2026-08-01',
          pricePerHourAmount: 175_000,
        }),
      ],
    })
    expect(result.lines[0]?.price_rule_id).toBe('bounded')
  })

  it('E-12: dua rule identik kecuali id selalu memilih id ASC', () => {
    const first = quote(bookingInput(), {
      priceRules: [priceRule({ id: 'z' }), priceRule({ id: 'a' })],
    })
    const second = quote(bookingInput(), {
      priceRules: [priceRule({ id: 'a' }), priceRule({ id: 'z' })],
    })
    expect(first.lines[0]?.price_rule_id).toBe('a')
    expect(second.lines[0]?.price_rule_id).toBe('a')
  })
})

describe('pricing.computeQuote — contoh docs/07 § 3.4', () => {
  it('menghasilkan booking weekend dua slot + RACKET + HOLA20 = Rp575.000', () => {
    const result = quote(
      bookingInput({
        booking: {
          items: [
            { court_id: court.id, starts_at: WEEKEND_SLOT },
            { court_id: court.id, starts_at: '2026-08-01T12:00:00.000Z' },
          ],
          addons: [{ addon_id: racket.id, quantity: 1 }],
        },
      }),
      {
        priceRules: [
          priceRule({
            id: 'weekend-peak',
            courtId: court.id,
            startsTime: '16:00:00',
            endsTime: '23:00:00',
            rateClass: 'peak',
            pricePerHourAmount: 300_000,
            priority: 10,
          }),
        ],
        promo: {
          promo: {
            promo_id: 'promo-hola20',
            code: 'HOLA20',
            name: 'Hola 20',
            type: 'percent',
            discount_amount: 50_000,
          },
          warnings: [],
        },
      },
    )
    expect(result).toMatchObject({
      subtotal_amount: 600_000,
      addon_amount: 25_000,
      tier_discount_amount: 0,
      discount_amount: 50_000,
      tax_amount: 0,
      fee_amount: 0,
      rounding_adjustment_amount: 0,
      total_amount: 575_000,
    })
  })
})
