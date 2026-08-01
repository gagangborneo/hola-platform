import {
  cursorPaginationQuery,
  idSchema,
  isoDate,
  money,
  offsetPaginationQuery,
} from '@hola/shared'
import { z } from 'zod'

const bookingItemSchema = z
  .object({
    court_id: idSchema,
    starts_at: z.string().datetime({ offset: true }),
  })
  .strict()

const bookingAddonSchema = z
  .object({
    addon_id: idSchema,
    quantity: z.number().int().min(1).max(20),
  })
  .strict()

const bookingBody = z
  .object({
    items: z.array(bookingItemSchema).min(1).max(8),
    addons: z.array(bookingAddonSchema).max(10).default([]),
    promo_code: z.string().trim().min(1).max(64).optional(),
    expected_total_amount: money.optional(),
    customer_note: z.string().trim().min(1).max(1_000).optional(),
    // Field ini sengaja diterima agar dapat diabaikan untuk customer (BR-B-10).
    customer_user_id: idSchema.optional(),
    guest_name: z.string().trim().min(1).max(160).optional(),
    guest_phone: z.string().trim().min(1).max(32).optional(),
    channel: z.enum(['web', 'mobile', 'admin', 'walk_in']).optional(),
  })
  .strict()

export const bookingQuoteSchema = bookingBody.pick({
  items: true,
  addons: true,
  promo_code: true,
})

export const createBookingSchema = bookingBody
export const bookingIdParam = z.object({ id: idSchema })
export const checkInBookingSchema = z
  .object({ force: z.boolean().optional().default(false) })
  .strict()
export const patchBookingNotesSchema = z
  .object({
    customer_note: z.string().trim().min(1).max(1_000).optional(),
    internal_note: z.string().trim().min(1).max(1_000).optional(),
  })
  .strict()
  .refine((value) => value.customer_note !== undefined || value.internal_note !== undefined, {
    message: 'Minimal satu catatan harus diubah.',
  })
export const cancelBookingSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict()

const bookingStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'completed',
  'cancelled',
  'expired',
  'no_show',
])

export const bookingsQuerySchema = offsetPaginationQuery.extend({
  status: bookingStatusSchema.optional(),
  booking_date_from: isoDate.optional(),
  booking_date_to: isoDate.optional(),
  court_id: idSchema.optional(),
  customer_user_id: idSchema.optional(),
  channel: z.enum(['web', 'mobile', 'admin', 'walk_in']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['-created_at', 'booking_date']).default('-created_at'),
})

export const myBookingsQuerySchema = cursorPaginationQuery.extend({
  status: bookingStatusSchema.optional(),
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CheckInBookingInput = z.infer<typeof checkInBookingSchema>
export type PatchBookingNotesInput = z.infer<typeof patchBookingNotesSchema>
export type BookingsQuery = z.infer<typeof bookingsQuerySchema>
export type MyBookingsQuery = z.infer<typeof myBookingsQuerySchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
