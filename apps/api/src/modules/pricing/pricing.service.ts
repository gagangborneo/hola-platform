/** Satu-satunya service yang menghitung harga (docs/07 § 3). */

import type { HolaDb } from '@hola/db'
import { ERROR_CODE, type Quote, type QuoteInput, witaDateYmd } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import {
  findPricingAddons,
  findPricingCourts,
  findPricingPriceRules,
  findPricingSpecialDates,
  findTaxRateSetting,
} from './pricing.repository.ts'
import {
  computePricingPipeline,
  type PayableQuote,
  type PromoEvaluation,
} from './pricing-pipeline.ts'

export type PayableQuoteResolver = (input: {
  id: string
  kind: Exclude<QuoteInput['kind'], 'booking'>
  now: Date
}) => Promise<PayableQuote>

export type PromoEvaluator = (input: {
  quoteInput: QuoteInput
  subtotalAmount: number
  addonAmount: number
  lines: Quote['lines']
}) => Promise<PromoEvaluation>

export type PricingServiceContext = {
  db: HolaDb
  resolvePayable?: PayableQuoteResolver
  evaluatePromo?: PromoEvaluator
}

function taxRate(value: unknown): number {
  // [D-06] default sementara — lihat docs/00-OVERVIEW.md § 6
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function payableId(input: Exclude<QuoteInput, { kind: 'booking' }>): string {
  return input.kind === 'event_registration' ? input.event.event_id : input.tournament.tournament_id
}

/**
 * Menghitung Quote dengan satu `now` dari context. Tidak membaca jam sendiri.
 * Resolver payable dan promo sengaja disuntikkan karena modul targetnya belum
 * dibangun pada Phase 1.B; tidak ada schema kosong atau business rule duplikat.
 */
export async function computeQuote(ctx: PricingServiceContext, input: QuoteInput): Promise<Quote> {
  const at = new Date(input.at)
  if (Number.isNaN(at.getTime())) throw err.validation({ field: 'at' })
  if (input.kind !== 'booking') {
    if (!ctx.resolvePayable) throw err.of(ERROR_CODE.FEATURE_DISABLED)
    const payable = await ctx.resolvePayable({ id: payableId(input), kind: input.kind, now: at })
    const taxRateValue = taxRate(await findTaxRateSetting(ctx.db))
    const promo = ctx.evaluatePromo
      ? await ctx.evaluatePromo({
          quoteInput: input,
          subtotalAmount: payable.amount,
          addonAmount: 0,
          lines: [],
        })
      : undefined
    return computePricingPipeline({
      input,
      payable,
      ...(promo ? { promo } : {}),
      taxRate: taxRateValue,
    })
  }

  const courtIds = input.booking.items.map((item) => item.court_id)
  const addonIds = input.booking.addons.map((addon) => addon.addon_id)
  const slotDates = input.booking.items.map((item) => witaDateYmd(new Date(item.starts_at)))
  const [courts, addons, priceRules, specialDates, taxRateSetting] = await Promise.all([
    findPricingCourts(ctx.db, courtIds),
    findPricingAddons(ctx.db, addonIds),
    findPricingPriceRules(ctx.db),
    findPricingSpecialDates(ctx.db, slotDates),
    findTaxRateSetting(ctx.db),
  ])

  const preliminary = computePricingPipeline({
    input,
    courts,
    addons,
    priceRules,
    specialDates,
    taxRate: taxRate(taxRateSetting),
  })
  if (!ctx.evaluatePromo) return preliminary

  const promo = await ctx.evaluatePromo({
    quoteInput: input,
    subtotalAmount: preliminary.subtotal_amount,
    addonAmount: preliminary.addon_amount,
    lines: preliminary.lines,
  })
  return computePricingPipeline({
    input,
    courts,
    addons,
    priceRules,
    specialDates,
    promo,
    taxRate: taxRate(taxRateSetting),
  })
}
