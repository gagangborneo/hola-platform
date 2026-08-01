/** Query PostgreSQL modul promo. Seluruh keputusan bisnis tetap di service. */
import { bookings, customerProfiles, type HolaDb, promoRedemptions, promos } from '@hola/db'
import { and, asc, count, desc, eq, gte, ilike, lt, lte, or, type SQL, sql } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'
import type {
  CreatePromoInput,
  PatchPromoInput,
  PromosQuery,
  RedemptionsQuery,
} from './promos.schema.ts'

type DbExecutor = HolaDb | Tx
export type PromoRow = typeof promos.$inferSelect
export type PromoRedemptionRow = typeof promoRedemptions.$inferSelect

export async function findPromoByCode(db: DbExecutor, code: string): Promise<PromoRow | null> {
  const [row] = await db
    .select()
    .from(promos)
    .where(eq(promos.code, code.trim().toUpperCase()))
    .limit(1)
  return row ?? null
}

export async function findPromo(db: DbExecutor, id: string): Promise<PromoRow | null> {
  const [row] = await db.select().from(promos).where(eq(promos.id, id)).limit(1)
  return row ?? null
}

export async function findCustomerTierCode(db: DbExecutor, userId: string): Promise<string> {
  const [row] = await db
    .select({ tierCode: customerProfiles.tierCode })
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .limit(1)
  return row?.tierCode ?? 'bronze'
}

export async function hasCompletedBooking(db: DbExecutor, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.customerUserId, userId), eq(bookings.status, 'completed')))
    .limit(1)
  return row !== undefined
}

export async function countActiveUserRedemptions(
  db: DbExecutor,
  promoId: string,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(promoRedemptions)
    .where(
      and(
        eq(promoRedemptions.promoId, promoId),
        eq(promoRedemptions.userId, userId),
        sql`${promoRedemptions.status} IN ('reserved', 'applied')`,
      ),
    )
  return row?.value ?? 0
}

export async function findReservedBookingRedemption(
  db: DbExecutor,
  bookingId: string,
): Promise<PromoRedemptionRow | null> {
  const [row] = await db
    .select()
    .from(promoRedemptions)
    .where(and(eq(promoRedemptions.bookingId, bookingId), eq(promoRedemptions.status, 'reserved')))
    .limit(1)
  return row ?? null
}

export async function incrementPromoQuota(
  tx: Tx,
  input: { promoId: string; now: Date },
): Promise<PromoRow | null> {
  const [row] = await tx
    .update(promos)
    .set({ quotaUsed: sql`${promos.quotaUsed} + 1`, updatedAt: input.now })
    .where(
      and(
        eq(promos.id, input.promoId),
        eq(promos.status, 'active'),
        lte(promos.validFrom, input.now),
        gte(promos.validUntil, input.now),
        sql`(${promos.quotaTotal} IS NULL OR ${promos.quotaUsed} < ${promos.quotaTotal})`,
      ),
    )
    .returning()
  return row ?? null
}

export async function insertPromoRedemption(
  tx: Tx,
  input: {
    promoId: string
    userId: string | null
    bookingId: string
    discountAmount: number
    reservedUntil: Date
    now: Date
  },
): Promise<PromoRedemptionRow> {
  const [row] = await tx
    .insert(promoRedemptions)
    .values({
      promoId: input.promoId,
      userId: input.userId,
      bookingId: input.bookingId,
      discountAmount: input.discountAmount,
      status: 'reserved',
      reservedUntil: input.reservedUntil,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning()
  if (!row) throw new Error('promo_redemptions gagal dibuat')
  return row
}

export async function lockPromoUser(tx: Tx, promoId: string, userId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${promoId}:${userId}`}, 0))`,
  )
}

export async function markRedemptionApplied(
  tx: Tx,
  redemptionId: string,
  now: Date,
): Promise<PromoRedemptionRow | null> {
  const [row] = await tx
    .update(promoRedemptions)
    .set({ status: 'applied', appliedAt: now, reservedUntil: null, updatedAt: now })
    .where(and(eq(promoRedemptions.id, redemptionId), eq(promoRedemptions.status, 'reserved')))
    .returning()
  return row ?? null
}

export async function releaseRedemption(
  tx: Tx,
  input: { redemptionId: string; reason: string; now: Date },
): Promise<PromoRedemptionRow | null> {
  const [released] = await tx
    .update(promoRedemptions)
    .set({
      status: 'released',
      releasedAt: input.now,
      reservedUntil: null,
      releaseReason: input.reason,
      updatedAt: input.now,
    })
    .where(
      and(eq(promoRedemptions.id, input.redemptionId), eq(promoRedemptions.status, 'reserved')),
    )
    .returning()
  if (!released) return null
  await tx
    .update(promos)
    .set({ quotaUsed: sql`GREATEST(0, ${promos.quotaUsed} - 1)`, updatedAt: input.now })
    .where(eq(promos.id, released.promoId))
  return released
}

export async function releaseExpiredRedemptions(tx: Tx, now: Date): Promise<PromoRow[]> {
  const released = await tx
    .update(promoRedemptions)
    .set({
      status: 'released',
      releasedAt: now,
      reservedUntil: null,
      releaseReason: 'reservation_expired',
      updatedAt: now,
    })
    .where(and(eq(promoRedemptions.status, 'reserved'), lt(promoRedemptions.reservedUntil, now)))
    .returning({ promoId: promoRedemptions.promoId })

  const counts = new Map<string, number>()
  for (const row of released) counts.set(row.promoId, (counts.get(row.promoId) ?? 0) + 1)
  const updated: PromoRow[] = []
  for (const [promoId, releasedCount] of counts) {
    const [promo] = await tx
      .update(promos)
      .set({
        quotaUsed: sql`GREATEST(0, ${promos.quotaUsed} - ${releasedCount})`,
        updatedAt: now,
      })
      .where(eq(promos.id, promoId))
      .returning()
    if (promo) updated.push(promo)
  }
  return updated
}

function listFilters(query: PromosQuery): SQL[] {
  const search = query.q
    ? or(ilike(promos.code, `%${query.q}%`), ilike(promos.name, `%${query.q}%`))
    : undefined
  return [
    ...(query.status ? [eq(promos.status, query.status)] : []),
    ...(query.is_auto === undefined ? [] : [eq(promos.isAuto, query.is_auto)]),
    ...(query.applies_to ? [eq(promos.appliesTo, query.applies_to)] : []),
    ...(search ? [search] : []),
  ]
}

export async function listPromos(db: HolaDb, query: PromosQuery): Promise<PromoRow[]> {
  return db
    .select()
    .from(promos)
    .where(and(...listFilters(query)))
    .orderBy(desc(promos.createdAt), desc(promos.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countPromos(db: HolaDb, query: PromosQuery): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(promos)
    .where(and(...listFilters(query)))
  return row?.value ?? 0
}

export async function listAvailablePromos(db: HolaDb, now: Date): Promise<PromoRow[]> {
  return db
    .select()
    .from(promos)
    .where(
      and(
        eq(promos.isAuto, true),
        eq(promos.status, 'active'),
        lte(promos.validFrom, now),
        gte(promos.validUntil, now),
        sql`(${promos.quotaTotal} IS NULL OR ${promos.quotaUsed} < ${promos.quotaTotal})`,
      ),
    )
    .orderBy(desc(promos.priority), asc(promos.validUntil), asc(promos.createdAt), asc(promos.id))
    .limit(100)
}

export async function listLimitedPromoQuotas(db: DbExecutor): Promise<PromoRow[]> {
  return db
    .select()
    .from(promos)
    .where(sql`${promos.quotaTotal} IS NOT NULL`)
    .orderBy(promos.id)
    .limit(10_000)
}

function createValues(input: CreatePromoInput, actorUserId: string, now: Date) {
  return {
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    valuePercent: input.type === 'percent' ? String(input.value_percent) : null,
    valueAmount: input.type === 'fixed' ? input.value_amount : null,
    freeSlotCount: input.type === 'free_slot' ? input.free_slot_count : null,
    maxDiscountAmount: input.max_discount_amount ?? null,
    minTransactionAmount: input.min_transaction_amount,
    minSlotCount: input.min_slot_count ?? null,
    appliesTo: input.applies_to,
    quotaTotal: input.quota_total ?? null,
    quotaPerUser: input.quota_per_user ?? null,
    validFrom: new Date(input.valid_from),
    validUntil: new Date(input.valid_until),
    isAuto: input.is_auto,
    isStackable: input.is_stackable,
    priority: input.priority,
    isNewCustomerOnly: input.is_new_customer_only,
    minTierCode: input.min_tier_code ?? null,
    status: input.status,
    createdByUserId: actorUserId,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createPromo(
  tx: Tx,
  input: CreatePromoInput,
  actorUserId: string,
  now: Date,
): Promise<PromoRow> {
  try {
    const [row] = await tx
      .insert(promos)
      .values(createValues(input, actorUserId, now))
      .returning()
    if (!row) throw new Error('promos gagal dibuat')
    return row
  } catch (error) {
    throw translateDbError(error)
  }
}

function patchValues(input: PatchPromoInput, now: Date) {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.value_percent === undefined
      ? {}
      : { valuePercent: input.value_percent === null ? null : String(input.value_percent) }),
    ...(input.value_amount === undefined ? {} : { valueAmount: input.value_amount }),
    ...(input.free_slot_count === undefined ? {} : { freeSlotCount: input.free_slot_count }),
    ...(input.max_discount_amount === undefined
      ? {}
      : { maxDiscountAmount: input.max_discount_amount }),
    ...(input.min_transaction_amount === undefined
      ? {}
      : { minTransactionAmount: input.min_transaction_amount }),
    ...(input.min_slot_count === undefined ? {} : { minSlotCount: input.min_slot_count }),
    ...(input.applies_to === undefined ? {} : { appliesTo: input.applies_to }),
    ...(input.quota_total === undefined ? {} : { quotaTotal: input.quota_total }),
    ...(input.quota_per_user === undefined ? {} : { quotaPerUser: input.quota_per_user }),
    ...(input.valid_from === undefined ? {} : { validFrom: new Date(input.valid_from) }),
    ...(input.valid_until === undefined ? {} : { validUntil: new Date(input.valid_until) }),
    ...(input.is_auto === undefined ? {} : { isAuto: input.is_auto }),
    ...(input.is_stackable === undefined ? {} : { isStackable: input.is_stackable }),
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    ...(input.is_new_customer_only === undefined
      ? {}
      : { isNewCustomerOnly: input.is_new_customer_only }),
    ...(input.min_tier_code === undefined ? {} : { minTierCode: input.min_tier_code }),
    ...(input.status === undefined ? {} : { status: input.status }),
    updatedAt: now,
    version: sql`${promos.version} + 1`,
  }
}

export async function patchPromo(
  tx: Tx,
  input: { id: string; patch: PatchPromoInput; version?: number | undefined; now: Date },
): Promise<PromoRow | null> {
  const [row] = await tx
    .update(promos)
    .set(patchValues(input.patch, input.now))
    .where(
      and(
        eq(promos.id, input.id),
        ...(input.version === undefined ? [] : [eq(promos.version, input.version)]),
      ),
    )
    .returning()
  return row ?? null
}

export async function setPromoStatus(
  tx: Tx,
  input: { id: string; status: PromoRow['status']; now: Date },
): Promise<PromoRow | null> {
  const [row] = await tx
    .update(promos)
    .set({ status: input.status, updatedAt: input.now, version: sql`${promos.version} + 1` })
    .where(eq(promos.id, input.id))
    .returning()
  return row ?? null
}

export async function listPromoRedemptions(
  db: HolaDb,
  promoId: string,
  query: RedemptionsQuery,
): Promise<PromoRedemptionRow[]> {
  return db
    .select()
    .from(promoRedemptions)
    .where(eq(promoRedemptions.promoId, promoId))
    .orderBy(desc(promoRedemptions.createdAt), desc(promoRedemptions.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countPromoRedemptions(db: HolaDb, promoId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(promoRedemptions)
    .where(eq(promoRedemptions.promoId, promoId))
  return row?.value ?? 0
}

export type PromoUsageStats = {
  totalDiscountAmount: number
  reservedCount: number
  appliedCount: number
  releasedCount: number
}

export async function getPromoUsageStats(db: HolaDb, promoId: string): Promise<PromoUsageStats> {
  const [row] = await db
    .select({
      totalDiscountAmount:
        sql<number>`COALESCE(SUM(${promoRedemptions.discountAmount}) FILTER (WHERE ${promoRedemptions.status} = 'applied'), 0)`.mapWith(
          Number,
        ),
      reservedCount: sql<number>`COUNT(*) FILTER (WHERE ${promoRedemptions.status} = 'reserved')::int`,
      appliedCount: sql<number>`COUNT(*) FILTER (WHERE ${promoRedemptions.status} = 'applied')::int`,
      releasedCount: sql<number>`COUNT(*) FILTER (WHERE ${promoRedemptions.status} = 'released')::int`,
    })
    .from(promoRedemptions)
    .where(eq(promoRedemptions.promoId, promoId))
  return {
    totalDiscountAmount: row?.totalDiscountAmount ?? 0,
    reservedCount: row?.reservedCount ?? 0,
    appliedCount: row?.appliedCount ?? 0,
    releasedCount: row?.releasedCount ?? 0,
  }
}
