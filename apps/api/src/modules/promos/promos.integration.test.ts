import { bookings, promoRedemptions, promos, users } from '@hola/db'
import { createRedisKeys, ERROR_CODE } from '@hola/shared'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import { redis, safeRedis } from '../../config/redis.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { PromoRow } from './promos.repository.ts'
import {
  createAdminPromo,
  evaluatePromo,
  markPromoApplied,
  type PromoServiceContext,
  patchAdminPromo,
  releaseExpiredPromoReservations,
  releasePromo,
  reservePromo,
} from './promos.service.ts'

const ids = {
  admin: '01930100-0000-7000-8000-000000000101',
  customer: '01930100-0000-7000-8000-000000000102',
  promo: '01930100-0000-7000-8000-000000000103',
  booking1: '01930100-0000-7000-8000-000000000104',
  booking2: '01930100-0000-7000-8000-000000000105',
} as const

const now = new Date('2026-08-01T00:00:00.000Z')
const redisKeys = createRedisKeys('local')

function context(redisEnabled = true, at = now): PromoServiceContext {
  return {
    db,
    redis,
    redisKeys,
    safeRedis: redisEnabled
      ? safeRedis
      : async <T>(_feature: string, _op: () => Promise<T>, fallback: T): Promise<T> => fallback,
    logger,
    now: at,
    actor: {
      userId: ids.customer,
      role: 'customer',
      cafeTenantId: undefined,
      employeeId: undefined,
    },
  }
}

function adminContext(): PromoServiceContext {
  return {
    ...context(),
    actor: {
      userId: ids.admin,
      role: 'admin',
      cafeTenantId: undefined,
      employeeId: undefined,
    },
  }
}

async function insertPromo(overrides: Partial<typeof promos.$inferInsert> = {}): Promise<PromoRow> {
  const [row] = await db
    .insert(promos)
    .values({
      id: ids.promo,
      code: 'HLA20',
      name: 'Hola 20',
      type: 'percent',
      valuePercent: '20.00',
      maxDiscountAmount: 50_000,
      appliesTo: 'booking',
      quotaTotal: 10,
      quotaPerUser: null,
      validFrom: new Date('2026-07-01T00:00:00.000Z'),
      validUntil: new Date('2026-09-01T00:00:00.000Z'),
      status: 'active',
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('fixture promo gagal dibuat')
  return row
}

async function insertBooking(id: string, code: string): Promise<void> {
  await db.insert(bookings).values({
    id,
    bookingCode: code,
    customerUserId: ids.customer,
    channel: 'web',
    status: 'pending_payment',
    bookingDate: '2026-08-02',
    slotCount: 1,
    quoteSnapshot: {},
    subtotalAmount: 100_000,
    totalAmount: 100_000,
    holdExpiresAt: new Date('2026-08-01T00:10:00.000Z'),
  })
}

async function cleanFixtures(): Promise<void> {
  await redis.del(redisKeys.promoQuota(ids.promo))
  await db.delete(promoRedemptions).where(eq(promoRedemptions.promoId, ids.promo))
  await db.delete(bookings).where(inArray(bookings.id, [ids.booking1, ids.booking2]))
  await db.delete(promos).where(eq(promos.id, ids.promo))
  await db.delete(promos).where(eq(promos.createdByUserId, ids.admin))
  await db.delete(users).where(inArray(users.id, [ids.customer, ids.admin]))
}

async function waitForRedis(): Promise<void> {
  if (redis.status === 'ready') return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Redis test tidak siap')), 3_000)
    redis.once('ready', () => {
      clearTimeout(timeout)
      resolve()
    })
    redis.once('error', reject)
  })
}

beforeAll(waitForRedis)
beforeEach(async () => {
  await cleanFixtures()
  await db.insert(users).values([
    {
      id: ids.customer,
      role: 'customer',
      email: 'promo.customer@example.test',
      fullName: 'Promo Customer',
    },
    { id: ids.admin, role: 'admin', email: 'promo.admin@example.test', fullName: 'Promo Admin' },
  ])
  await insertBooking(ids.booking1, 'PRM-BOOK-1')
  await insertBooking(ids.booking2, 'PRM-BOOK-2')
})
afterAll(cleanFixtures)

const baseEvaluation = {
  quoteInput: {
    kind: 'booking' as const,
    at: now.toISOString(),
    actor: { role: 'customer' as const, user_id: ids.customer },
    booking: { items: [], addons: [] },
    promo_code: ' hla20 ',
  },
  subtotalAmount: 200_000,
  addonAmount: 0,
  lines: [],
}

describe('promo.evaluate eligibility', () => {
  it('V-1/BR-PR-10: kode dinormalisasi dan reason PROMO_NOT_FOUND spesifik', async () => {
    const result = await evaluatePromo(context(), baseEvaluation)
    expect(result.warnings[0]?.code).toBe(ERROR_CODE.PROMO_NOT_FOUND)
  })

  it.each([
    ['V-2', { status: 'paused' as const }, ERROR_CODE.PROMO_INACTIVE],
    ['V-3', { validFrom: new Date('2026-08-02T00:00:00Z') }, ERROR_CODE.PROMO_NOT_STARTED],
    ['V-4', { validUntil: new Date('2026-07-31T00:00:00Z') }, ERROR_CODE.PROMO_EXPIRED],
    ['V-5', { appliesTo: 'event' as const }, ERROR_CODE.PROMO_NOT_APPLICABLE],
    ['V-8', { minTransactionAmount: 300_000 }, ERROR_CODE.PROMO_MIN_TRANSACTION_NOT_MET],
    ['V-16', { quotaTotal: 1, quotaUsed: 1 }, ERROR_CODE.PROMO_QUOTA_EXHAUSTED],
  ])('%s: mengembalikan reason_code yang sesuai', async (_rule, overrides, expected) => {
    await insertPromo(overrides)
    const result = await evaluatePromo(context(), baseEvaluation)
    expect(result.warnings[0]?.code).toBe(expected)
  })

  it('V-6: customer dengan booking completed ditolak untuk promo customer baru', async () => {
    await insertPromo({ isNewCustomerOnly: true })
    await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, ids.booking1))
    const result = await evaluatePromo(context(), baseEvaluation)
    expect(result.warnings[0]?.code).toBe(ERROR_CODE.PROMO_NEW_CUSTOMER_ONLY)
  })

  it('V-7: tier awal mengikuti urutan bronze, silver, gold, platinum', async () => {
    await insertPromo({ minTierCode: 'silver' })
    const result = await evaluatePromo(context(), baseEvaluation)
    expect(result.warnings[0]?.code).toBe(ERROR_CODE.PROMO_NOT_APPLICABLE)
  })

  it('V-15: kuota user menghitung reserved dan applied', async () => {
    await insertPromo({ quotaPerUser: 1 })
    await db.insert(promoRedemptions).values({
      promoId: ids.promo,
      userId: ids.customer,
      bookingId: ids.booking1,
      discountAmount: 20_000,
      status: 'applied',
    })
    const result = await evaluatePromo(context(), baseEvaluation)
    expect(result.warnings[0]?.code).toBe(ERROR_CODE.PROMO_USER_QUOTA_EXHAUSTED)
  })

  it('BR-PR-50: evaluasi valid tidak mereservasi kuota', async () => {
    await insertPromo()
    const result = await evaluatePromo(context(), baseEvaluation)
    const [row] = await db.select().from(promos).where(eq(promos.id, ids.promo))
    expect(result.promo?.discount_amount).toBe(40_000)
    expect(row?.quotaUsed).toBe(0)
    expect(
      await db.select().from(promoRedemptions).where(eq(promoRedemptions.promoId, ids.promo)),
    ).toHaveLength(0)
  })
})

describe('admin promo lifecycle', () => {
  const createInput = {
    code: 'ADM20',
    name: 'Admin Promo',
    type: 'percent' as const,
    value_percent: 20,
    max_discount_amount: 50_000,
    min_transaction_amount: 0,
    applies_to: 'booking' as const,
    valid_from: '2026-07-01T00:00:00.000Z',
    valid_until: '2026-09-01T00:00:00.000Z',
    is_auto: false,
    is_stackable: false,
    priority: 0,
    is_new_customer_only: false,
    status: 'draft' as const,
  }

  it('BR-PR-10/BR-PR-66: create menyimpan kode uppercase dan resource memakai version', async () => {
    const created = await createAdminPromo(adminContext(), { ...createInput, code: 'adm20' })
    expect(created).toMatchObject({ code: 'ADM20', version: 1, status: 'draft' })
  })

  it('optimistic locking: If-Match salah menghasilkan PRECONDITION_FAILED', async () => {
    const created = await createAdminPromo(adminContext(), createInput)
    await expect(
      patchAdminPromo(adminContext(), {
        id: created.id,
        version: 99,
        patch: { name: 'Nama Baru' },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODE.PRECONDITION_FAILED })
  })

  it('BR-PR-67: field inti terkunci setelah quota_used > 0', async () => {
    const created = await createAdminPromo(adminContext(), createInput)
    await db.update(promos).set({ quotaUsed: 1 }).where(eq(promos.id, created.id))
    await expect(
      patchAdminPromo(adminContext(), {
        id: created.id,
        version: created.version,
        patch: { type: 'fixed', value_percent: null, value_amount: 10_000 },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODE.CONFLICT })
  })
})

async function raceQuota(redisEnabled: boolean): Promise<void> {
  const promo = await insertPromo({ quotaTotal: 1 })
  if (redisEnabled) await redis.set(redisKeys.promoQuota(promo.id), '0', 'EX', 120)
  const reserve = (bookingId: string) =>
    withTransaction(db, (scope) =>
      reservePromo(
        context(redisEnabled),
        {
          promo: {
            promo_id: promo.id,
            code: promo.code ?? promo.name,
            name: promo.name,
            type: promo.type,
            discount_amount: 20_000,
          },
          bookingId,
          userId: ids.customer,
          reservedUntil: new Date('2026-08-01T00:10:00Z'),
        },
        scope,
      ),
    )
  const results = await Promise.allSettled([reserve(ids.booking1), reserve(ids.booking2)])
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  const [row] = await db.select().from(promos).where(eq(promos.id, promo.id))
  expect(row?.quotaUsed).toBe(1)
}

describe('promo.reserve race-safe', () => {
  it('T-PR-01: quota_total=1 memberi tepat satu pemenang dengan Redis', async () => {
    await raceQuota(true)
  })

  it('T-PR-02/DoD-1-08: hasil tetap tepat tanpa Redis', async () => {
    await raceQuota(false)
  })

  it('T-PR-03/BR-PR-33: quota_per_user=1 aman untuk dua transaksi bersamaan', async () => {
    const promo = await insertPromo({ quotaTotal: null, quotaPerUser: 1 })
    const reserve = (bookingId: string) =>
      withTransaction(db, (scope) =>
        reservePromo(
          context(false),
          {
            promo: {
              promo_id: promo.id,
              code: promo.code ?? promo.name,
              name: promo.name,
              type: promo.type,
              discount_amount: 20_000,
            },
            bookingId,
            userId: ids.customer,
            reservedUntil: new Date('2026-08-01T00:10:00Z'),
          },
          scope,
        ),
      )
    const results = await Promise.allSettled([reserve(ids.booking1), reserve(ids.booking2)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const [row] = await db.select().from(promos).where(eq(promos.id, promo.id))
    expect(row?.quotaUsed).toBe(1)
  })
})

describe('promo redemption lifecycle', () => {
  async function reserveOne(reservedUntil = new Date('2026-08-01T00:10:00Z')) {
    const promo = await insertPromo({ quotaTotal: 2 })
    const redemption = await withTransaction(db, (scope) =>
      reservePromo(
        context(false),
        {
          promo: {
            promo_id: promo.id,
            code: promo.code ?? promo.name,
            name: promo.name,
            type: promo.type,
            discount_amount: 20_000,
          },
          bookingId: ids.booking1,
          userId: ids.customer,
          reservedUntil,
        },
        scope,
      ),
    )
    return { promo, redemption }
  }

  it('T-PR-04/T-PR-05/BR-TT-14/J-09: dua run expiry melepas sekali dan refresh Redis', async () => {
    await reserveOne(new Date('2026-07-31T23:59:00Z'))
    expect(await releaseExpiredPromoReservations(context(true))).toBe(1)
    await redis.set(redisKeys.promoQuota(ids.promo), '99', 'EX', 120)
    expect(await releaseExpiredPromoReservations(context(true))).toBe(0)
    const [promo] = await db.select().from(promos).where(eq(promos.id, ids.promo))
    const [redemption] = await db
      .select()
      .from(promoRedemptions)
      .where(eq(promoRedemptions.promoId, ids.promo))
    expect(promo?.quotaUsed).toBe(0)
    expect(redemption?.status).toBe('released')
    expect(await redis.get(redisKeys.promoQuota(ids.promo))).toBe('0')
  })

  it('T-PR-06: pembatalan sebelum bayar mengembalikan kuota', async () => {
    const { redemption } = await reserveOne()
    await withTransaction(db, (scope) =>
      releasePromo(context(true), redemption.id, 'booking_cancelled', scope),
    )
    const [promo] = await db.select().from(promos).where(eq(promos.id, ids.promo))
    expect(promo?.quotaUsed).toBe(0)
  })

  it('T-PR-07: pembayaran menandai applied tanpa mengubah quota_used', async () => {
    const { redemption } = await reserveOne()
    await withTransaction(db, (scope) => markPromoApplied(context(), redemption.id, scope))
    const [promo] = await db.select().from(promos).where(eq(promos.id, ids.promo))
    const [applied] = await db
      .select()
      .from(promoRedemptions)
      .where(eq(promoRedemptions.id, redemption.id))
    expect(promo?.quotaUsed).toBe(1)
    expect(applied?.status).toBe('applied')
  })

  it('reserve mengembalikan AppError kuota yang spesifik', async () => {
    const promo = await insertPromo({ quotaTotal: 1, quotaUsed: 1 })
    await expect(
      withTransaction(db, (scope) =>
        reservePromo(
          context(false),
          {
            promo: {
              promo_id: promo.id,
              code: promo.code ?? promo.name,
              name: promo.name,
              type: promo.type,
              discount_amount: 20_000,
            },
            bookingId: ids.booking1,
            userId: ids.customer,
            reservedUntil: new Date('2026-08-01T00:10:00Z'),
          },
          scope,
        ),
      ),
    ).rejects.toMatchObject({ code: ERROR_CODE.PROMO_QUOTA_EXHAUSTED })
  })
})
