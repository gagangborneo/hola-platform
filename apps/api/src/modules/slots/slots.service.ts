/** Orkestrasi satu-satunya untuk mengambil dan melepas `slot_claims`. */

import { uuidv7 } from '@hola/db'
import { CLAIM_STATUS, ERROR_CODE, type RedisKeys, type UserRole, witaDateYmd } from '@hola/shared'
import { err, UniqueViolationError } from '../../lib/errors.ts'
import { addSeconds, isPast, isSlotAligned, slotEndsAt, toWitaParts } from '../../lib/time.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import {
  findActiveConflicts,
  findClosedSpecialDates,
  findCourtOperatingHours,
  findSlotCourt,
  insertSlotClaims,
  lockCourtForShare,
  releaseClaims,
  releaseExpiredHolds,
  type SlotClaimRow,
} from './slots.repository.ts'

const HOLD_TTL_SECONDS = 600

/** Bagian Redis yang dipakai slots; sengaja kecil agar Redis-off mudah diuji. */
export interface SlotRedisClient {
  set(key: string, value: string, ...args: ['EX', number, 'NX']): Promise<'OK' | null>
  del(...keys: string[]): Promise<number>
}

export interface SlotActor {
  userId?: string | undefined
  role: UserRole
  ipAddress?: string | undefined
  userAgent?: string | undefined
  requestId?: string | undefined
}

export type SlotClaimOwner =
  | { kind: 'booking'; bookingItemIds: readonly string[] }
  | { kind: 'maintenance'; courtMaintenanceId: string }

export interface ClaimSlotsInput {
  courtId: string
  startsAtList: readonly Date[]
  claimType: 'booking' | 'maintenance'
  owner: SlotClaimOwner
  mode: 'hold' | 'direct'
  actor: SlotActor
  /** Default 600; hanya mode hold yang boleh memberikannya. */
  holdTtlSeconds?: number | undefined
}

export interface ReleaseSlotsInput {
  claimIds: readonly string[]
  reason: string
}

export interface SlotsServiceContext {
  db: CoreDependencies['db']
  redis: SlotRedisClient
  redisKeys: RedisKeys
  safeRedis: CoreDependencies['safeRedis']
  logger: CoreDependencies['logger']
  now: Date
  /** ID disuntikkan pada test; produksi memakai UUID v7 dengan waktu request. */
  createId?: ((at: Date) => string) | undefined
}

export interface ClaimedSlot {
  id: string
  courtId: string
  startsAt: Date
  endsAt: Date
  status: 'held' | 'confirmed' | 'released'
  holdExpiresAt: Date | null
}

function duplicateFreeSlots(startsAtList: readonly Date[]): Date[] {
  const sorted = [...startsAtList].sort((left, right) => left.getTime() - right.getTime())
  const seen = new Set<number>()
  const result: Date[] = []
  for (const startsAt of sorted) {
    if (Number.isNaN(startsAt.getTime())) throw err.validation({ field: 'starts_at' })
    if (seen.has(startsAt.getTime()))
      throw err.validation({ field: 'starts_at', reason: 'duplicate' })
    seen.add(startsAt.getTime())
    result.push(startsAt)
  }
  return result
}

function slotOwnerIsValid(input: ClaimSlotsInput, slotCount: number): boolean {
  if (input.claimType === 'booking') {
    return (
      input.owner.kind === 'booking' &&
      input.owner.bookingItemIds.length === slotCount &&
      new Set(input.owner.bookingItemIds).size === slotCount
    )
  }
  return input.owner.kind === 'maintenance'
}

function conflictDetails(rows: Awaited<ReturnType<typeof findActiveConflicts>>): unknown[] {
  return rows.map((row) => ({
    claim_id: row.id,
    court_id: row.courtId,
    starts_at: row.startsAt.toISOString(),
    claim_type: row.claimType,
  }))
}

function toClaimedSlot(row: SlotClaimRow): ClaimedSlot {
  return {
    id: row.id,
    courtId: row.courtId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    holdExpiresAt: row.holdExpiresAt,
  }
}

async function deleteHoldKeys(ctx: SlotsServiceContext, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return
  await ctx.safeRedis('slot_hold', () => ctx.redis.del(...keys), 0)
}

async function reserveHoldKeys(
  ctx: SlotsServiceContext,
  input: { courtId: string; startsAtList: readonly Date[]; ttlSeconds: number },
): Promise<string[]> {
  const reserved: string[] = []
  for (const startsAt of input.startsAtList) {
    const key = ctx.redisKeys.holdSlot(input.courtId, startsAt.toISOString())
    const result = await ctx.safeRedis<'OK' | null | undefined>(
      'slot_hold',
      () => ctx.redis.set(key, CLAIM_STATUS.HELD, 'EX', input.ttlSeconds, 'NX'),
      undefined,
    )
    // `undefined` adalah fallback Redis mati: lanjut ke PostgreSQL. `null`
    // berarti Redis sehat dan slot telah diamankan request lain.
    if (result === null) {
      await deleteHoldKeys(ctx, reserved)
      throw err.of(ERROR_CODE.SLOT_ALREADY_CLAIMED, {
        details: [{ court_id: input.courtId, starts_at: startsAt.toISOString() }],
      })
    }
    if (result === 'OK') reserved.push(key)
  }
  return reserved
}

async function invalidateAvailability(
  ctx: SlotsServiceContext,
  rows: readonly SlotClaimRow[],
): Promise<void> {
  const keys = [
    ...new Set(rows.map((row) => ctx.redisKeys.availability(row.courtId, row.slotDate))),
  ]
  if (keys.length === 0) return
  await ctx.safeRedis('availability_invalidation', () => ctx.redis.del(...keys), 0)
}

/**
 * Klaim sejumlah slot pada satu court. PostgreSQL C-1 adalah penjaga final;
 * Redis hanya mempercepat penolakan saat dua request datang bersamaan.
 */
export async function claimSlots(
  ctx: SlotsServiceContext,
  input: ClaimSlotsInput,
): Promise<ClaimedSlot[]> {
  const startsAtList = duplicateFreeSlots(input.startsAtList)
  if (startsAtList.length === 0 || !slotOwnerIsValid(input, startsAtList.length)) {
    throw err.validation({ field: 'owner' })
  }
  if (input.mode === 'hold' && input.claimType !== 'booking') {
    throw err.validation({ field: 'mode' })
  }
  if (input.mode === 'direct' && input.claimType === 'booking' && input.actor.role === 'customer') {
    throw err.forbidden('Customer harus memakai hold saat memulai pembayaran.')
  }

  const [court, operatingHours] = await Promise.all([
    findSlotCourt(ctx.db, input.courtId),
    findCourtOperatingHours(ctx.db, input.courtId),
  ])
  if (!court) throw err.notFound('Lapangan tidak ditemukan.')
  if (input.claimType === 'booking' && court.status !== 'active') {
    throw err.of(ERROR_CODE.COURT_NOT_BOOKABLE)
  }

  const closedDates = new Set(
    await findClosedSpecialDates(
      ctx.db,
      startsAtList.map((startsAt) => witaDateYmd(startsAt)),
    ),
  )
  for (const startsAt of startsAtList) {
    const { weekday } = toWitaParts(startsAt)
    const hours = operatingHours.find((candidate) => candidate.dayOfWeek === weekday)
    if (!hours) throw err.of(ERROR_CODE.SLOT_OUTSIDE_OPERATING_HOURS)
    if (!isSlotAligned(startsAt, { ...hours, slotDurationMinutes: court.slotDurationMinutes })) {
      throw err.of(ERROR_CODE.SLOT_NOT_ALIGNED)
    }
    if (input.claimType === 'booking' && isPast(startsAt, ctx.now)) {
      throw err.of(ERROR_CODE.SLOT_IN_PAST)
    }
    if (input.claimType === 'booking' && closedDates.has(witaDateYmd(startsAt))) {
      throw err.of(ERROR_CODE.VENUE_CLOSED)
    }
  }

  const ttlSeconds = input.holdTtlSeconds ?? HOLD_TTL_SECONDS
  if (input.mode === 'hold' && (!Number.isInteger(ttlSeconds) || ttlSeconds !== HOLD_TTL_SECONDS)) {
    throw err.validation({ field: 'hold_ttl_seconds' })
  }
  const reservedKeys =
    input.mode === 'hold'
      ? await reserveHoldKeys(ctx, { courtId: input.courtId, startsAtList, ttlSeconds })
      : []

  try {
    return await withTransaction(
      ctx.db,
      async ({ tx, afterCommit }) => {
        if (!(await lockCourtForShare(tx, input.courtId)))
          throw err.notFound('Lapangan tidak ditemukan.')
        await releaseExpiredHolds(tx, { courtId: input.courtId, startsAtList, now: ctx.now })
        const holdExpiresAt = input.mode === 'hold' ? addSeconds(ctx.now, ttlSeconds) : null
        const claims = await insertSlotClaims(
          tx,
          startsAtList.map((startsAt, index) => ({
            id: ctx.createId?.(new Date(ctx.now.getTime() + index)) ?? uuidv7(ctx.now.getTime()),
            courtId: input.courtId,
            startsAt,
            endsAt: slotEndsAt(startsAt, court.slotDurationMinutes),
            slotDate: witaDateYmd(startsAt),
            claimType: input.claimType,
            status: input.mode === 'hold' ? 'held' : 'confirmed',
            holdExpiresAt,
            bookingItemId:
              input.owner.kind === 'booking' ? (input.owner.bookingItemIds[index] ?? null) : null,
            courtMaintenanceId:
              input.owner.kind === 'maintenance' ? input.owner.courtMaintenanceId : null,
            createdByUserId: input.actor.userId ?? null,
          })),
        )
        afterCommit(() => invalidateAvailability(ctx, claims))
        return claims.map(toClaimedSlot)
      },
      { logger: ctx.logger },
    )
  } catch (error) {
    await deleteHoldKeys(ctx, reservedKeys)
    if (error instanceof UniqueViolationError && error.constraintName === 'uq_slot_claims_active') {
      const conflicts = await findActiveConflicts(ctx.db, { courtId: input.courtId, startsAtList })
      throw err.of(ERROR_CODE.SLOT_ALREADY_CLAIMED, { details: conflictDetails(conflicts) })
    }
    throw error
  }
}

/** Idempoten: claim yang sudah `released` tidak berubah untuk kedua kalinya. */
export async function releaseSlots(
  ctx: SlotsServiceContext,
  input: ReleaseSlotsInput,
): Promise<ClaimedSlot[]> {
  const claimIds = [...new Set(input.claimIds)]
  if (claimIds.length === 0 || input.reason.trim() === '')
    throw err.validation({ field: 'claim_ids' })
  return withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      const released = await releaseClaims(tx, { claimIds, reason: input.reason, now: ctx.now })
      afterCommit(async () => {
        await Promise.all([
          invalidateAvailability(ctx, released),
          deleteHoldKeys(
            ctx,
            released.map((claim) =>
              ctx.redisKeys.holdSlot(claim.courtId, claim.startsAt.toISOString()),
            ),
          ),
        ])
      })
      return released.map(toClaimedSlot)
    },
    { logger: ctx.logger },
  )
}
