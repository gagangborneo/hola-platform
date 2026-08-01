import {
  appSettings,
  bookingItems,
  bookings,
  financeEvents,
  type HolaDb,
  mediaFiles,
  payments,
  paymentWebhookEvents,
  promoRedemptions,
  slotClaims,
  users,
} from '@hola/db'
import {
  FINANCE_SOURCE_TYPE,
  type PaymentMethod,
  type PaymentStatus,
  SETTINGS_KEY,
} from '@hola/shared'
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, type SQL, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type { PaymentsQuery } from './payments.schema.ts'

type DbExecutor = HolaDb | Tx
export type PaymentRow = typeof payments.$inferSelect
export type PaymentWebhookEventRow = typeof paymentWebhookEvents.$inferSelect
export type PaymentPayable = {
  booking: typeof bookings.$inferSelect
  payer: { fullName: string; email: string | null; phone: string | null } | null
}

export async function lockBookingPayment(tx: Tx, bookingId: string): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`payment:${bookingId}`}, 0))`,
  )
}

export async function findBookingPayable(
  db: DbExecutor,
  bookingId: string,
): Promise<PaymentPayable | null> {
  const [row] = await db
    .select({
      booking: bookings,
      payerId: users.id,
      payerName: users.fullName,
      payerEmail: users.email,
      payerPhone: users.phone,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerUserId))
    .where(eq(bookings.id, bookingId))
    .limit(1)
  if (!row) return null
  return {
    booking: row.booking,
    payer: row.payerId
      ? {
          fullName: row.payerName ?? row.booking.guestName ?? 'Customer',
          email: row.payerEmail,
          phone: row.payerPhone,
        }
      : null,
  }
}

export async function cancelPendingBookingPayments(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<void> {
  await tx
    .update(payments)
    .set({ status: 'cancelled', failureReason: 'superseded', updatedAt: input.now })
    .where(and(eq(payments.bookingId, input.bookingId), eq(payments.status, 'pending')))
}

export async function insertPayment(
  tx: Tx,
  input: {
    paymentCode: string
    provider: 'midtrans' | 'manual'
    bookingId: string
    payerUserId: string | null
    amount: number
    method: PaymentMethod | null
    status: PaymentStatus
    providerOrderId: string | null
    expiresAt: Date | null
    paidAt: Date | null
    recordedByUserId: string | null
    idempotencyKey: string | null
    providerMeta?: Record<string, unknown> | undefined
    now: Date
  },
): Promise<PaymentRow> {
  const [row] = await tx
    .insert(payments)
    .values({
      paymentCode: input.paymentCode,
      provider: input.provider,
      bookingId: input.bookingId,
      payerUserId: input.payerUserId,
      amount: input.amount,
      method: input.method,
      status: input.status,
      providerOrderId: input.providerOrderId,
      expiresAt: input.expiresAt,
      paidAt: input.paidAt,
      recordedByUserId: input.recordedByUserId,
      idempotencyKey: input.idempotencyKey,
      providerMeta: input.providerMeta,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning()
  if (!row) throw new Error('INSERT payments tidak mengembalikan baris')
  return row
}

export async function saveGatewayTransaction(
  db: HolaDb,
  input: {
    paymentId: string
    providerOrderId: string
    providerToken: string
    redirectUrl: string
    expiresAt: Date
    now: Date
  },
): Promise<PaymentRow | null> {
  const [row] = await db
    .update(payments)
    .set({
      providerOrderId: input.providerOrderId,
      snapToken: input.providerToken,
      snapRedirectUrl: input.redirectUrl,
      expiresAt: input.expiresAt,
      updatedAt: input.now,
    })
    .where(eq(payments.id, input.paymentId))
    .returning()
  return row ?? null
}

export async function findPayment(db: DbExecutor, paymentId: string): Promise<PaymentRow | null> {
  const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1)
  return row ?? null
}

export async function findPaymentByProviderOrderId(
  db: DbExecutor,
  providerOrderId: string,
): Promise<PaymentRow | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerOrderId, providerOrderId))
    .limit(1)
  return row ?? null
}

function listWhere(query: PaymentsQuery): SQL | undefined {
  const search = query.q
    ? or(ilike(payments.paymentCode, `%${query.q}%`), ilike(bookings.bookingCode, `%${query.q}%`))
    : undefined
  return and(
    ...(query.status ? [eq(payments.status, query.status)] : []),
    ...(query.method ? [eq(payments.method, query.method)] : []),
    ...(query.paid_at_from ? [gte(payments.paidAt, new Date(query.paid_at_from))] : []),
    ...(query.paid_at_to ? [lte(payments.paidAt, new Date(query.paid_at_to))] : []),
    ...(query.provider_order_id ? [eq(payments.providerOrderId, query.provider_order_id)] : []),
    ...(search ? [search] : []),
  )
}

export async function listPayments(db: HolaDb, query: PaymentsQuery): Promise<PaymentRow[]> {
  return db
    .select({ payment: payments })
    .from(payments)
    .leftJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(listWhere(query))
    .orderBy(desc(payments.createdAt), desc(payments.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
    .then((rows) => rows.map((row) => row.payment))
}

export async function countPayments(db: HolaDb, query: PaymentsQuery): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .leftJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(listWhere(query))
  return row?.count ?? 0
}

export async function transitionPendingPayment(
  tx: Tx,
  input: {
    paymentId: string
    status: Exclude<PaymentStatus, 'pending' | 'paid'>
    method: PaymentMethod | null
    providerTransactionId: string | null
    failureReason: string | null
    needsManualReview: boolean
    providerMeta: Record<string, unknown>
    now: Date
  },
): Promise<PaymentRow | null> {
  const [row] = await tx
    .update(payments)
    .set({
      status: input.status,
      method: input.method,
      providerTransactionId: input.providerTransactionId,
      failureReason: input.failureReason,
      needsManualReview: input.needsManualReview,
      providerMeta: input.providerMeta,
      ...(input.status === 'failed' ? { failedAt: input.now } : {}),
      updatedAt: input.now,
    })
    .where(and(eq(payments.id, input.paymentId), eq(payments.status, 'pending')))
    .returning()
  return row ?? null
}

export async function updatePendingPaymentReview(
  tx: Tx,
  input: {
    paymentId: string
    needsManualReview: boolean
    providerMeta: Record<string, unknown>
    now: Date
  },
): Promise<void> {
  await tx
    .update(payments)
    .set({
      needsManualReview: input.needsManualReview,
      providerMeta: input.providerMeta,
      updatedAt: input.now,
    })
    .where(and(eq(payments.id, input.paymentId), eq(payments.status, 'pending')))
}

export async function markPaymentPaid(
  tx: Tx,
  input: {
    paymentId: string
    method: PaymentMethod | null
    providerTransactionId: string | null
    paidAt: Date
    providerMeta: Record<string, unknown> | null
    now: Date
  },
): Promise<PaymentRow | null> {
  const [row] = await tx
    .update(payments)
    .set({
      status: 'paid',
      method: input.method,
      providerTransactionId: input.providerTransactionId,
      paidAt: input.paidAt,
      needsManualReview: false,
      providerMeta: input.providerMeta,
      updatedAt: input.now,
    })
    .where(and(eq(payments.id, input.paymentId), eq(payments.status, 'pending')))
    .returning()
  return row ?? null
}

export async function confirmBookingPayable(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<boolean> {
  const [row] = await tx
    .update(bookings)
    .set({ status: 'confirmed', confirmedAt: input.now, holdExpiresAt: null, updatedAt: input.now })
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.status, 'pending_payment')))
    .returning({ id: bookings.id })
  return row !== undefined
}

export async function confirmBookingSlotClaims(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<void> {
  await tx
    .update(slotClaims)
    .set({ status: 'confirmed', holdExpiresAt: null, updatedAt: input.now })
    .where(
      and(
        eq(slotClaims.status, 'held'),
        sql`EXISTS (SELECT 1 FROM ${bookingItems} bi WHERE bi.id = ${slotClaims.bookingItemId} AND bi.booking_id = ${input.bookingId})`,
      ),
    )
}

export async function applyBookingPromoRedemptions(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<void> {
  await tx
    .update(promoRedemptions)
    .set({ status: 'applied', reservedUntil: null, appliedAt: input.now, updatedAt: input.now })
    .where(
      and(eq(promoRedemptions.bookingId, input.bookingId), eq(promoRedemptions.status, 'reserved')),
    )
}

export async function insertBookingRevenueEvent(
  tx: Tx,
  input: { booking: typeof bookings.$inferSelect; payment: PaymentRow; now: Date },
): Promise<void> {
  await tx
    .insert(financeEvents)
    .values({
      sourceType: FINANCE_SOURCE_TYPE.BOOKING,
      sourceId: input.booking.id,
      kind: 'revenue',
      payload: {
        payment_id: input.payment.id,
        payment_code: input.payment.paymentCode,
        amount: input.payment.amount,
        provider: input.payment.provider,
        method: input.payment.method,
        subtotal_amount: input.booking.subtotalAmount,
        addon_amount: input.booking.addonAmount,
        discount_amount: input.booking.discountAmount,
        tax_amount: input.booking.taxAmount,
        fee_amount: input.booking.feeAmount,
        total_amount: input.booking.totalAmount,
        paid_at: input.payment.paidAt?.toISOString() ?? input.now.toISOString(),
      },
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing({
      target: [financeEvents.sourceType, financeEvents.sourceId, financeEvents.kind],
    })
}

export async function findReadyPaymentProof(db: DbExecutor, mediaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: mediaFiles.id })
    .from(mediaFiles)
    .where(
      and(
        eq(mediaFiles.id, mediaId),
        eq(mediaFiles.kind, 'payment_proof'),
        eq(mediaFiles.status, 'ready'),
      ),
    )
    .limit(1)
  return row !== undefined
}

export async function findRefundApiSupportedMethods(db: HolaDb): Promise<PaymentMethod[]> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, SETTINGS_KEY.REFUND_API_SUPPORTED_METHODS))
    .limit(1)
  if (!Array.isArray(row?.value)) return []
  const allowed: readonly PaymentMethod[] = [
    'qris',
    'gopay',
    'shopeepay',
    'bank_transfer_va',
    'credit_card',
    'cash',
    'manual_transfer',
  ]
  return row.value.filter(
    (value): value is PaymentMethod =>
      typeof value === 'string' && allowed.includes(value as PaymentMethod),
  )
}

export async function insertWebhookEvent(
  db: HolaDb,
  input: {
    providerEventId: string
    providerOrderId: string
    isSignatureValid: boolean
    payload: Record<string, unknown>
    receivedAt: Date
  },
): Promise<PaymentWebhookEventRow | null> {
  const [row] = await db
    .insert(paymentWebhookEvents)
    .values({
      provider: 'midtrans',
      ...input,
      createdAt: input.receivedAt,
      updatedAt: input.receivedAt,
    })
    .onConflictDoNothing({
      target: [paymentWebhookEvents.provider, paymentWebhookEvents.providerEventId],
    })
    .returning()
  return row ?? null
}

export async function findWebhookEvent(
  db: DbExecutor,
  providerEventId: string,
): Promise<PaymentWebhookEventRow | null> {
  const [row] = await db
    .select()
    .from(paymentWebhookEvents)
    .where(
      and(
        eq(paymentWebhookEvents.provider, 'midtrans'),
        eq(paymentWebhookEvents.providerEventId, providerEventId),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function lockWebhookEvent(
  tx: Tx,
  providerEventId: string,
): Promise<PaymentWebhookEventRow | null> {
  const [row] = await tx
    .select()
    .from(paymentWebhookEvents)
    .where(
      and(
        eq(paymentWebhookEvents.provider, 'midtrans'),
        eq(paymentWebhookEvents.providerEventId, providerEventId),
      ),
    )
    .limit(1)
    .for('update')
  return row ?? null
}

export async function completeWebhookEvent(
  tx: Tx,
  input: { eventId: string; paymentId: string | null; processError: string | null; now: Date },
): Promise<void> {
  await tx
    .update(paymentWebhookEvents)
    .set({
      paymentId: input.paymentId,
      processError: input.processError,
      processedAt: input.now,
      attemptCount: sql`${paymentWebhookEvents.attemptCount} + 1`,
      updatedAt: input.now,
    })
    .where(eq(paymentWebhookEvents.id, input.eventId))
}

/** Fixture cleanup untuk integration test modul ini. */
export async function deletePaymentFixtures(
  db: HolaDb,
  input: { bookingIds: readonly string[]; paymentIds: readonly string[] },
): Promise<void> {
  if (input.bookingIds.length > 0) {
    await db
      .delete(financeEvents)
      .where(
        and(
          eq(financeEvents.sourceType, FINANCE_SOURCE_TYPE.BOOKING),
          inArray(financeEvents.sourceId, [...input.bookingIds]),
        ),
      )
  }
  if (input.paymentIds.length > 0) {
    await db
      .delete(paymentWebhookEvents)
      .where(inArray(paymentWebhookEvents.paymentId, [...input.paymentIds]))
    await db.delete(payments).where(inArray(payments.id, [...input.paymentIds]))
  }
}

export async function listPaymentIdsForBooking(db: HolaDb, bookingId: string): Promise<string[]> {
  return db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(asc(payments.createdAt))
    .then((rows) => rows.map((row) => row.id))
}
