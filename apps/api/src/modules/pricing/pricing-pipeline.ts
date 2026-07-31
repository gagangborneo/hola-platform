/** Fungsi murni step P0–P10 pipeline harga. */
import {
  ADDON_QUANTITY_MAX,
  ADDON_QUANTITY_MIN,
  type DayType,
  ERROR_CODE,
  MAX_ADDONS_PER_QUOTE,
  MAX_SLOTS_PER_QUOTE,
  QUOTE_PIPELINE_VERSION,
  type Quote,
  type QuoteInput,
  type QuoteLine,
  type QuotePromo,
  type QuoteWarning,
  roundTo100,
  toWitaParts,
  WARNING_CODE,
} from '@hola/shared'
import { err } from '../../lib/errors.ts'
import type {
  PricingAddon,
  PricingCourt,
  PricingPriceRule,
  PricingSpecialDate,
} from './pricing.repository.ts'

export type PayableQuote = {
  id: string
  label: string
  amount: number
}

export type PromoEvaluation = {
  promo: QuotePromo | null
  warnings: QuoteWarning[]
}

type PipelineInput = {
  input: QuoteInput
  taxRate: number
  courts?: readonly PricingCourt[]
  addons?: readonly PricingAddon[]
  priceRules?: readonly PricingPriceRule[]
  specialDates?: readonly PricingSpecialDate[]
  payable?: PayableQuote
  promo?: PromoEvaluation
}

type SlotInput = {
  courtId: string
  startsAt: Date
}

function asInstant(value: string, field: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw err.validation({ field })
  return parsed
}

function timeMinutes(value: string): number {
  const [hours, minutes, seconds = '0'] = value.split(':')
  if (hours === undefined || minutes === undefined) throw err.internal()
  return Number(hours) * 60 + Number(minutes) + Number(seconds) / 60
}

function witaDate(instant: Date): string {
  const parts = toWitaParts(instant)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function dayTypeFor(
  slotDate: string,
  weekday: number,
  priceRules: readonly PricingPriceRule[],
  specialDates: readonly PricingSpecialDate[],
): DayType {
  if (
    priceRules.some(
      (rule) => rule.isActive && rule.dayType === 'specific_date' && rule.specificDate === slotDate,
    )
  ) {
    return 'specific_date'
  }
  const specialDate = specialDates.find((candidate) => candidate.date === slotDate)
  if (specialDate?.dayTypeOverride) return specialDate.dayTypeOverride
  return weekday === 0 || weekday === 6 ? 'weekend' : 'weekday'
}

function dayTypeSpecificity(dayType: DayType): number {
  switch (dayType) {
    case 'specific_date':
      return 4
    case 'holiday':
      return 3
    case 'weekend':
      return 2
    case 'weekday':
      return 1
  }
}

/** Urutan tie-break P2 yang deterministik (docs/07 § 3.3). */
export function comparePriceRules(left: PricingPriceRule, right: PricingPriceRule): number {
  const priority = right.priority - left.priority
  if (priority !== 0) return priority
  const scope = Number(right.courtId !== null) - Number(left.courtId !== null)
  if (scope !== 0) return scope
  const dayType = dayTypeSpecificity(right.dayType) - dayTypeSpecificity(left.dayType)
  if (dayType !== 0) return dayType
  const span =
    timeMinutes(left.endsTime) -
    timeMinutes(left.startsTime) -
    (timeMinutes(right.endsTime) - timeMinutes(right.startsTime))
  if (span !== 0) return span
  const createdAt = right.createdAt.getTime() - left.createdAt.getTime()
  if (createdAt !== 0) return createdAt
  return left.id.localeCompare(right.id)
}

function matchingPriceRule(
  court: PricingCourt,
  slot: SlotInput,
  priceRules: readonly PricingPriceRule[],
  specialDates: readonly PricingSpecialDate[],
): PricingPriceRule | null {
  const local = toWitaParts(slot.startsAt)
  const slotDate = witaDate(slot.startsAt)
  const minute = local.hour * 60 + local.minute + local.second / 60
  const dayType = dayTypeFor(slotDate, local.weekday, priceRules, specialDates)
  const matching = priceRules.filter(
    (rule) =>
      rule.isActive &&
      (rule.courtId === court.id || (rule.courtId === null && rule.sportId === court.sportId)) &&
      (rule.activeFrom === null || rule.activeFrom <= slotDate) &&
      (rule.activeTo === null || rule.activeTo >= slotDate) &&
      timeMinutes(rule.startsTime) <= minute &&
      minute < timeMinutes(rule.endsTime) &&
      rule.dayType === dayType,
  )
  return matching.sort(comparePriceRules)[0] ?? null
}

function validateBookingInput(input: Extract<QuoteInput, { kind: 'booking' }>): SlotInput[] {
  if (input.booking.items.length === 0) throw err.validation({ field: 'booking.items' })
  if (input.booking.items.length > MAX_SLOTS_PER_QUOTE)
    throw err.of(ERROR_CODE.QUOTE_ITEM_LIMIT_EXCEEDED)
  if (input.booking.addons.length > MAX_ADDONS_PER_QUOTE)
    throw err.of(ERROR_CODE.QUOTE_ITEM_LIMIT_EXCEEDED)

  const slots = input.booking.items.map((item) => ({
    courtId: item.court_id,
    startsAt: asInstant(item.starts_at, 'booking.items.starts_at'),
  }))
  const seen = new Set<string>()
  for (const slot of slots) {
    const key = `${slot.courtId}:${slot.startsAt.toISOString()}`
    if (seen.has(key)) throw err.validation({ field: 'booking.items', reason: 'duplicate_slot' })
    seen.add(key)
  }
  return slots
}

function bookingLines(
  input: Extract<QuoteInput, { kind: 'booking' }>,
  data: PipelineInput,
): QuoteLine[] {
  const slots = validateBookingInput(input)
  const courts = new Map(data.courts?.map((court) => [court.id, court]))
  const rules = data.priceRules ?? []
  const specialDates = data.specialDates ?? []
  const missingRules: Array<{ court_id: string; starts_at: string }> = []
  const lines: QuoteLine[] = []

  for (const slot of slots) {
    const court = courts.get(slot.courtId)
    if (!court || court.status === 'inactive') throw err.of(ERROR_CODE.COURT_NOT_BOOKABLE)
    const rule = matchingPriceRule(court, slot, rules, specialDates)
    if (!rule) {
      missingRules.push({ court_id: court.id, starts_at: slot.startsAt.toISOString() })
      continue
    }
    const unitPriceAmount = roundTo100((rule.pricePerHourAmount * court.slotDurationMinutes) / 60)
    const endsAt = new Date(slot.startsAt.getTime() + court.slotDurationMinutes * 60_000)
    lines.push({
      type: 'slot',
      ref_id: court.id,
      label: court.code,
      court_code: court.code,
      starts_at: slot.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      rate_class: rule.rateClass,
      price_rule_id: rule.id,
      quantity: 1,
      unit_price_amount: unitPriceAmount,
      line_total_amount: unitPriceAmount,
    })
  }
  if (missingRules.length > 0)
    throw err.of(ERROR_CODE.PRICE_RULE_NOT_FOUND, { details: missingRules })
  return lines
}

function addonLines(
  input: Extract<QuoteInput, { kind: 'booking' }>,
  data: PipelineInput,
): QuoteLine[] {
  const addons = new Map(data.addons?.map((addon) => [addon.id, addon]))
  return input.booking.addons.map((inputAddon) => {
    if (
      !Number.isInteger(inputAddon.quantity) ||
      inputAddon.quantity < ADDON_QUANTITY_MIN ||
      inputAddon.quantity > ADDON_QUANTITY_MAX
    ) {
      throw err.of(ERROR_CODE.ADDON_NOT_APPLICABLE)
    }
    const addon = addons.get(inputAddon.addon_id)
    if (!addon?.isActive) throw err.of(ERROR_CODE.ADDON_NOT_APPLICABLE)
    return {
      type: 'addon',
      ref_id: addon.id,
      label: addon.name,
      quantity: inputAddon.quantity,
      unit_price_amount: addon.priceAmount,
      line_total_amount: addon.priceAmount * inputAddon.quantity,
    }
  })
}

function payableLine(
  input: Exclude<QuoteInput, { kind: 'booking' }>,
  payable: PayableQuote,
): QuoteLine {
  const expectedId =
    input.kind === 'event_registration' ? input.event.event_id : input.tournament.tournament_id
  if (payable.id !== expectedId) throw err.internal()
  return {
    type: 'fee',
    ref_id: payable.id,
    label: payable.label,
    quantity: 1,
    unit_price_amount: payable.amount,
    line_total_amount: payable.amount,
  }
}

function evaluatedPromo(promo: PromoEvaluation | undefined, baseAmount: number): PromoEvaluation {
  const current = promo ?? { promo: null, warnings: [] }
  if (!current.promo || current.promo.discount_amount <= baseAmount) return current
  return {
    promo: { ...current.promo, discount_amount: baseAmount },
    warnings: [
      ...current.warnings,
      {
        code: WARNING_CODE.DISCOUNT_CLAMPED,
        message: 'Diskon disesuaikan agar tidak melebihi nilai transaksi.',
      },
    ],
  }
}

/** Menghasilkan satu snapshot Quote; seluruh input data sudah diambil repository/service. */
export function computePricingPipeline(data: PipelineInput): Quote {
  const computedAt = asInstant(data.input.at, 'at')
  const lines =
    data.input.kind === 'booking'
      ? [...bookingLines(data.input, data), ...addonLines(data.input, data)]
      : [
          payableLine(
            data.input,
            data.payable ??
              (() => {
                throw err.internal()
              })(),
          ),
        ]
  const subtotalAmount = lines
    .filter((line) => line.type === 'slot' || line.type === 'fee')
    .reduce((total, line) => total + line.line_total_amount, 0)
  const addonAmount = lines
    .filter((line) => line.type === 'addon')
    .reduce((total, line) => total + line.line_total_amount, 0)
  const tierDiscountAmount = 0
  const promo = evaluatedPromo(data.promo, subtotalAmount + addonAmount)
  const discountAmount = tierDiscountAmount + (promo.promo?.discount_amount ?? 0)
  const taxableBaseAmount = subtotalAmount + addonAmount - discountAmount
  const taxAmount = roundTo100(taxableBaseAmount * data.taxRate)
  // [D-07] default sementara — lihat docs/00-OVERVIEW.md § 6
  const feeAmount = 0
  const rawTotal = subtotalAmount + addonAmount - discountAmount + taxAmount + feeAmount
  const totalAmount = Math.max(0, roundTo100(rawTotal))

  return {
    kind: data.input.kind,
    computed_at: computedAt.toISOString(),
    pipeline_version: QUOTE_PIPELINE_VERSION,
    lines,
    subtotal_amount: subtotalAmount,
    addon_amount: addonAmount,
    tier_discount_amount: tierDiscountAmount,
    promo: promo.promo,
    discount_amount: discountAmount,
    taxable_base_amount: taxableBaseAmount,
    tax_rate: data.taxRate,
    tax_amount: taxAmount,
    fee_amount: feeAmount,
    rounding_adjustment_amount: totalAmount - rawTotal,
    total_amount: totalAmount,
    currency: 'IDR',
    warnings: promo.warnings,
  }
}
