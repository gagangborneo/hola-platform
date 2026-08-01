/** Business rule promo, termasuk eligibility dan lifecycle kuota. */
import {
  ERROR_CODE,
  type Quote,
  type QuoteInput,
  type QuoteWarning,
  WARNING_CODE,
} from '@hola/shared'
import { AppError, err, UniqueViolationError } from '../../lib/errors.ts'
import { type TransactionScope, withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { computeQuote } from '../pricing/pricing.service.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import { computeDiscount, type DiscountPromo } from './promo-discount.ts'
import {
  countActiveUserRedemptions,
  countPromoRedemptions,
  countPromos,
  createPromo,
  findCustomerTierCode,
  findPromo,
  findPromoByCode,
  findReservedBookingRedemption,
  getPromoUsageStats,
  hasCompletedBooking,
  incrementPromoQuota,
  insertPromoRedemption,
  listAvailablePromos,
  listLimitedPromoQuotas,
  listPromoRedemptions,
  listPromos,
  lockPromoUser,
  markRedemptionApplied,
  type PromoRedemptionRow,
  type PromoRow,
  patchPromo,
  releaseExpiredRedemptions,
  releaseRedemption,
  setPromoStatus,
} from './promos.repository.ts'
import {
  type CreatePromoInput,
  createPromoSchema,
  type PatchPromoInput,
  type PromosQuery,
  type RedemptionsQuery,
  type ValidatePromoInput,
} from './promos.schema.ts'

export type PromoServiceContext = Pick<
  CoreDependencies,
  'db' | 'logger' | 'redis' | 'redisKeys' | 'safeRedis'
> & {
  now: Date
  actor: Viewer
  requestId?: string | undefined
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

const TIER_RANK: Readonly<Record<string, number>> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
}

const REASON_MESSAGE: Readonly<Record<string, string>> = {
  [ERROR_CODE.PROMO_NOT_FOUND]: 'Kode promo tidak ditemukan.',
  [ERROR_CODE.PROMO_INACTIVE]: 'Promo sedang tidak aktif.',
  [ERROR_CODE.PROMO_NOT_STARTED]: 'Promo belum dimulai.',
  [ERROR_CODE.PROMO_EXPIRED]: 'Promo sudah berakhir.',
  [ERROR_CODE.PROMO_NOT_APPLICABLE]: 'Promo tidak berlaku untuk transaksi ini.',
  [ERROR_CODE.PROMO_NEW_CUSTOMER_ONLY]: 'Promo hanya berlaku untuk customer baru.',
  [ERROR_CODE.PROMO_MIN_TRANSACTION_NOT_MET]: 'Nilai transaksi belum memenuhi minimum promo.',
  [ERROR_CODE.PROMO_USER_QUOTA_EXHAUSTED]: 'Kuota promo untuk pengguna ini sudah habis.',
  [ERROR_CODE.PROMO_QUOTA_EXHAUSTED]: 'Kuota promo sudah habis.',
}

type PromoReasonCode =
  | typeof ERROR_CODE.PROMO_NOT_FOUND
  | typeof ERROR_CODE.PROMO_INACTIVE
  | typeof ERROR_CODE.PROMO_NOT_STARTED
  | typeof ERROR_CODE.PROMO_EXPIRED
  | typeof ERROR_CODE.PROMO_NOT_APPLICABLE
  | typeof ERROR_CODE.PROMO_NEW_CUSTOMER_ONLY
  | typeof ERROR_CODE.PROMO_MIN_TRANSACTION_NOT_MET
  | typeof ERROR_CODE.PROMO_USER_QUOTA_EXHAUSTED
  | typeof ERROR_CODE.PROMO_QUOTA_EXHAUSTED

export type PromoEvaluationResult = {
  promo: Quote['promo']
  warnings: QuoteWarning[]
}

function warning(code: PromoReasonCode): PromoEvaluationResult {
  return {
    promo: null,
    warnings: [{ code, message: REASON_MESSAGE[code] ?? 'Promo tidak valid.' }],
  }
}

function discountPromo(row: PromoRow): DiscountPromo {
  if (row.type === 'percent') {
    return {
      type: 'percent',
      valuePercent: Number(row.valuePercent),
      maxDiscountAmount: row.maxDiscountAmount,
    }
  }
  if (row.type === 'fixed') return { type: 'fixed', valueAmount: row.valueAmount ?? 0 }
  return { type: 'free_slot', freeSlotCount: row.freeSlotCount ?? 0 }
}

function appliesTo(row: PromoRow, kind: QuoteInput['kind']): boolean {
  if (row.appliesTo === 'all') return true
  if (kind === 'booking') return row.appliesTo === 'booking'
  if (kind === 'event_registration') return row.appliesTo === 'event'
  return row.appliesTo === 'tournament'
}

/** V-1…V-8, V-15, V-16. Auto promo dan V-9…V-14 ditunda Phase 4 (P1-42). */
export async function evaluatePromo(
  ctx: Pick<PromoServiceContext, 'db' | 'now'>,
  input: {
    quoteInput: QuoteInput
    subtotalAmount: number
    addonAmount: number
    lines: Quote['lines']
  },
): Promise<PromoEvaluationResult> {
  const code = input.quoteInput.promo_code?.trim().toUpperCase()
  if (!code) return { promo: null, warnings: [] }
  const promo = await findPromoByCode(ctx.db, code)
  if (!promo) return warning(ERROR_CODE.PROMO_NOT_FOUND)
  if (promo.status !== 'active') return warning(ERROR_CODE.PROMO_INACTIVE)
  if (ctx.now < promo.validFrom) return warning(ERROR_CODE.PROMO_NOT_STARTED)
  if (ctx.now > promo.validUntil) return warning(ERROR_CODE.PROMO_EXPIRED)
  if (!appliesTo(promo, input.quoteInput.kind)) return warning(ERROR_CODE.PROMO_NOT_APPLICABLE)

  const userId = input.quoteInput.actor.user_id
  if (!userId && (promo.isNewCustomerOnly || promo.quotaPerUser !== null)) {
    return warning(ERROR_CODE.PROMO_NOT_APPLICABLE)
  }
  if (promo.isNewCustomerOnly && userId && (await hasCompletedBooking(ctx.db, userId))) {
    return warning(ERROR_CODE.PROMO_NEW_CUSTOMER_ONLY)
  }
  if (promo.minTierCode) {
    if (!userId) return warning(ERROR_CODE.PROMO_NOT_APPLICABLE)
    const customerTier = await findCustomerTierCode(ctx.db, userId)
    if (
      (TIER_RANK[customerTier] ?? -1) < (TIER_RANK[promo.minTierCode] ?? Number.MAX_SAFE_INTEGER)
    ) {
      return warning(ERROR_CODE.PROMO_NOT_APPLICABLE)
    }
  }

  const baseAmount = input.subtotalAmount + input.addonAmount
  if (baseAmount < promo.minTransactionAmount) {
    return warning(ERROR_CODE.PROMO_MIN_TRANSACTION_NOT_MET)
  }
  if (
    promo.quotaPerUser !== null &&
    userId &&
    (await countActiveUserRedemptions(ctx.db, promo.id, userId)) >= promo.quotaPerUser
  ) {
    return warning(ERROR_CODE.PROMO_USER_QUOTA_EXHAUSTED)
  }
  if (promo.quotaTotal !== null && promo.quotaUsed >= promo.quotaTotal) {
    return warning(ERROR_CODE.PROMO_QUOTA_EXHAUSTED)
  }

  const discountAmount = computeDiscount(discountPromo(promo), baseAmount, input.lines)
  const result: PromoEvaluationResult = {
    promo: {
      promo_id: promo.id,
      code: promo.code ?? promo.name,
      name: promo.name,
      type: promo.type,
      discount_amount: discountAmount,
    },
    warnings: [],
  }
  const unclamped =
    promo.type === 'fixed'
      ? (promo.valueAmount ?? 0)
      : promo.type === 'percent'
        ? Math.min(
            baseAmount * (Number(promo.valuePercent) / 100),
            promo.maxDiscountAmount ?? Number.POSITIVE_INFINITY,
          )
        : discountAmount
  if (unclamped > baseAmount) {
    result.warnings.push({
      code: WARNING_CODE.DISCOUNT_CLAMPED,
      message: 'Diskon disesuaikan agar tidak melebihi nilai transaksi.',
    })
  }
  return result
}

function throwEvaluationFailure(result: PromoEvaluationResult): never {
  const code = result.warnings[0]?.code
  if (!code || !(code in REASON_MESSAGE)) throw err.internal()
  throw err.of(code as PromoReasonCode, { message: REASON_MESSAGE[code] })
}

export async function validatePromo(
  ctx: PromoServiceContext,
  input: ValidatePromoInput,
): Promise<{ isValid: true; discountAmount: number; promo: NonNullable<Quote['promo']> }> {
  const quoteInput: QuoteInput = {
    kind: 'booking',
    at: ctx.now.toISOString(),
    actor: { role: ctx.actor.role, user_id: ctx.actor.userId },
    booking: { items: input.items, addons: input.addons },
    promo_code: input.code,
    reserve_promo: false,
  }
  const quote = await computeQuote(
    {
      db: ctx.db,
      evaluatePromo: (details) => evaluatePromo(ctx, { ...details, quoteInput }),
    },
    quoteInput,
  )
  if (!quote.promo) throwEvaluationFailure({ promo: null, warnings: quote.warnings })
  return { isValid: true, discountAmount: quote.discount_amount, promo: quote.promo }
}

export async function reservePromo(
  ctx: PromoServiceContext,
  input: {
    promo: NonNullable<Quote['promo']>
    bookingId: string
    userId: string | null
    reservedUntil: Date
  },
  scope: TransactionScope,
): Promise<PromoRedemptionRow> {
  const before = await findPromo(scope.tx, input.promo.promo_id)
  if (!before) throw err.of(ERROR_CODE.PROMO_NOT_FOUND)
  if (before.quotaTotal !== null) {
    const cached = await ctx.safeRedis<string | null>(
      'promo_quota_precheck',
      () => ctx.redis.get(ctx.redisKeys.promoQuota(before.id)),
      null,
    )
    if (cached !== null && Number(cached) >= before.quotaTotal) {
      throw err.of(ERROR_CODE.PROMO_QUOTA_EXHAUSTED)
    }
  }

  const incremented = await incrementPromoQuota(scope.tx, { promoId: before.id, now: ctx.now })
  if (!incremented) {
    const current = await findPromo(scope.tx, before.id)
    if (!current) throw err.of(ERROR_CODE.PROMO_NOT_FOUND)
    if (current.status !== 'active') throw err.of(ERROR_CODE.PROMO_INACTIVE)
    if (ctx.now < current.validFrom) throw err.of(ERROR_CODE.PROMO_NOT_STARTED)
    if (ctx.now > current.validUntil) throw err.of(ERROR_CODE.PROMO_EXPIRED)
    throw err.of(ERROR_CODE.PROMO_QUOTA_EXHAUSTED)
  }

  const redemption = await insertPromoRedemption(scope.tx, {
    promoId: incremented.id,
    userId: input.userId,
    bookingId: input.bookingId,
    discountAmount: input.promo.discount_amount,
    reservedUntil: input.reservedUntil,
    now: ctx.now,
  })
  if (input.userId && incremented.quotaPerUser !== null) {
    await lockPromoUser(scope.tx, incremented.id, input.userId)
    const used = await countActiveUserRedemptions(scope.tx, incremented.id, input.userId)
    if (used > incremented.quotaPerUser) throw err.of(ERROR_CODE.PROMO_USER_QUOTA_EXHAUSTED)
  }
  if (incremented.quotaTotal !== null) {
    scope.afterCommit(async () => {
      await ctx.safeRedis(
        'promo_quota_increment',
        () =>
          ctx.redis
            .multi()
            .incr(ctx.redisKeys.promoQuota(incremented.id))
            .expire(ctx.redisKeys.promoQuota(incremented.id), 120)
            .exec(),
        null,
      )
    })
  }
  return redemption
}

export async function markPromoApplied(
  ctx: Pick<PromoServiceContext, 'now'>,
  redemptionId: string,
  scope: TransactionScope,
): Promise<PromoRedemptionRow | null> {
  return markRedemptionApplied(scope.tx, redemptionId, ctx.now)
}

export async function releasePromo(
  ctx: PromoServiceContext,
  redemptionId: string,
  reason: string,
  scope: TransactionScope,
): Promise<PromoRedemptionRow | null> {
  const released = await releaseRedemption(scope.tx, { redemptionId, reason, now: ctx.now })
  if (released) {
    scope.afterCommit(async () => {
      await ctx.safeRedis(
        'promo_quota_decrement',
        () =>
          ctx.redis
            .multi()
            .decr(ctx.redisKeys.promoQuota(released.promoId))
            .expire(ctx.redisKeys.promoQuota(released.promoId), 120)
            .exec(),
        null,
      )
    })
  }
  return released
}

export async function releaseBookingPromo(
  ctx: PromoServiceContext,
  bookingId: string,
  reason: string,
  scope: TransactionScope,
): Promise<PromoRedemptionRow | null> {
  const redemption = await findReservedBookingRedemption(scope.tx, bookingId)
  if (!redemption) return null
  return releasePromo(ctx, redemption.id, reason, scope)
}

/** J-09: idempoten karena hanya baris `reserved` yang berubah dan didecrement. */
export async function releaseExpiredPromoReservations(
  ctx: Pick<PromoServiceContext, 'db' | 'logger' | 'redis' | 'redisKeys' | 'safeRedis' | 'now'>,
): Promise<number> {
  return withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      const changedPromos = await releaseExpiredRedemptions(tx, ctx.now)
      const limitedPromos = await listLimitedPromoQuotas(tx)
      afterCommit(async () => {
        for (const promo of limitedPromos) {
          await ctx.safeRedis(
            'promo_quota_refresh',
            () =>
              ctx.redis.set(ctx.redisKeys.promoQuota(promo.id), String(promo.quotaUsed), 'EX', 120),
            null,
          )
        }
      })
      return changedPromos.length
    },
    { logger: ctx.logger },
  )
}

function audit(ctx: PromoServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

function normalizeCandidate(before: PromoRow, patch: PatchPromoInput): CreatePromoInput {
  const candidate = {
    code: before.code,
    name: patch.name ?? before.name,
    description: patch.description === undefined ? before.description : patch.description,
    type: patch.type ?? before.type,
    value_percent:
      patch.value_percent === undefined
        ? before.valuePercent === null
          ? null
          : Number(before.valuePercent)
        : patch.value_percent,
    value_amount: patch.value_amount === undefined ? before.valueAmount : patch.value_amount,
    free_slot_count:
      patch.free_slot_count === undefined ? before.freeSlotCount : patch.free_slot_count,
    max_discount_amount:
      patch.max_discount_amount === undefined
        ? before.maxDiscountAmount
        : patch.max_discount_amount,
    min_transaction_amount: patch.min_transaction_amount ?? before.minTransactionAmount,
    min_slot_count: patch.min_slot_count === undefined ? before.minSlotCount : patch.min_slot_count,
    applies_to: patch.applies_to ?? before.appliesTo,
    quota_total: patch.quota_total === undefined ? before.quotaTotal : patch.quota_total,
    quota_per_user: patch.quota_per_user === undefined ? before.quotaPerUser : patch.quota_per_user,
    valid_from: patch.valid_from ?? before.validFrom.toISOString(),
    valid_until: patch.valid_until ?? before.validUntil.toISOString(),
    is_auto: patch.is_auto ?? before.isAuto,
    is_stackable: patch.is_stackable ?? before.isStackable,
    priority: patch.priority ?? before.priority,
    is_new_customer_only: patch.is_new_customer_only ?? before.isNewCustomerOnly,
    min_tier_code: patch.min_tier_code === undefined ? before.minTierCode : patch.min_tier_code,
    status: patch.status ?? before.status,
  }
  const parsed = createPromoSchema.safeParse(candidate)
  if (!parsed.success) throw err.validation(parsed.error.issues)
  return parsed.data
}

export async function createAdminPromo(
  ctx: PromoServiceContext,
  input: CreatePromoInput,
): Promise<PromoRow> {
  const parsed = createPromoSchema.safeParse(input)
  if (!parsed.success) throw err.validation(parsed.error.issues)
  try {
    return await withTransaction(
      ctx.db,
      async ({ tx }) => {
        const row = await createPromo(tx, parsed.data, ctx.actor.userId, ctx.now)
        await writeAuditLog(tx, {
          ...audit(ctx),
          action: 'promo.create',
          entityType: 'promo',
          entityId: row.id,
          before: undefined,
          after: row,
        })
        return row
      },
      { logger: ctx.logger },
    )
  } catch (error) {
    if (error instanceof UniqueViolationError && error.constraintName === 'uq_promos_code') {
      throw err.conflict('Kode promo sudah digunakan.')
    }
    throw error
  }
}

const USED_MUTABLE_FIELDS = new Set([
  'name',
  'description',
  'quota_total',
  'valid_until',
  'status',
  'priority',
])

export async function patchAdminPromo(
  ctx: PromoServiceContext,
  input: { id: string; patch: PatchPromoInput; version?: number | undefined },
): Promise<PromoRow> {
  const before = await findPromo(ctx.db, input.id)
  if (!before) throw err.notFound('Promo tidak ditemukan.')
  normalizeCandidate(before, input.patch)
  if (before.quotaUsed > 0) {
    const locked = Object.keys(input.patch).filter((field) => !USED_MUTABLE_FIELDS.has(field))
    if (locked.length > 0) {
      throw err.conflict('Field inti promo yang sudah pernah dipakai tidak dapat diubah.', {
        fields: locked,
      })
    }
  }
  if (input.version === undefined) {
    ctx.logger.warn({ promo_id: input.id }, 'PATCH promo tanpa If-Match')
  }
  return withTransaction(
    ctx.db,
    async ({ tx }) => {
      const row = await patchPromo(tx, { ...input, now: ctx.now })
      if (!row) {
        const current = await findPromo(tx, input.id)
        if (!current) throw err.notFound('Promo tidak ditemukan.')
        throw err.of(ERROR_CODE.PRECONDITION_FAILED, {
          details: { current_version: current.version },
        })
      }
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'promo.update',
        entityType: 'promo',
        entityId: row.id,
        before,
        after: row,
      })
      return row
    },
    { logger: ctx.logger },
  )
}

export async function changeAdminPromoStatus(
  ctx: PromoServiceContext,
  id: string,
  status: 'active' | 'paused' | 'archived',
): Promise<PromoRow> {
  const before = await findPromo(ctx.db, id)
  if (!before) throw err.notFound('Promo tidak ditemukan.')
  if (status === 'active' && (ctx.now < before.validFrom || ctx.now > before.validUntil)) {
    throw err.validation(
      { field: 'validity' },
      'Promo di luar masa berlaku tidak dapat diaktifkan.',
    )
  }
  return withTransaction(
    ctx.db,
    async ({ tx }) => {
      const row = await setPromoStatus(tx, { id, status, now: ctx.now })
      if (!row) throw err.notFound('Promo tidak ditemukan.')
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: `promo.${status}`,
        entityType: 'promo',
        entityId: row.id,
        before,
        after: row,
      })
      return row
    },
    { logger: ctx.logger },
  )
}

export async function listAdminPromos(ctx: PromoServiceContext, query: PromosQuery) {
  const [rows, totalCount] = await Promise.all([
    listPromos(ctx.db, query),
    countPromos(ctx.db, query),
  ])
  return { rows, totalCount }
}

export async function getPromo(
  ctx: PromoServiceContext,
  id: string,
): Promise<{ promo: PromoRow; stats: Awaited<ReturnType<typeof getPromoUsageStats>> }> {
  const row = await findPromo(ctx.db, id)
  if (!row) throw err.notFound('Promo tidak ditemukan.')
  const stats = await getPromoUsageStats(ctx.db, id)
  return { promo: row, stats }
}

export async function getAvailablePromos(ctx: PromoServiceContext): Promise<PromoRow[]> {
  return listAvailablePromos(ctx.db, ctx.now)
}

export async function getPromoRedemptions(
  ctx: PromoServiceContext,
  id: string,
  query: RedemptionsQuery,
) {
  if (!(await findPromo(ctx.db, id))) throw err.notFound('Promo tidak ditemukan.')
  const [rows, totalCount] = await Promise.all([
    listPromoRedemptions(ctx.db, id, query),
    countPromoRedemptions(ctx.db, id),
  ])
  return { rows, totalCount }
}

export function isPromoAppError(error: unknown): error is AppError {
  return error instanceof AppError && error.code.startsWith('PROMO_')
}
