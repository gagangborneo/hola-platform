import { courts, type HolaDb, slotClaims } from '@hola/db'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type { CreateCourtInput, PatchCourtInput } from './courts.schema.ts'

type DbExecutor = HolaDb | Tx
export type CourtRow = typeof courts.$inferSelect

export async function findCourt(db: DbExecutor, id: string): Promise<CourtRow | null> {
  const [court] = await db.select().from(courts).where(eq(courts.id, id)).limit(1)
  return court ?? null
}

export async function createCourt(db: Tx, input: CreateCourtInput): Promise<CourtRow> {
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
  input: { id: string; version: number | undefined; patch: PatchCourtInput },
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
    .where(
      and(
        eq(courts.id, input.id),
        ...(input.version === undefined ? [] : [eq(courts.version, input.version)]),
      ),
    )
    .returning()
  return court ?? null
}
