import { isRecord } from './api-response.ts'

export type PromoTypeValue = 'percent' | 'fixed' | 'free_slot'
export type PromoStatusValue = 'draft' | 'active' | 'paused' | 'expired' | 'archived'

export interface Promo {
  appliesTo: string
  code: string | null
  description: string | null
  freeSlotCount: number | null
  id: string
  isAuto: boolean
  maxDiscountAmount: number | null
  minSlotCount: number | null
  minTransactionAmount: number
  name: string
  quotaPerUser: number | null
  quotaTotal: number | null
  quotaUsed: number
  status: PromoStatusValue
  type: PromoTypeValue
  validFrom: string
  validUntil: string
  valueAmount: number | null
  valuePercent: number | null
  version: number
}

interface PromoResponse {
  applies_to: string
  code: string | null
  description: string | null
  free_slot_count: number | null
  id: string
  is_auto: boolean
  max_discount_amount: number | null
  min_slot_count: number | null
  min_transaction_amount: number
  name: string
  quota_per_user: number | null
  quota_total: number | null
  quota_used: number
  status: PromoStatusValue
  type: PromoTypeValue
  valid_from: string
  valid_until: string
  value_amount: number | null
  value_percent: number | null
  version: number
}

const PROMO_TYPES: readonly string[] = ['percent', 'fixed', 'free_slot']
const PROMO_STATUSES: readonly string[] = ['draft', 'active', 'paused', 'expired', 'archived']

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === 'number' || value === null
}

export function isPromoStatus(value: unknown): value is PromoStatusValue {
  return typeof value === 'string' && PROMO_STATUSES.includes(value)
}

export function isPromoResponse(value: unknown): value is PromoResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.applies_to === 'string' &&
    typeof value.is_auto === 'boolean' &&
    typeof value.min_transaction_amount === 'number' &&
    typeof value.quota_used === 'number' &&
    typeof value.valid_from === 'string' &&
    typeof value.valid_until === 'string' &&
    typeof value.version === 'number' &&
    typeof value.type === 'string' &&
    PROMO_TYPES.includes(value.type) &&
    isPromoStatus(value.status) &&
    (typeof value.code === 'string' || value.code === null) &&
    (typeof value.description === 'string' || value.description === null) &&
    isNullableNumber(value.value_percent) &&
    isNullableNumber(value.value_amount) &&
    isNullableNumber(value.free_slot_count) &&
    isNullableNumber(value.max_discount_amount) &&
    isNullableNumber(value.min_slot_count) &&
    isNullableNumber(value.quota_total) &&
    isNullableNumber(value.quota_per_user)
  )
}

export function normalizePromo(value: PromoResponse): Promo {
  return {
    id: value.id,
    code: value.code,
    name: value.name,
    description: value.description,
    type: value.type,
    valuePercent: value.value_percent,
    valueAmount: value.value_amount,
    freeSlotCount: value.free_slot_count,
    maxDiscountAmount: value.max_discount_amount,
    minTransactionAmount: value.min_transaction_amount,
    minSlotCount: value.min_slot_count,
    appliesTo: value.applies_to,
    quotaTotal: value.quota_total,
    quotaUsed: value.quota_used,
    quotaPerUser: value.quota_per_user,
    validFrom: value.valid_from,
    validUntil: value.valid_until,
    isAuto: value.is_auto,
    status: value.status,
    version: value.version,
  }
}

export const PROMOS_QUERY_KEY = ['promos'] as const

/** `quota_used / quota_total`, atau `null` kalau kuotanya tak terbatas. */
export function quotaRatio(promo: Promo): number | null {
  if (promo.quotaTotal === null || promo.quotaTotal === 0) return null
  return promo.quotaUsed / promo.quotaTotal
}
