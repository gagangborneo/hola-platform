import type { CourtRow } from './courts.repository.ts'

/** Bentuk publik/admin court memakai snake_case, bukan nama kolom Drizzle. */
export function serializeCourt(court: CourtRow) {
  return {
    id: court.id,
    venue_id: court.venueId,
    sport_id: court.sportId,
    code: court.code,
    name: court.name,
    description: court.description,
    surface: court.surface,
    is_indoor: court.isIndoor,
    slot_duration_minutes: court.slotDurationMinutes,
    min_slots_per_booking: court.minSlotsPerBooking,
    max_slots_per_booking: court.maxSlotsPerBooking,
    max_players: court.maxPlayers,
    status: court.status,
    version: court.version,
    sort_order: court.sortOrder,
    created_at: court.createdAt.toISOString(),
    updated_at: court.updatedAt.toISOString(),
  }
}
