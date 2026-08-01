import {
  bookingItems,
  bookings,
  courts,
  financeEvents,
  notifications,
  payments,
  paymentWebhookEvents,
  promoRedemptions,
  promos,
  slotClaims,
  sports,
  users,
  venues,
} from '@hola/db'
import { QUEUE, type Quote, TEMPLATE_CODE } from '@hola/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import type { QueueProducers } from '../../config/queues.ts'
import { MidtransProvider } from '../../providers/payment/midtrans-provider.ts'
import type { PaymentProvider } from '../../providers/payment/payment-provider.ts'
import {
  createManualPayment,
  createPayment,
  type PaymentsServiceContext,
  processMidtransWebhook,
  receiveMidtransWebhook,
} from './payments.service.ts'

const ids = {
  venue: '01940000-0000-7000-8000-000000000101',
  sport: '01940000-0000-7000-8000-000000000102',
  court: '01940000-0000-7000-8000-000000000103',
  customer: '01940000-0000-7000-8000-000000000104',
  staff: '01940000-0000-7000-8000-000000000105',
  booking: '01940000-0000-7000-8000-000000000106',
  item: '01940000-0000-7000-8000-000000000107',
  claim: '01940000-0000-7000-8000-000000000108',
  promo: '01940000-0000-7000-8000-000000000109',
  redemption: '01940000-0000-7000-8000-000000000110',
} as const

const now = new Date('2026-08-01T02:00:00.000Z')
const serverKey = 'sandbox-server-key-for-integration'
const queueAdd = vi.fn(async () => undefined)
// Aman untuk test: service hanya memanggil method `add` milik producer BullMQ.
const queues = Object.fromEntries(
  Object.values(QUEUE).map((queue) => [queue, { add: queueAdd }]),
) as unknown as QueueProducers

function quote(total = 150_000): Quote {
  const discount = total === 0 ? 150_000 : 0
  return {
    kind: 'booking',
    computed_at: now.toISOString(),
    pipeline_version: 1,
    lines: [
      {
        type: 'slot',
        ref_id: ids.court,
        label: 'Court Payment Fixture',
        quantity: 1,
        unit_price_amount: 150_000,
        line_total_amount: 150_000,
      },
    ],
    subtotal_amount: 150_000,
    addon_amount: 0,
    tier_discount_amount: 0,
    promo: discount
      ? {
          promo_id: ids.promo,
          code: 'FREEPAY',
          name: 'Gratis',
          type: 'fixed',
          discount_amount: discount,
        }
      : null,
    discount_amount: discount,
    taxable_base_amount: total,
    tax_rate: 0,
    tax_amount: 0,
    fee_amount: 0,
    rounding_adjustment_amount: 0,
    total_amount: total,
    currency: 'IDR',
    warnings: [],
  }
}

let snapRequest: Record<string, unknown> | null = null
const fetcher: typeof fetch = async (_url, init) => {
  snapRequest = JSON.parse(String(init?.body)) as Record<string, unknown>
  return new Response(
    JSON.stringify({ token: 'snap-token-test', redirect_url: 'https://sandbox.midtrans.test/pay' }),
    { status: 201, headers: { 'content-type': 'application/json' } },
  )
}

function provider(): PaymentProvider {
  return new MidtransProvider({
    serverKey,
    isProduction: false,
    paymentExpiryMinutes: 15,
    refundApiSupportedMethods: [],
    fetcher,
  })
}

function webhookBody(input: {
  orderId: string
  amount: number
  transactionStatus: string
  fraudStatus?: string | undefined
  transactionTime?: string | undefined
  validSignature?: boolean | undefined
}): string {
  const gross = `${input.amount}.00`
  const statusCode = '200'
  const transactionTime = input.transactionTime ?? '2026-08-01 10:00:00'
  const signature = createHash('sha512')
    .update(`${input.orderId}${statusCode}${gross}${serverKey}`)
    .digest('hex')
  return JSON.stringify({
    order_id: input.orderId,
    transaction_status: input.transactionStatus,
    status_code: statusCode,
    gross_amount: gross,
    transaction_time: transactionTime,
    transaction_id: `tx-${transactionTime}`,
    payment_type: 'qris',
    ...(input.fraudStatus ? { fraud_status: input.fraudStatus } : {}),
    signature_key: input.validSignature === false ? '0'.repeat(128) : signature,
  })
}

function context(overrides: Partial<PaymentsServiceContext> = {}): PaymentsServiceContext {
  return {
    db,
    env: {
      APP_ENV: 'local',
      PAYMENT_EXPIRY_MINUTES: 15,
      WEB_BASE_URL: 'https://web.example.test',
      MIDTRANS_SERVER_KEY: serverKey,
    } as PaymentsServiceContext['env'],
    logger,
    queues,
    paymentProviderFactory: () => provider(),
    now,
    actor: {
      userId: ids.customer,
      role: 'customer',
      cafeTenantId: undefined,
      employeeId: undefined,
    },
    idempotencyKey: '01J00000000000000000000000',
    ...overrides,
  }
}

async function cleanFixtures(): Promise<void> {
  const paymentRows = await db
    .select({ id: payments.id, orderId: payments.providerOrderId })
    .from(payments)
    .where(eq(payments.bookingId, ids.booking))
  const paymentIds = paymentRows.map((row) => row.id)
  const orderIds = paymentRows.flatMap((row) => (row.orderId ? [row.orderId] : []))
  await db
    .delete(paymentWebhookEvents)
    .where(
      orEmpty(
        paymentIds.length ? inArray(paymentWebhookEvents.paymentId, paymentIds) : undefined,
        orderIds.length ? inArray(paymentWebhookEvents.providerOrderId, orderIds) : undefined,
        eq(paymentWebhookEvents.providerOrderId, 'unknown-order'),
      ),
    )
  await db
    .delete(financeEvents)
    .where(and(eq(financeEvents.sourceType, 'booking'), eq(financeEvents.sourceId, ids.booking)))
  await db.delete(payments).where(eq(payments.bookingId, ids.booking))
  await db.delete(slotClaims).where(eq(slotClaims.id, ids.claim))
  await db.delete(promoRedemptions).where(eq(promoRedemptions.id, ids.redemption))
  await db.delete(bookingItems).where(eq(bookingItems.id, ids.item))
  await db.delete(bookings).where(eq(bookings.id, ids.booking))
  await db.delete(promos).where(eq(promos.id, ids.promo))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(users).where(inArray(users.id, [ids.customer, ids.staff]))
}

function orEmpty(...conditions: Array<ReturnType<typeof eq> | undefined>) {
  const present = conditions.filter((condition) => condition !== undefined)
  return present.length ? sql`(${sql.join(present, sql` OR `)})` : sql`false`
}

async function insertFixtures(total = 150_000): Promise<void> {
  await db.insert(users).values([
    {
      id: ids.customer,
      role: 'customer',
      email: 'payment.customer@example.test',
      fullName: 'Payment Customer',
    },
    {
      id: ids.staff,
      role: 'staff',
      email: 'payment.staff@example.test',
      fullName: 'Payment Staff',
    },
  ])
  await db.insert(venues).values({ id: ids.venue, name: 'Payment Fixture Venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'PAYTEST', name: 'Payment Fixture Sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'PAY-01',
    name: 'Payment Fixture Court',
    slotDurationMinutes: 60,
    status: 'active',
  })
  if (total === 0) {
    await db.insert(promos).values({
      id: ids.promo,
      code: 'FREEPAY',
      name: 'Gratis',
      type: 'fixed',
      valueAmount: 150_000,
      appliesTo: 'booking',
      validFrom: new Date('2026-07-01T00:00:00Z'),
      validUntil: new Date('2026-09-01T00:00:00Z'),
      status: 'active',
    })
  }
  await db.insert(bookings).values({
    id: ids.booking,
    bookingCode: 'HB-PAYMENT-TEST',
    customerUserId: ids.customer,
    channel: 'web',
    status: 'pending_payment',
    bookingDate: '2026-08-02',
    slotCount: 1,
    quoteSnapshot: quote(total),
    subtotalAmount: 150_000,
    discountAmount: total === 0 ? 150_000 : 0,
    totalAmount: total,
    promoId: total === 0 ? ids.promo : null,
    promoCode: total === 0 ? 'FREEPAY' : null,
    holdExpiresAt: new Date('2026-08-01T02:10:00Z'),
  })
  await db.insert(bookingItems).values({
    id: ids.item,
    bookingId: ids.booking,
    courtId: ids.court,
    startsAt: new Date('2026-08-02T00:00:00Z'),
    endsAt: new Date('2026-08-02T01:00:00Z'),
    rateClass: 'offpeak',
    unitPriceAmount: 150_000,
    lineTotalAmount: 150_000,
  })
  await db.insert(slotClaims).values({
    id: ids.claim,
    courtId: ids.court,
    startsAt: new Date('2026-08-02T00:00:00Z'),
    endsAt: new Date('2026-08-02T01:00:00Z'),
    slotDate: '2026-08-02',
    claimType: 'booking',
    status: 'held',
    holdExpiresAt: new Date('2026-08-01T02:10:00Z'),
    bookingItemId: ids.item,
  })
  if (total === 0) {
    await db.insert(promoRedemptions).values({
      id: ids.redemption,
      promoId: ids.promo,
      userId: ids.customer,
      bookingId: ids.booking,
      discountAmount: 150_000,
      status: 'reserved',
      reservedUntil: new Date('2026-08-01T02:10:00Z'),
    })
  }
}

beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
  queueAdd.mockClear()
  snapRequest = null
})
afterAll(cleanFixtures)

describe('payment dengan PostgreSQL nyata', () => {
  it('BR-P-10…BR-P-19/E-2/E-9: payment tersimpan sebelum Snap dan item discount tetap menyeimbangkan gross', async () => {
    const payment = await createPayment(context(), { booking_id: ids.booking })
    const request = snapRequest as {
      transaction_details?: { gross_amount?: number }
      item_details?: Array<{ price: number }>
    } | null
    expect(payment).toMatchObject({ provider: 'midtrans', status: 'pending', amount: 150_000 })
    expect(request?.transaction_details?.gross_amount).toBe(150_000)
    expect(request?.item_details?.reduce((sum, item) => sum + item.price, 0)).toBe(150_000)
    expect(queueAdd).toHaveBeenCalledTimes(1)
  })

  it('BR-P-11/E-1: percobaan baru membatalkan payment pending lama secara serial', async () => {
    const first = await createPayment(context(), { booking_id: ids.booking })
    const second = await createPayment(context({ idempotencyKey: '01J00000000000000000000001' }), {
      booking_id: ids.booking,
    })
    const [storedFirst] = await db.select().from(payments).where(eq(payments.id, first.id))
    expect(storedFirst?.status).toBe('cancelled')
    expect(second.status).toBe('pending')
  })

  it('E-2: webhook yang diproses sebelum response Snap tersimpan tetap menghasilkan payment paid', async () => {
    let raceContext: PaymentsServiceContext
    const racingFetcher: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as {
        transaction_details: { order_id: string; gross_amount: number }
      }
      const rawBody = webhookBody({
        orderId: request.transaction_details.order_id,
        amount: request.transaction_details.gross_amount,
        transactionStatus: 'settlement',
      })
      const received = await receiveMidtransWebhook(raceContext, { rawBody, headers: {} })
      await processMidtransWebhook(raceContext, received.providerEventId)
      return new Response(
        JSON.stringify({ token: 'late-token', redirect_url: 'https://sandbox.midtrans.test/late' }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      )
    }
    raceContext = context({
      paymentProviderFactory: () =>
        new MidtransProvider({
          serverKey,
          isProduction: false,
          paymentExpiryMinutes: 15,
          refundApiSupportedMethods: [],
          fetcher: racingFetcher,
        }),
    })
    const paid = await createPayment(raceContext, { booking_id: ids.booking })
    expect(paid).toMatchObject({ status: 'paid', snapToken: 'late-token' })
  })

  it('E-9: kegagalan jaringan gateway menyisakan payment pending untuk rekonsiliasi', async () => {
    const failingFetcher: typeof fetch = async () => {
      throw new Error('sandbox unavailable')
    }
    await expect(
      createPayment(
        context({
          paymentProviderFactory: () =>
            new MidtransProvider({
              serverKey,
              isProduction: false,
              paymentExpiryMinutes: 15,
              refundApiSupportedMethods: [],
              fetcher: failingFetcher,
            }),
        }),
        { booking_id: ids.booking },
      ),
    ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' })
    const [stored] = await db.select().from(payments).where(eq(payments.bookingId, ids.booking))
    expect(stored?.status).toBe('pending')
  })

  it('BR-P-18/E-14: total nol melewati gateway dan mengonfirmasi seluruh payable atomik', async () => {
    await cleanFixtures()
    await insertFixtures(0)
    const paid = await createPayment(context(), { booking_id: ids.booking })
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, ids.booking))
    const [claim] = await db.select().from(slotClaims).where(eq(slotClaims.id, ids.claim))
    const [redemption] = await db
      .select()
      .from(promoRedemptions)
      .where(eq(promoRedemptions.id, ids.redemption))
    expect(paid).toMatchObject({ provider: 'manual', method: 'cash', status: 'paid', amount: 0 })
    expect(snapRequest).toBeNull()
    expect(booking?.status).toBe('confirmed')
    expect(claim).toMatchObject({ status: 'confirmed', holdExpiresAt: null })
    expect(redemption?.status).toBe('applied')
  })

  it('BR-P-20…BR-P-26: pembayaran manual memakai markPaid yang sama dan mencatat finance event', async () => {
    const paid = await createManualPayment(
      context({
        actor: { userId: ids.staff, role: 'staff', cafeTenantId: undefined, employeeId: undefined },
      }),
      { booking_id: ids.booking, amount: 150_000, method: 'cash' },
    )
    const events = await db
      .select()
      .from(financeEvents)
      .where(eq(financeEvents.sourceId, ids.booking))
    expect(paid).toMatchObject({ provider: 'manual', status: 'paid', recordedByUserId: ids.staff })
    expect(events).toHaveLength(1)
  })

  it('BR-P-30…BR-P-40/DoD-1-03: webhook identik 5× menghasilkan satu transisi, efek, dan finance event', async () => {
    const email = vi.fn(async () => undefined)
    const ctx = context({ onPaymentPaid: email })
    const payment = await createPayment(ctx, { booking_id: ids.booking })
    const rawBody = webhookBody({
      orderId: payment.providerOrderId ?? '',
      amount: payment.amount,
      transactionStatus: 'settlement',
    })
    const received = await Promise.all(
      Array.from({ length: 5 }, async () => receiveMidtransWebhook(ctx, { rawBody, headers: {} })),
    )
    await Promise.all(
      received.map(async (event) => processMidtransWebhook(ctx, event.providerEventId)),
    )

    const [stored] = await db.select().from(payments).where(eq(payments.id, payment.id))
    const webhookRows = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.providerOrderId, payment.providerOrderId ?? ''))
    const events = await db
      .select()
      .from(financeEvents)
      .where(eq(financeEvents.sourceId, ids.booking))
    const emailRows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ids.customer),
          eq(notifications.templateCode, TEMPLATE_CODE.BOOKING_CONFIRMED),
          eq(notifications.channel, 'email'),
        ),
      )
    expect(stored?.status).toBe('paid')
    expect(webhookRows).toHaveLength(1)
    expect(webhookRows[0]?.processedAt).not.toBeNull()
    expect(email).toHaveBeenCalledTimes(1)
    expect(emailRows).toHaveLength(1)
    expect(events).toHaveLength(1)
  })

  it('E-5: signature invalid dicatat untuk investigasi tetapi tidak dienqueue', async () => {
    const payment = await createPayment(context(), { booking_id: ids.booking })
    const callsBeforeWebhook = queueAdd.mock.calls.length
    await expect(
      receiveMidtransWebhook(context(), {
        rawBody: webhookBody({
          orderId: payment.providerOrderId ?? '',
          amount: payment.amount,
          transactionStatus: 'settlement',
          validSignature: false,
        }),
        headers: {},
      }),
    ).rejects.toMatchObject({ code: 'WEBHOOK_SIGNATURE_INVALID' })
    const [event] = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.providerOrderId, payment.providerOrderId ?? ''))
    expect(event?.isSignatureValid).toBe(false)
    expect(queueAdd).toHaveBeenCalledTimes(callsBeforeWebhook)
  })

  it('BR-P-36: order tidak dikenal ditutup sebagai event error tanpa mengonfirmasi payable', async () => {
    const received = await receiveMidtransWebhook(context(), {
      rawBody: webhookBody({
        orderId: 'unknown-order',
        amount: 150_000,
        transactionStatus: 'settlement',
      }),
      headers: {},
    })
    await processMidtransWebhook(context(), received.providerEventId)
    const [event] = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.providerOrderId, 'unknown-order'))
    expect(event).toMatchObject({ processError: 'unknown_order', paymentId: null })
    expect(event?.processedAt).not.toBeNull()
  })

  it('BR-P-37/E-6: gross amount berbeda tidak mengonfirmasi payment', async () => {
    const payment = await createPayment(context(), { booking_id: ids.booking })
    const received = await receiveMidtransWebhook(context(), {
      rawBody: webhookBody({
        orderId: payment.providerOrderId ?? '',
        amount: payment.amount + 1,
        transactionStatus: 'settlement',
      }),
      headers: {},
    })
    await processMidtransWebhook(context(), received.providerEventId)
    const [stored] = await db.select().from(payments).where(eq(payments.id, payment.id))
    const [event] = await db
      .select()
      .from(paymentWebhookEvents)
      .where(eq(paymentWebhookEvents.providerOrderId, payment.providerOrderId ?? ''))
    expect(stored?.status).toBe('pending')
    expect(event?.processError).toBe('amount_mismatch')
  })

  it('E-8: capture challenge tetap pending dan membutuhkan review manual', async () => {
    const payment = await createPayment(context(), { booking_id: ids.booking })
    const received = await receiveMidtransWebhook(context(), {
      rawBody: webhookBody({
        orderId: payment.providerOrderId ?? '',
        amount: payment.amount,
        transactionStatus: 'capture',
        fraudStatus: 'challenge',
      }),
      headers: {},
    })
    await processMidtransWebhook(context(), received.providerEventId)
    const [stored] = await db.select().from(payments).where(eq(payments.id, payment.id))
    expect(stored).toMatchObject({ status: 'pending', needsManualReview: true })
  })
})

import { createHash } from 'node:crypto'
