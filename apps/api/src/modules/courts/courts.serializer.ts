import type { CourtDetail, CourtRow } from './courts.repository.ts'
import type { SportRow } from './sports.repository.ts'

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

/** Detail publik: court + jam operasional + foto. `bucket` tidak dibocorkan ke klien. */
export function serializeCourtDetail(detail: CourtDetail): ReturnType<typeof serializeCourt> & {
  operating_hours: Array<{ day_of_week: number; opens_time: string; closes_time: string }>
  photos: Array<{ media_id: string; position: number; object_key: string }>
} {
  return {
    ...serializeCourt(detail.court),
    operating_hours: detail.hours.map((hour) => ({
      day_of_week: hour.dayOfWeek,
      opens_time: hour.opensTime,
      closes_time: hour.closesTime,
    })),
    photos: detail.photos.map((photo) => ({
      media_id: photo.mediaId,
      position: photo.position,
      object_key: photo.objectKey,
    })),
  }
}

/** Bentuk publik olahraga; `is_active` tidak dibocorkan karena hanya yang aktif yang tampil. */
export function serializeSport(sport: SportRow) {
  return {
    id: sport.id,
    code: sport.code,
    name: sport.name,
    icon_media_id: sport.iconMediaId,
    sort_order: sport.sortOrder,
  }
}
