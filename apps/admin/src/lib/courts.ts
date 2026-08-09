/**
 * Daftar lapangan dipakai hampir setiap layar back-office (dashboard, kalender,
 * booking manual, aturan harga, maintenance). Guard dan normalisasinya tinggal
 * di sini supaya bentuk `Court` tidak didefinisikan ulang tujuh kali dan
 * berbeda-beda.
 */
import { type UseQueryResult, useQueries, useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client.ts'
import { isRecord, parseData, parseDataArray } from './api-response.ts'

export type CourtStatusValue = 'active' | 'maintenance' | 'inactive'

export interface Court {
  code: string
  id: string
  isIndoor: boolean
  maxSlotsPerBooking: number
  minSlotsPerBooking: number
  name: string
  slotDurationMinutes: number
  sortOrder: number
  sportId: string
  status: CourtStatusValue
  venueId: string
  version: number
}

export interface OperatingHour {
  closesTime: string
  dayOfWeek: number
  opensTime: string
}

export interface CourtPhoto {
  mediaId: string
  objectKey: string
  position: number
}

export interface CourtDetail extends Court {
  description: string | null
  maxPlayers: number | null
  operatingHours: OperatingHour[]
  photos: CourtPhoto[]
  surface: string | null
}

export interface Sport {
  code: string
  id: string
  name: string
}

export interface CourtResponse {
  code: string
  id: string
  is_indoor: boolean
  max_slots_per_booking: number
  min_slots_per_booking: number
  name: string
  slot_duration_minutes: number
  sort_order: number
  sport_id: string
  status: CourtStatusValue
  venue_id: string
  version: number
}

function isCourtStatus(value: unknown): value is CourtStatusValue {
  return value === 'active' || value === 'maintenance' || value === 'inactive'
}

export function isCourtResponse(value: unknown): value is CourtResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.venue_id === 'string' &&
    typeof value.sport_id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    typeof value.is_indoor === 'boolean' &&
    typeof value.slot_duration_minutes === 'number' &&
    typeof value.min_slots_per_booking === 'number' &&
    typeof value.max_slots_per_booking === 'number' &&
    typeof value.sort_order === 'number' &&
    typeof value.version === 'number' &&
    isCourtStatus(value.status)
  )
}

export function normalizeCourt(value: CourtResponse): Court {
  return {
    id: value.id,
    venueId: value.venue_id,
    sportId: value.sport_id,
    code: value.code,
    name: value.name,
    isIndoor: value.is_indoor,
    slotDurationMinutes: value.slot_duration_minutes,
    minSlotsPerBooking: value.min_slots_per_booking,
    maxSlotsPerBooking: value.max_slots_per_booking,
    status: value.status,
    sortOrder: value.sort_order,
    version: value.version,
  }
}

interface CourtDetailResponse extends CourtResponse {
  description: string | null
  max_players: number | null
  operating_hours: Array<{ closes_time: string; day_of_week: number; opens_time: string }>
  photos: Array<{ media_id: string; object_key: string; position: number }>
  surface: string | null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isCourtDetailResponse(value: unknown): value is CourtDetailResponse {
  if (!isRecord(value) || !isCourtResponse(value)) return false
  return (
    isNullableString(value.description) &&
    isNullableString(value.surface) &&
    Array.isArray(value.operating_hours) &&
    Array.isArray(value.photos)
  )
}

function normalizeCourtDetail(value: CourtDetailResponse): CourtDetail {
  return {
    ...normalizeCourt(value),
    description: value.description,
    surface: value.surface,
    maxPlayers: value.max_players,
    operatingHours: value.operating_hours
      .map((hour) => ({
        dayOfWeek: hour.day_of_week,
        opensTime: hour.opens_time,
        closesTime: hour.closes_time,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    photos: value.photos
      .map((photo) => ({
        mediaId: photo.media_id,
        objectKey: photo.object_key,
        position: photo.position,
      }))
      .sort((a, b) => a.position - b.position),
  }
}

interface SportResponse {
  code: string
  id: string
  name: string
}

function isSportResponse(value: unknown): value is SportResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string'
  )
}

export const COURTS_QUERY_KEY = ['courts'] as const

/**
 * Seluruh lapangan termasuk yang nonaktif — operator perlu melihat dan
 * mengaktifkan kembali lapangan yang sedang tidak dijual.
 */
export function useCourts(): UseQueryResult<Court[]> {
  return useQuery({
    queryKey: COURTS_QUERY_KEY,
    queryFn: async (): Promise<Court[]> => {
      const response = await apiClient.api.v1.courts.$get({ query: {} })
      const body: unknown = await response.json()
      return parseDataArray(body, isCourtResponse)
        .map(normalizeCourt)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    },
    staleTime: 5 * 60_000,
  })
}

export function useCourtDetail(courtId: string | null): UseQueryResult<CourtDetail> {
  return useQuery({
    queryKey: ['court-detail', courtId],
    enabled: courtId !== null,
    queryFn: async (): Promise<CourtDetail> => {
      if (!courtId) throw new Error('Lapangan belum dipilih.')
      return fetchCourtDetail(courtId)
    },
  })
}

export async function fetchCourtDetail(courtId: string): Promise<CourtDetail> {
  const response = await apiClient.api.v1.courts[':id'].$get({ param: { id: courtId } })
  const body: unknown = await response.json()
  return normalizeCourtDetail(parseData(body, isCourtDetailResponse))
}

export interface CourtDetailsResult {
  byId: Map<string, CourtDetail>
  error: unknown
  isLoading: boolean
}

/**
 * Jam operasional beberapa lapangan sekaligus — dibutuhkan kalender untuk
 * menggambar slot yang masih kosong, bukan hanya slot yang sudah diklaim.
 * Cache dibagi dengan `useCourtDetail` lewat kunci query yang sama.
 */
export function useCourtDetails(courtIds: readonly string[]): CourtDetailsResult {
  const results = useQueries({
    queries: courtIds.map((courtId) => ({
      queryKey: ['court-detail', courtId],
      queryFn: (): Promise<CourtDetail> => fetchCourtDetail(courtId),
      staleTime: 5 * 60_000,
    })),
  })
  const byId = new Map<string, CourtDetail>()
  for (const result of results) {
    if (result.data) byId.set(result.data.id, result.data)
  }
  return {
    byId,
    error: results.find((result) => result.error)?.error ?? null,
    isLoading: results.some((result) => result.isLoading),
  }
}

export function useSports(): UseQueryResult<Sport[]> {
  return useQuery({
    queryKey: ['sports'],
    queryFn: async (): Promise<Sport[]> => {
      const response = await apiClient.api.v1.sports.$get()
      const body: unknown = await response.json()
      return parseDataArray(body, isSportResponse).map((sport) => ({
        id: sport.id,
        code: sport.code,
        name: sport.name,
      }))
    },
    staleTime: 30 * 60_000,
  })
}

/** Peta `id → court` untuk menerjemahkan `court_id` mentah di tabel dan kalender. */
export function courtsById(courts: readonly Court[]): Map<string, Court> {
  return new Map(courts.map((court) => [court.id, court]))
}
