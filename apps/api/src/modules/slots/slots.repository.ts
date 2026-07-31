/** Query PostgreSQL untuk mekanisme kepemilikan slot. */
import { courtOperatingHours, courts, type HolaDb, slotClaims, specialDates } from '@hola/db'
import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx

export type SlotCourt = Pick<typeof courts.$inferSelect, 'id' | 'slotDurationMinutes' | 'status'>

export type SlotOperatingHour = Pick<
  typeof courtOperatingHours.$inferSelect,
  'dayOfWeek' | 'opensTime' | 'closesTime'
>

export type SlotClaimRow = typeof slotClaims.$inferSelect

/** PostgreSQL `time` dibaca postgres-js sebagai `HH:mm:ss`; grid shared memakai `HH:mm`. */
function gridTime(value: string): string {
  return value.slice(0, 5)
}

export async function findSlotCourt(db: HolaDb, courtId: string): Promise<SlotCourt | null> {
  const [court] = await db
    .select({
      id: courts.id,
      slotDurationMinutes: courts.slotDurationMinutes,
      status: courts.status,
    })
    .from(courts)
    .where(eq(courts.id, courtId))
    .limit(1)
  return court ?? null
}

export async function findCourtOperatingHours(
  db: HolaDb,
  courtId: string,
): Promise<SlotOperatingHour[]> {
  const rows = await db
    .select({
      dayOfWeek: courtOperatingHours.dayOfWeek,
      opensTime: courtOperatingHours.opensTime,
      closesTime: courtOperatingHours.closesTime,
    })
    .from(courtOperatingHours)
    .where(eq(courtOperatingHours.courtId, courtId))
  return rows.map((row) => ({
    ...row,
    opensTime: gridTime(row.opensTime),
    closesTime: gridTime(row.closesTime),
  }))
}

export async function findClosedSpecialDates(
  db: HolaDb,
  dates: readonly string[],
): Promise<string[]> {
  if (dates.length === 0) return []
  const rows = await db
    .select({ date: specialDates.date })
    .from(specialDates)
    .where(and(inArray(specialDates.date, [...dates]), eq(specialDates.isClosed, true)))
  return rows.map((row) => row.date)
}

/** Lock konfigurasi court agar tidak berubah di tengah validasi/insertion claim. */
export async function lockCourtForShare(tx: Tx, courtId: string): Promise<boolean> {
  const rows = await tx.execute<{ id: string }>(
    sql`SELECT ${courts.id} AS id FROM ${courts} WHERE ${courts.id} = ${courtId} FOR SHARE`,
  )
  return rows[0] !== undefined
}

/** Lepas hold basi sebelum mencoba INSERT (BR-B-35). */
export async function releaseExpiredHolds(
  tx: Tx,
  input: { courtId: string; startsAtList: readonly Date[]; now: Date },
): Promise<void> {
  if (input.startsAtList.length === 0) return
  await tx
    .update(slotClaims)
    .set({
      status: 'released',
      holdExpiresAt: null,
      releasedAt: input.now,
      releaseReason: 'hold_expired',
    })
    .where(
      and(
        eq(slotClaims.courtId, input.courtId),
        inArray(slotClaims.startsAt, [...input.startsAtList]),
        eq(slotClaims.status, 'held'),
        lt(slotClaims.holdExpiresAt, input.now),
      ),
    )
}

export interface InsertSlotClaim {
  id: string
  courtId: string
  startsAt: Date
  endsAt: Date
  slotDate: string
  claimType: 'booking' | 'maintenance'
  status: 'held' | 'confirmed'
  holdExpiresAt: Date | null
  bookingItemId: string | null
  courtMaintenanceId: string | null
  createdByUserId: string | null
}

export async function insertSlotClaims(
  tx: Tx,
  rows: readonly InsertSlotClaim[],
): Promise<SlotClaimRow[]> {
  try {
    return await tx
      .insert(slotClaims)
      .values([...rows])
      .returning()
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function findActiveConflicts(
  db: DbExecutor,
  input: { courtId: string; startsAtList: readonly Date[] },
): Promise<
  Array<Pick<SlotClaimRow, 'courtId' | 'startsAt' | 'claimType' | 'id' | 'bookingItemId'>>
> {
  if (input.startsAtList.length === 0) return []
  return db
    .select({
      id: slotClaims.id,
      courtId: slotClaims.courtId,
      startsAt: slotClaims.startsAt,
      claimType: slotClaims.claimType,
      bookingItemId: slotClaims.bookingItemId,
    })
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.courtId, input.courtId),
        inArray(slotClaims.startsAt, [...input.startsAtList]),
        inArray(slotClaims.status, ['held', 'confirmed']),
      ),
    )
}

export async function releaseClaims(
  tx: Tx,
  input: { claimIds: readonly string[]; reason: string; now: Date },
): Promise<SlotClaimRow[]> {
  if (input.claimIds.length === 0) return []
  return tx
    .update(slotClaims)
    .set({
      status: 'released',
      holdExpiresAt: null,
      releasedAt: input.now,
      releaseReason: input.reason,
    })
    .where(
      and(
        inArray(slotClaims.id, [...input.claimIds]),
        inArray(slotClaims.status, ['held', 'confirmed']),
      ),
    )
    .returning()
}

/** Pelepasan owner maintenance tetap melalui modul slots, bukan courts. */
export async function releaseClaimsByMaintenance(
  tx: Tx,
  input: { courtMaintenanceId: string; reason: string; now: Date },
): Promise<SlotClaimRow[]> {
  return tx
    .update(slotClaims)
    .set({
      status: 'released',
      holdExpiresAt: null,
      releasedAt: input.now,
      releaseReason: input.reason,
    })
    .where(
      and(
        eq(slotClaims.courtMaintenanceId, input.courtMaintenanceId),
        inArray(slotClaims.status, ['held', 'confirmed']),
      ),
    )
    .returning()
}
