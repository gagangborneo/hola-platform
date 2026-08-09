/**
 * Klaim slot — sumber kebenaran tunggal "slot ini sudah dipakai siapa".
 *
 * `claim_type` sengaja tidak dipersempit ke `booking | maintenance`: Phase 2
 * (event) dan Phase 4 (match) menulis klaim ke tabel yang sama, dan kalender
 * back-office harus menampilkannya tanpa perubahan kode (P1-82).
 */
import { isRecord } from './api-response.ts'

export type ClaimTypeValue = 'booking' | 'event' | 'match' | 'maintenance'
export type ClaimStatusValue = 'held' | 'confirmed' | 'released'

export interface SlotClaim {
  bookingItemId: string | null
  claimType: ClaimTypeValue
  courtId: string
  courtMaintenanceId: string | null
  endsAt: string
  holdExpiresAt: string | null
  id: string
  slotDate: string
  startsAt: string
  status: ClaimStatusValue
}

interface SlotClaimResponse {
  booking_item_id: string | null
  claim_type: ClaimTypeValue
  court_id: string
  court_maintenance_id: string | null
  ends_at: string
  hold_expires_at: string | null
  id: string
  slot_date: string
  starts_at: string
  status: ClaimStatusValue
}

const CLAIM_TYPES: readonly string[] = ['booking', 'event', 'match', 'maintenance']
const CLAIM_STATUSES: readonly string[] = ['held', 'confirmed', 'released']

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

export function isSlotClaimResponse(value: unknown): value is SlotClaimResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.court_id === 'string' &&
    typeof value.starts_at === 'string' &&
    typeof value.ends_at === 'string' &&
    typeof value.slot_date === 'string' &&
    typeof value.claim_type === 'string' &&
    CLAIM_TYPES.includes(value.claim_type) &&
    typeof value.status === 'string' &&
    CLAIM_STATUSES.includes(value.status) &&
    isNullableString(value.hold_expires_at) &&
    isNullableString(value.booking_item_id) &&
    isNullableString(value.court_maintenance_id)
  )
}

export function normalizeSlotClaim(value: SlotClaimResponse): SlotClaim {
  return {
    id: value.id,
    courtId: value.court_id,
    startsAt: value.starts_at,
    endsAt: value.ends_at,
    slotDate: value.slot_date,
    claimType: value.claim_type,
    status: value.status,
    holdExpiresAt: value.hold_expires_at,
    bookingItemId: value.booking_item_id,
    courtMaintenanceId: value.court_maintenance_id,
  }
}
