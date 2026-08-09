/**
 * Bentuk booking yang dipakai bersama oleh dashboard hari ini, tabel booking,
 * halaman detail, dan riwayat customer. Satu guard, satu normalisasi.
 */
import type { Quote, QuoteLine } from '@hola/shared'
import { isRecord } from './api-response.ts'

export type BookingStatusValue =
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show'

export type BookingChannelValue = 'web' | 'mobile' | 'admin' | 'walk_in'

export interface Booking {
  bookingCode: string
  bookingDate: string
  channel: BookingChannelValue
  checkedInAt: string | null
  createdAt: string
  customerNote: string | null
  customerUserId: string | null
  guestName: string | null
  guestPhone: string | null
  holdExpiresAt: string | null
  id: string
  internalNote: string | null
  slotCount: number
  status: BookingStatusValue
  totalAmount: number
  updatedAt: string
}

export interface BookingItem {
  courtId: string
  endsAt: string
  id: string
  lineTotalAmount: number
  rateClass: string
  startsAt: string
  unitPriceAmount: number
}

export interface BookingDetail extends Booking {
  isCancellable: boolean
  items: BookingItem[]
  policyApplied: string | null
  quote: Quote | null
  refundEstimateAmount: number
}

interface BookingResponse {
  booking_code: string
  booking_date: string
  channel: BookingChannelValue
  checked_in_at: string | null
  created_at: string
  customer_note: string | null
  customer_user_id: string | null
  guest_name: string | null
  guest_phone: string | null
  hold_expires_at: string | null
  id: string
  internal_note: string | null
  slot_count: number
  status: BookingStatusValue
  total_amount: number
  updated_at: string
}

const BOOKING_STATUSES: readonly string[] = [
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled',
  'expired',
  'no_show',
]

const BOOKING_CHANNELS: readonly string[] = ['web', 'mobile', 'admin', 'walk_in']

export function isBookingStatus(value: unknown): value is BookingStatusValue {
  return typeof value === 'string' && BOOKING_STATUSES.includes(value)
}

export function isBookingChannel(value: unknown): value is BookingChannelValue {
  return typeof value === 'string' && BOOKING_CHANNELS.includes(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

export function isBookingResponse(value: unknown): value is BookingResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.booking_code === 'string' &&
    typeof value.booking_date === 'string' &&
    typeof value.slot_count === 'number' &&
    typeof value.total_amount === 'number' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    isBookingStatus(value.status) &&
    isBookingChannel(value.channel) &&
    isNullableString(value.customer_user_id) &&
    isNullableString(value.guest_name) &&
    isNullableString(value.guest_phone) &&
    isNullableString(value.hold_expires_at) &&
    isNullableString(value.checked_in_at) &&
    isNullableString(value.customer_note) &&
    isNullableString(value.internal_note)
  )
}

export function normalizeBooking(value: BookingResponse): Booking {
  return {
    id: value.id,
    bookingCode: value.booking_code,
    customerUserId: value.customer_user_id,
    guestName: value.guest_name,
    guestPhone: value.guest_phone,
    channel: value.channel,
    status: value.status,
    bookingDate: value.booking_date,
    slotCount: value.slot_count,
    totalAmount: value.total_amount,
    holdExpiresAt: value.hold_expires_at,
    checkedInAt: value.checked_in_at,
    customerNote: value.customer_note,
    internalNote: value.internal_note,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }
}

function isBookingItemResponse(value: unknown): value is {
  court_id: string
  ends_at: string
  id: string
  line_total_amount: number
  rate_class: string
  starts_at: string
  unit_price_amount: number
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.court_id === 'string' &&
    typeof value.starts_at === 'string' &&
    typeof value.ends_at === 'string' &&
    typeof value.rate_class === 'string' &&
    typeof value.unit_price_amount === 'number' &&
    typeof value.line_total_amount === 'number'
  )
}

/** `quote_snapshot` bersifat immutable (BR-B-13); dibaca apa adanya, tidak dihitung ulang. */
function isQuote(value: unknown): value is Quote {
  return isRecord(value) && Array.isArray(value.lines) && typeof value.total_amount === 'number'
}

interface BookingDetailResponse extends BookingResponse {
  is_cancellable: boolean
  items: unknown[]
  policy_applied: string | null
  quote: unknown
  refund_estimate_amount: number
}

export function isBookingDetailResponse(value: unknown): value is BookingDetailResponse {
  if (!isRecord(value) || !isBookingResponse(value)) return false
  return (
    typeof value.is_cancellable === 'boolean' &&
    typeof value.refund_estimate_amount === 'number' &&
    Array.isArray(value.items)
  )
}

export function normalizeBookingDetail(value: BookingDetailResponse): BookingDetail {
  return {
    ...normalizeBooking(value),
    isCancellable: value.is_cancellable,
    refundEstimateAmount: value.refund_estimate_amount,
    policyApplied: typeof value.policy_applied === 'string' ? value.policy_applied : null,
    quote: isQuote(value.quote) ? value.quote : null,
    items: value.items.filter(isBookingItemResponse).map((item) => ({
      id: item.id,
      courtId: item.court_id,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      rateClass: item.rate_class,
      unitPriceAmount: item.unit_price_amount,
      lineTotalAmount: item.line_total_amount,
    })),
  }
}

/** Baris addon dari snapshot quote — API tidak mengembalikan addon sebagai koleksi terpisah. */
export function addonLines(quote: Quote | null): QuoteLine[] {
  return quote?.lines.filter((line) => line.type === 'addon') ?? []
}

export function discountLines(quote: Quote | null): QuoteLine[] {
  return quote?.lines.filter((line) => line.type === 'discount') ?? []
}

export function feeLines(quote: Quote | null): QuoteLine[] {
  return quote?.lines.filter((line) => line.type === 'fee') ?? []
}

/** Nama yang ditampilkan operator: guest untuk walk-in, tautan akun untuk customer terdaftar. */
export function bookingPartyLabel(booking: Booking): string {
  if (booking.guestName) return booking.guestName
  if (booking.customerUserId) return 'Customer terdaftar'
  return '—'
}
