import {
  courtOperatingHours,
  courtPhotos,
  courts,
  type HolaDb,
  mediaFiles,
  slotClaims,
} from '@hola/db'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'
import type { CreateCourtInput, PatchCourtInput } from './courts.schema.ts'

type DbExecutor = HolaDb | Tx
export type CourtRow = typeof courts.$inferSelect

export async function findCourt(db: DbExecutor, id: string): Promise<CourtRow | null> {
  const [court] = await db.select().from(courts).where(eq(courts.id, id)).limit(1)
  return court ?? null
}

export async function createCourt(db: Tx, input: CreateCourtInput): Promise<CourtRow> {
  try {
    const [court] = await db
      .insert(courts)
      .values({
        venueId: input.venue_id,
        sportId: input.sport_id,
        code: input.code,
        name: input.name,
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.surface === undefined ? {} : { surface: input.surface }),
        isIndoor: input.is_indoor,
        slotDurationMinutes: input.slot_duration_minutes,
        minSlotsPerBooking: input.min_slots_per_booking,
        maxSlotsPerBooking: input.max_slots_per_booking,
        ...(input.max_players === undefined ? {} : { maxPlayers: input.max_players }),
        status: input.status,
        sortOrder: input.sort_order,
      })
      .returning()
    if (!court) throw new Error('Court insert tidak mengembalikan baris')
    return court
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function hasFutureActiveClaims(
  db: DbExecutor,
  courtId: string,
  today: Date,
): Promise<boolean> {
  const [row] = await db
    .select({ id: slotClaims.id })
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.courtId, courtId),
        gte(slotClaims.startsAt, today),
        inArray(slotClaims.status, ['held', 'confirmed']),
      ),
    )
    .limit(1)
  return row !== undefined
}

export async function patchCourt(
  db: Tx,
  input: { id: string; version: number; patch: PatchCourtInput },
): Promise<CourtRow | null> {
  const [court] = await db
    .update(courts)
    .set({
      ...(input.patch.code === undefined ? {} : { code: input.patch.code }),
      ...(input.patch.name === undefined ? {} : { name: input.patch.name }),
      ...(input.patch.description === undefined ? {} : { description: input.patch.description }),
      ...(input.patch.surface === undefined ? {} : { surface: input.patch.surface }),
      ...(input.patch.is_indoor === undefined ? {} : { isIndoor: input.patch.is_indoor }),
      ...(input.patch.slot_duration_minutes === undefined
        ? {}
        : { slotDurationMinutes: input.patch.slot_duration_minutes }),
      ...(input.patch.min_slots_per_booking === undefined
        ? {}
        : { minSlotsPerBooking: input.patch.min_slots_per_booking }),
      ...(input.patch.max_slots_per_booking === undefined
        ? {}
        : { maxSlotsPerBooking: input.patch.max_slots_per_booking }),
      ...(input.patch.max_players === undefined ? {} : { maxPlayers: input.patch.max_players }),
      ...(input.patch.status === undefined ? {} : { status: input.patch.status }),
      ...(input.patch.sort_order === undefined ? {} : { sortOrder: input.patch.sort_order }),
      version: sql`${courts.version} + 1`,
    })
    .where(and(eq(courts.id, input.id), eq(courts.version, input.version)))
    .returning()
  return court ?? null
}

export async function replaceCourtOperatingHours(
  tx: Tx,
  input: {
    courtId: string
    hours: readonly { day_of_week: number; opens_time: string; closes_time: string }[]
  },
): Promise<void> {
  await tx.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, input.courtId))
  await tx.insert(courtOperatingHours).values(
    input.hours.map((hour) => ({
      courtId: input.courtId,
      dayOfWeek: hour.day_of_week,
      opensTime: hour.opens_time,
      closesTime: hour.closes_time,
    })),
  )
}

export async function findReadyCourtPhotos(
  db: DbExecutor,
  mediaIds: readonly string[],
): Promise<Array<Pick<typeof mediaFiles.$inferSelect, 'id' | 'kind' | 'status'>>> {
  if (mediaIds.length === 0) return []
  return db
    .select({ id: mediaFiles.id, kind: mediaFiles.kind, status: mediaFiles.status })
    .from(mediaFiles)
    .where(inArray(mediaFiles.id, [...mediaIds]))
}

export async function replaceCourtPhotos(
  tx: Tx,
  input: { courtId: string; mediaIds: readonly string[] },
): Promise<void> {
  await tx.delete(courtPhotos).where(eq(courtPhotos.courtId, input.courtId))
  if (input.mediaIds.length === 0) return
  await tx.insert(courtPhotos).values(
    input.mediaIds.map((mediaId, position) => ({
      courtId: input.courtId,
      mediaId,
      position,
    })),
  )
}

export interface PublicCourtFilter {
  sportId?: string | undefined
  status?: 'active' | 'inactive' | 'maintenance' | undefined
  isIndoor?: boolean | undefined
}

export interface CourtOperatingHourRow {
  dayOfWeek: number
  opensTime: string
  closesTime: string
}

export interface CourtPhotoRow {
  mediaId: string
  position: number
  bucket: string
  objectKey: string
}

export interface CourtDetail {
  court: CourtRow
  hours: CourtOperatingHourRow[]
  photos: CourtPhotoRow[]
}

export async function listPublicCourts(
  db: DbExecutor,
  filter: PublicCourtFilter,
): Promise<CourtRow[]> {
  const conditions = [
    filter.sportId === undefined ? undefined : eq(courts.sportId, filter.sportId),
    filter.status === undefined ? undefined : eq(courts.status, filter.status),
    filter.isIndoor === undefined ? undefined : eq(courts.isIndoor, filter.isIndoor),
  ].filter((condition) => condition !== undefined)

  const query = db.select().from(courts)
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query
  return filtered.orderBy(asc(courts.sortOrder), asc(courts.code))
}

/**
 * Detail satu court. Foto dibatasi media berstatus `ready` supaya halaman publik
 * tidak pernah menautkan objek yang uploadnya belum selesai.
 */
export async function findCourtDetail(
  db: DbExecutor,
  courtId: string,
): Promise<CourtDetail | null> {
  const court = await findCourt(db, courtId)
  if (!court) return null

  const hours = await db
    .select({
      dayOfWeek: courtOperatingHours.dayOfWeek,
      opensTime: courtOperatingHours.opensTime,
      closesTime: courtOperatingHours.closesTime,
    })
    .from(courtOperatingHours)
    .where(eq(courtOperatingHours.courtId, courtId))
    .orderBy(asc(courtOperatingHours.dayOfWeek))

  const photos = await db
    .select({
      mediaId: courtPhotos.mediaId,
      position: courtPhotos.position,
      bucket: mediaFiles.bucket,
      objectKey: mediaFiles.objectKey,
    })
    .from(courtPhotos)
    .innerJoin(mediaFiles, eq(mediaFiles.id, courtPhotos.mediaId))
    .where(and(eq(courtPhotos.courtId, courtId), eq(mediaFiles.status, 'ready')))
    .orderBy(asc(courtPhotos.position))

  return { court, hours, photos }
}
