import type { PromoRedemptionRow, PromoRow } from './promos.repository.ts'

export function serializePromo(row: PromoRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    type: row.type,
    value_percent: row.valuePercent === null ? null : Number(row.valuePercent),
    value_amount: row.valueAmount,
    free_slot_count: row.freeSlotCount,
    max_discount_amount: row.maxDiscountAmount,
    min_transaction_amount: row.minTransactionAmount,
    min_slot_count: row.minSlotCount,
    applies_to: row.appliesTo,
    quota_total: row.quotaTotal,
    quota_used: row.quotaUsed,
    quota_per_user: row.quotaPerUser,
    valid_from: row.validFrom.toISOString(),
    valid_until: row.validUntil.toISOString(),
    is_auto: row.isAuto,
    is_stackable: row.isStackable,
    priority: row.priority,
    is_new_customer_only: row.isNewCustomerOnly,
    min_tier_code: row.minTierCode,
    status: row.status,
    version: row.version,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function serializePromoDetail(
  row: PromoRow,
  stats: {
    totalDiscountAmount: number
    reservedCount: number
    appliedCount: number
    releasedCount: number
  },
  includeCost: boolean,
) {
  return {
    ...serializePromo(row),
    usage: {
      reserved_count: stats.reservedCount,
      applied_count: stats.appliedCount,
      released_count: stats.releasedCount,
      ...(includeCost ? { total_discount_amount: stats.totalDiscountAmount } : {}),
    },
  }
}

export function serializePromoRedemption(row: PromoRedemptionRow) {
  return {
    id: row.id,
    promo_id: row.promoId,
    user_id: row.userId,
    booking_id: row.bookingId,
    discount_amount: row.discountAmount,
    status: row.status,
    reserved_until: row.reservedUntil?.toISOString() ?? null,
    applied_at: row.appliedAt?.toISOString() ?? null,
    released_at: row.releasedAt?.toISOString() ?? null,
    release_reason: row.releaseReason,
    created_at: row.createdAt.toISOString(),
  }
}
