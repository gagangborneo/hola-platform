import { RATE_LIMIT_BUCKET, USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import { idempotency } from '../../middleware/idempotency.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  bookingIdParam,
  bookingQuoteSchema,
  bookingsQuerySchema,
  cancelBookingSchema,
  checkInBookingSchema,
  createBookingSchema,
  myBookingsQuerySchema,
  patchBookingNotesSchema,
} from './bookings.schema.ts'
import {
  type CreatedBooking,
  cancelBooking,
  checkInBooking,
  createBooking,
  getBookingDetail,
  listAllBookings,
  listMyBookings,
  markBookingAsNoShow,
  quoteBooking,
  updateBookingNotes,
} from './bookings.service.ts'

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

function serializeBooking(booking: CreatedBooking['booking']) {
  return {
    id: booking.id,
    booking_code: booking.bookingCode,
    customer_user_id: booking.customerUserId,
    guest_name: booking.guestName,
    guest_phone: booking.guestPhone,
    channel: booking.channel,
    status: booking.status,
    booking_date: booking.bookingDate,
    slot_count: booking.slotCount,
    total_amount: booking.totalAmount,
    hold_expires_at: booking.holdExpiresAt?.toISOString() ?? null,
    checked_in_at: booking.checkedInAt?.toISOString() ?? null,
    customer_note: booking.customerNote,
    internal_note: booking.internalNote,
    created_at: booking.createdAt.toISOString(),
    updated_at: booking.updatedAt.toISOString(),
  }
}

function serializeDetail(result: Awaited<ReturnType<typeof getBookingDetail>>) {
  return {
    ...serializeBooking(result.booking),
    quote: result.booking.quoteSnapshot,
    items: result.items.map((item) => ({
      id: item.id,
      court_id: item.courtId,
      starts_at: item.startsAt.toISOString(),
      ends_at: item.endsAt.toISOString(),
      rate_class: item.rateClass,
      unit_price_amount: item.unitPriceAmount,
      line_total_amount: item.lineTotalAmount,
    })),
  }
}

registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('POST', `${PREFIX}/:id/check-in`)
registerGuardedRoute('POST', `${PREFIX}/:id/no-show`)
registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('GET', `${PREFIX}/:id`)
registerGuardedRoute('GET', '/api/v1/me/bookings')
registerGuardedRoute('PATCH', `${PREFIX}/:id`)
registerGuardedRoute('GET', `${PREFIX}/:id/receipt`)
registerGuardedRoute('POST', `${PREFIX}/:id/cancel`)

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
  .post(
    '/bookings/:id/check-in',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    zValidator('json', checkInBookingSchema, validationHook),
    async (c) => {
      const booking = await checkInBooking(context(c), {
        bookingId: c.req.valid('param').id,
        force: c.req.valid('json').force,
      })
      return c.json(
        ok({
          id: booking.id,
          status: booking.status,
          checked_in_at: booking.checkedInAt?.toISOString() ?? null,
        }),
      )
    },
  )
  .post(
    '/bookings/:id/no-show',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    async (c) => {
      const booking = await markBookingAsNoShow(context(c), c.req.valid('param').id)
      return c.json(ok({ id: booking.id, status: booking.status }))
    },
  )
  .get(
    '/bookings',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', bookingsQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await listAllBookings(context(c), query)
      return c.json(
        okList(
          result.rows.map(serializeBooking),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
  .post(
    '/bookings/:id/cancel',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    zValidator('json', cancelBookingSchema, validationHook),
    async (c) => {
      const result = await cancelBooking(context(c), {
        bookingId: c.req.valid('param').id,
        reason: c.req.valid('json').reason,
      })
      return c.json(
        ok({
          id: result.booking.id,
          status: result.booking.status,
          refund_estimate_amount: result.refundEstimateAmount,
          policy_applied: result.policyApplied,
        }),
      )
    },
  )
  .get(
    '/me/bookings',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', myBookingsQuerySchema, validationHook),
    async (c) => {
      const result = await listMyBookings(context(c), c.req.valid('query'))
      return c.json(okList(result.rows.map(serializeBooking), { pagination: result.pagination }))
    },
  )
  .get(
    '/bookings/:id',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    async (c) =>
      c.json(ok(serializeDetail(await getBookingDetail(context(c), c.req.valid('param').id)))),
  )
  .patch(
    '/bookings/:id',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    zValidator('json', patchBookingNotesSchema, validationHook),
    async (c) => {
      const input = c.req.valid('json')
      const booking = await updateBookingNotes(context(c), {
        bookingId: c.req.valid('param').id,
        customerNote: input.customer_note,
        internalNote: input.internal_note,
      })
      const role = c.get('role')
      return c.json(
        ok({
          id: booking.id,
          customer_note: booking.customerNote,
          ...(role === USER_ROLE.STAFF || role === USER_ROLE.ADMIN
            ? { internal_note: booking.internalNote }
            : {}),
        }),
      )
    },
  )
  .get(
    '/bookings/:id/receipt',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', bookingIdParam, validationHook),
    async (c) => {
      const result = await getBookingDetail(context(c), c.req.valid('param').id)
      return c.json(
        ok({
          booking_code: result.booking.bookingCode,
          booking_date: result.booking.bookingDate,
          status: result.booking.status,
          quote: result.booking.quoteSnapshot,
          total_amount: result.booking.totalAmount,
          items: serializeDetail(result).items,
        }),
      )
    },
  )
