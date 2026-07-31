/** Query PostgreSQL untuk pembacaan ketersediaan per-court dan per-tanggal. */
import {
  appSettings,
  courtOperatingHours,
  courts,
  type HolaDb,
  slotClaims,
  specialDates,
} from '@hola/db'
import { SETTINGS_KEY } from '@hola/shared'
import { and, eq, gt, inArray, or } from 'drizzle-orm'

export type AvailabilityCourt = Pick<
  typeof courts.$inferSelect,
  'code' | 'id' | 'slotDurationMinutes' | 'status'
>

export type AvailabilityHours = Pick<
  typeof courtOperatingHours.$inferSelect,
  'closesTime' | 'opensTime'
>

export type AvailabilityClaim = Pick<
  typeof slotClaims.$inferSelect,
  'claimType' | 'startsAt' | 'status'
>

function gridTime(value: string): string {
  return value.slice(0, 5)
}

export async function findAvailabilityCourt(
  db: HolaDb,
  courtId: string,
): Promise<AvailabilityCourt | null> {
  const [court] = await db
    .select({
      id: courts.id,
      code: courts.code,
      slotDurationMinutes: courts.slotDurationMinutes,
      status: courts.status,
    })
    .from(courts)
    .where(eq(courts.id, courtId))
    .limit(1)
  return court ?? null
}

export async function findAvailabilityHours(
  db: HolaDb,
  input: { courtId: string; dayOfWeek: number },
): Promise<AvailabilityHours | null> {
  const [hours] = await db
    .select({
      opensTime: courtOperatingHours.opensTime,
      closesTime: courtOperatingHours.closesTime,
    })
    .from(courtOperatingHours)
    .where(
      and(
        eq(courtOperatingHours.courtId, input.courtId),
        eq(courtOperatingHours.dayOfWeek, input.dayOfWeek),
      ),
    )
    .limit(1)
  return hours
    ? { opensTime: gridTime(hours.opensTime), closesTime: gridTime(hours.closesTime) }
    : null
}

export interface AvailabilitySpecialDate {
  isClosed: boolean
  dayTypeOverride: 'weekday' | 'weekend' | 'holiday' | 'specific_date' | null
}

export async function findAvailabilitySpecialDate(
  db: HolaDb,
  date: string,
): Promise<AvailabilitySpecialDate | null> {
  const [specialDate] = await db
    .select({ isClosed: specialDates.isClosed, dayTypeOverride: specialDates.dayTypeOverride })
    .from(specialDates)
    .where(eq(specialDates.date, date))
    .limit(1)
  return specialDate ?? null
}

/** Hold basi sengaja tidak dikembalikan: ia sudah tersedia meski J-01 terlambat. */
export async function findBlockingAvailabilityClaims(
  db: HolaDb,
  input: { courtId: string; slotDate: string; now: Date },
): Promise<AvailabilityClaim[]> {
  return db
    .select({
      startsAt: slotClaims.startsAt,
      claimType: slotClaims.claimType,
      status: slotClaims.status,
    })
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.courtId, input.courtId),
        eq(slotClaims.slotDate, input.slotDate),
        inArray(slotClaims.status, ['held', 'confirmed']),
        or(eq(slotClaims.status, 'confirmed'), gt(slotClaims.holdExpiresAt, input.now)),
      ),
    )
}

export async function findBookingHorizonDays(db: HolaDb): Promise<unknown> {
  const [setting] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, SETTINGS_KEY.BOOKING_HORIZON_DAYS))
    .limit(1)
  return setting?.value
}
