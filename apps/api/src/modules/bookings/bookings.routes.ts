import { RATE_LIMIT_BUCKET, USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { ok } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import { idempotency } from '../../middleware/idempotency.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { bookingQuoteSchema, createBookingSchema } from './bookings.schema.ts'
import { type CreatedBooking, createBooking, quoteBooking } from './bookings.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/bookings'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function context(c: {
  get: (key: 'core' | 'now' | 'userId' | 'role') => unknown
  req: { header: (name: string) => string | undefined }
}) {
  const core = c.get('core') as Variables['core']
  const now = c.get('now')
  const userId = c.get('userId')
  const role = c.get('role')
  if (
    !(now instanceof Date) ||
    typeof userId !== 'string' ||
    (role !== USER_ROLE.CUSTOMER && role !== USER_ROLE.STAFF && role !== USER_ROLE.ADMIN)
  ) {
    throw err.unauthenticated()
  }
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  return { ...core, now, actor, clientPlatform: c.req.header('X-Client-Platform') }
}

function serializeCreated(result: CreatedBooking) {
  return {
    id: result.booking.id,
    booking_code: result.booking.bookingCode,
    status: result.booking.status,
    channel: result.booking.channel,
    booking_date: result.booking.bookingDate,
    hold_expires_at: result.booking.holdExpiresAt?.toISOString() ?? null,
    total_amount: result.booking.totalAmount,
    quote: result.quote,
    items: result.items.map((item) => ({
      id: item.id,
      court_id: item.courtId,
      starts_at: item.startsAt.toISOString(),
      ends_at: item.endsAt.toISOString(),
      rate_class: item.rateClass,
      unit_price_amount: item.unitPriceAmount,
      line_total_amount: item.lineTotalAmount,
    })),
    created_at: result.booking.createdAt.toISOString(),
  }
}

registerGuardedRoute('POST', PREFIX)

export const bookingsRoutes = new Hono<{ Variables: Variables }>()
  .use('/bookings/quote', rateLimit(RATE_LIMIT_BUCKET.BOOKING_QUOTE))
  .use('/bookings', rateLimit(RATE_LIMIT_BUCKET.BOOKING_CREATE))
  .post('/bookings/quote', zValidator('json', bookingQuoteSchema, validationHook), async (c) => {
    const quote = await quoteBooking(
      { db: c.get('core').db, now: c.get('now') },
      c.req.valid('json'),
    )
    return c.json(ok(quote))
  })
  .post(
    '/bookings',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    idempotency('booking.create'),
    zValidator('json', createBookingSchema, validationHook),
    async (c) => {
      const booking = await createBooking(context(c), c.req.valid('json'))
      return c.json(ok(serializeCreated(booking)), 201)
    },
  )
