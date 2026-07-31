import { idSchema } from '@hola/shared'
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

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CheckInBookingInput = z.infer<typeof checkInBookingSchema>
