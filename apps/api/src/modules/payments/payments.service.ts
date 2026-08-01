import { createHash } from 'node:crypto'
import type { Quote } from '@hola/shared'
import {
  ERROR_CODE,
  JOB,
  PAYMENT_METHOD,
  type PaymentMethod,
  type QuoteLine,
  TEMPLATE_CODE,
} from '@hola/shared'
import { incrementMetric } from '../../config/metrics.ts'
import { enqueueJobTo } from '../../config/queues.ts'
import { nextPaymentCode } from '../../lib/codes.ts'
import { err } from '../../lib/errors.ts'
import { addMinutes } from '../../lib/time.ts'
import { type TransactionScope, withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { readStoredMidtransPayload } from '../../providers/payment/midtrans-provider.ts'
import type {
  PaymentProvider,
  ProviderItem,
  ProviderTransactionStatus,
} from '../../providers/payment/payment-provider.ts'
import { ProviderTransactionNotFoundError } from '../../providers/payment/payment-provider.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { scheduleBookingJobs } from '../bookings/booking-jobs.ts'
import { findBookingWithItems } from '../bookings/bookings.repository.ts'
import {
  enqueueEmailNotification,
  writeEmailNotification,
} from '../notifications/notification.service.ts'
import { releaseBookingPromo } from '../promos/promos.service.ts'
import { createRefundInScope } from '../refunds/refunds.service.ts'
import {
  reclaimExpiredBookingSlotsInTransaction,
  releaseBookingSlotsInTransaction,
} from '../slots/slots.service.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import { applyPaymentTransition, mapMidtransStatus } from './payment-state.ts'
import {
  applyBookingPromoRedemptions,
  cancelPendingBookingPayments,
  completeWebhookEvent,
  confirmBookingPayable,
  confirmBookingSlotClaims,
  countPayments,
  expirePendingBooking,
  expirePendingPayment,
  findBookingPayable,
  findPayment,
  findPaymentByProviderOrderId,
  findReadyPaymentProof,
  findRefundApiSupportedMethods,
  findWebhookEvent,
  insertBookingRevenueEvent,
  insertPayment,
  insertWebhookEvent,
  listDuePendingPayments,
  listPayments,
  listPendingPaymentsForReconciliation,
  listStuckWebhookEvents,
  lockBookingPayment,
  lockWebhookEvent,
  markPaymentPaid,
  type PaymentRow,
  recoverExpiredBooking,
  saveGatewayTransaction,
  transitionPendingPayment,
  updatePendingPaymentReview,
} from './payments.repository.ts'
import type {
  CreateManualPaymentInput,
  CreatePaymentInput,
  PaymentsQuery,
  SimulateWebhookInput,
} from './payments.schema.ts'

type PaymentDependencies = Pick<
  CoreDependencies,
  | 'db'
  | 'env'
  | 'logger'
  | 'paymentProviderFactory'
  | 'queues'
  | 'redis'
  | 'redisKeys'
  | 'safeRedis'
>

export interface PaymentsServiceContext extends PaymentDependencies {
  now: Date
  actor?: Viewer | undefined
  requestId?: string | undefined
  idempotencyKey?: string | undefined
  ipAddress?: string | undefined
  userAgent?: string | undefined
  /** P1.J memasang penulis notification; hook menjaga efek tetap setelah commit. */
  onPaymentPaid?: ((payment: PaymentRow) => Promise<void>) | undefined
}

function assertQuote(value: unknown): Quote {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('total_amount' in value) ||
    typeof value.total_amount !== 'number' ||
    !('lines' in value) ||
    !Array.isArray(value.lines)
  ) {
    throw err.internal()
  }
  // Aman: snapshot hanya ditulis pricing pipeline; field yang dipakai sudah divalidasi di atas.
  return value as Quote
}

function providerItem(line: QuoteLine): ProviderItem {
  return {
    id: line.ref_id,
    name: line.label,
    price: line.unit_price_amount,
    quantity: line.quantity,
  }
}

export function buildPaymentItems(quote: Quote): ProviderItem[] {
  const items = quote.lines.map(providerItem)
  if (quote.discount_amount > 0) {
    items.push({ id: 'discount', name: 'Diskon', price: -quote.discount_amount, quantity: 1 })
  }
  if (quote.tax_amount !== 0) {
    items.push({ id: 'tax', name: 'Pajak', price: quote.tax_amount, quantity: 1 })
  }
  if (quote.fee_amount !== 0) {
    items.push({ id: 'fee', name: 'Biaya layanan', price: quote.fee_amount, quantity: 1 })
  }
  if (quote.rounding_adjustment_amount !== 0) {
    items.push({
      id: 'rounding',
      name: 'Penyesuaian pembulatan',
      price: quote.rounding_adjustment_amount,
      quantity: 1,
    })
  }
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  if (total !== quote.total_amount) throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
  return items
}

async function midtransProvider(ctx: PaymentDependencies): Promise<PaymentProvider> {
  const methods = await findRefundApiSupportedMethods(ctx.db)
  return ctx.paymentProviderFactory(methods)
}

function assertBookingAccess(ctx: PaymentsServiceContext, payment: PaymentRow): void {
  if (!ctx.actor || ctx.actor.role === 'admin' || ctx.actor.role === 'staff') return
  if (payment.payerUserId !== ctx.actor.userId) throw err.notFound()
}

async function markPaidInScope(
  ctx: PaymentsServiceContext,
  scope: TransactionScope,
  input: {
    payment: PaymentRow
    method: PaymentMethod | null
    providerTransactionId: string | null
    paidAt: Date
    providerMeta: Record<string, unknown> | null
  },
): Promise<PaymentRow | null> {
  const paid = await markPaymentPaid(scope.tx, {
    paymentId: input.payment.id,
    method: input.method,
    providerTransactionId: input.providerTransactionId,
    paidAt: input.paidAt,
    providerMeta: input.providerMeta,
    now: ctx.now,
    allowExpired: input.payment.status === 'expired',
  })
  if (!paid) return null
  if (!paid.bookingId) throw err.internal()
  const payableBefore = await findBookingPayable(scope.tx, paid.bookingId)
  if (!payableBefore) throw err.internal()
  let confirmed = false
  let recoveredAfterExpiry = false
  if (payableBefore.booking.status === 'pending_payment') {
    const confirmedClaims = await confirmBookingSlotClaims(scope.tx, {
      bookingId: paid.bookingId,
      now: ctx.now,
    })
    if (confirmedClaims === payableBefore.booking.slotCount) {
      confirmed = await confirmBookingPayable(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
      if (!confirmed) throw err.conflict('Status booking berubah saat pembayaran diproses.')
      await applyBookingPromoRedemptions(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
    } else {
      await expirePendingBooking(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
      await releaseBookingSlotsInTransaction(ctx, paid.bookingId, scope)
      confirmed = await reclaimExpiredBookingSlotsInTransaction(ctx, paid.bookingId, scope)
      if (confirmed) {
        await recoverExpiredBooking(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
        await applyBookingPromoRedemptions(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
        recoveredAfterExpiry = true
        await writeAuditLog(scope.tx, {
          actorUserId: undefined,
          actorRole: undefined,
          action: 'booking.recovered_after_expiry',
          entityType: 'booking',
          entityId: paid.bookingId,
          before: payableBefore.booking,
          after: { status: 'confirmed', payment_id: paid.id },
          ipAddress: undefined,
          userAgent: undefined,
          requestId: undefined,
        })
      } else {
        await releaseBookingPromo(ctx, paid.bookingId, 'late_payment_slot_lost', scope)
      }
    }
  } else if (payableBefore.booking.status === 'expired') {
    const reclaimed = await reclaimExpiredBookingSlotsInTransaction(ctx, paid.bookingId, scope)
    if (reclaimed) {
      confirmed = await recoverExpiredBooking(scope.tx, { bookingId: paid.bookingId, now: ctx.now })
      if (!confirmed) throw err.conflict('Status booking berubah saat pemulihan pembayaran.')
      recoveredAfterExpiry = true
      await writeAuditLog(scope.tx, {
        actorUserId: undefined,
        actorRole: undefined,
        action: 'booking.recovered_after_expiry',
        entityType: 'booking',
        entityId: paid.bookingId,
        before: payableBefore.booking,
        after: { status: 'confirmed', payment_id: paid.id },
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
      })
    } else {
      await releaseBookingPromo(ctx, paid.bookingId, 'late_payment_slot_lost', scope)
    }
  }
  if (!confirmed) {
    await createRefundInScope(ctx, scope, {
      paymentId: paid.id,
      amount: paid.amount,
      reason:
        payableBefore.booking.status === 'expired'
          ? 'Pembayaran diterima setelah slot tidak lagi tersedia.'
          : 'Pembayaran tambahan diterima setelah booking selesai dibayar atau dibatalkan.',
      policyApplied: 'hola_fault_100pct',
      channel: 'manual_transfer',
      automatic: true,
    })
    if (ctx.onPaymentPaid) scope.afterCommit(() => ctx.onPaymentPaid?.(paid))
    return paid
  }
  const payable = await findBookingPayable(scope.tx, paid.bookingId)
  if (!payable) throw err.internal()
  await insertBookingRevenueEvent(scope.tx, {
    booking: payable.booking,
    payment: paid,
    now: ctx.now,
  })
  const notification =
    paid.payerUserId && payable?.payer?.email
      ? await writeEmailNotification(
          scope.tx,
          {
            userId: paid.payerUserId,
            toEmail: payable.payer.email,
            templateCode: recoveredAfterExpiry
              ? TEMPLATE_CODE.BOOKING_RECOVERED_AFTER_EXPIRY
              : TEMPLATE_CODE.BOOKING_CONFIRMED,
            dedupeKey: `booking:${paid.bookingId}:confirmed`,
            relatedType: 'booking',
            relatedId: paid.bookingId,
            payload: {
              full_name: payable.payer.fullName,
              booking_code: payable.booking.bookingCode,
              payment_code: paid.paymentCode,
              total_amount: paid.amount,
              paid_at: (paid.paidAt ?? ctx.now).toISOString(),
            },
          },
          ctx.now,
        )
      : null
  if (notification) scope.afterCommit(() => enqueueEmailNotification(ctx, notification.id))

  const booking = await findBookingWithItems(scope.tx, paid.bookingId)
  if (booking && booking.items.length > 0) {
    const startsAt = booking.items.reduce((earliest, item) =>
      item.startsAt < earliest.startsAt ? item : earliest,
    ).startsAt
    const endsAt = booking.items.reduce((latest, item) =>
      item.endsAt > latest.endsAt ? item : latest,
    ).endsAt
    scope.afterCommit(() =>
      scheduleBookingJobs(ctx, { bookingId: payable.booking.id, startsAt, endsAt }),
    )
  }
  if (ctx.onPaymentPaid) scope.afterCommit(() => ctx.onPaymentPaid?.(paid))
  return paid
}

export async function markPaid(
  ctx: PaymentsServiceContext,
  input: {
    paymentId: string
    method: PaymentMethod | null
    providerTransactionId: string | null
    paidAt: Date
    providerMeta: Record<string, unknown> | null
  },
): Promise<PaymentRow | null> {
  return withTransaction(
    ctx.db,
    async (scope) => {
      const payment = await findPayment(scope.tx, input.paymentId)
      if (!payment) throw err.notFound('Payment tidak ditemukan.')
      return markPaidInScope(ctx, scope, { payment, ...input })
    },
    { logger: ctx.logger },
  )
}

export async function createPayment(
  ctx: PaymentsServiceContext,
  input: CreatePaymentInput,
): Promise<PaymentRow> {
  if (!ctx.actor) throw err.unauthenticated()
  const expiresAt = addMinutes(ctx.now, ctx.env.PAYMENT_EXPIRY_MINUTES)
  const inserted = await withTransaction(
    ctx.db,
    async (scope) => {
      await lockBookingPayment(scope.tx, input.booking_id)
      const payable = await findBookingPayable(scope.tx, input.booking_id)
      if (!payable) throw err.notFound('Booking tidak ditemukan.')
      if (ctx.actor?.role === 'customer' && payable.booking.customerUserId !== ctx.actor.userId) {
        throw err.notFound()
      }
      if (payable.booking.status === 'confirmed') throw err.of(ERROR_CODE.BOOKING_ALREADY_PAID)
      if (payable.booking.status !== 'pending_payment') {
        throw err.conflict('Booking tidak dapat dibayar pada status saat ini.')
      }
      const quote = assertQuote(payable.booking.quoteSnapshot)
      if (quote.total_amount !== payable.booking.totalAmount) {
        throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
      }
      await cancelPendingBookingPayments(scope.tx, { bookingId: payable.booking.id, now: ctx.now })
      const paymentCode = await nextPaymentCode(scope.tx, ctx.now)
      const payment = await insertPayment(scope.tx, {
        paymentCode,
        provider: quote.total_amount === 0 ? 'manual' : 'midtrans',
        bookingId: payable.booking.id,
        payerUserId: payable.booking.customerUserId,
        amount: quote.total_amount,
        method: quote.total_amount === 0 ? PAYMENT_METHOD.CASH : null,
        status: 'pending',
        providerOrderId: quote.total_amount === 0 ? null : paymentCode,
        expiresAt: quote.total_amount === 0 ? null : expiresAt,
        paidAt: null,
        recordedByUserId: null,
        idempotencyKey: ctx.idempotencyKey ?? null,
        now: ctx.now,
      })
      if (quote.total_amount === 0) {
        const paid = await markPaidInScope(ctx, scope, {
          payment,
          method: PAYMENT_METHOD.CASH,
          providerTransactionId: null,
          paidAt: ctx.now,
          providerMeta: null,
        })
        if (!paid) throw err.internal()
        return { payment: paid, payable, quote }
      }
      return { payment, payable, quote }
    },
    { logger: ctx.logger },
  )
  if (inserted.payment.status === 'paid') return inserted.payment

  const provider = await midtransProvider(ctx)
  const gateway = await provider.createTransaction({
    payment_code: inserted.payment.paymentCode,
    amount: inserted.payment.amount,
    items: buildPaymentItems(inserted.quote),
    customer: {
      name: inserted.payable.payer?.fullName ?? inserted.payable.booking.guestName ?? 'Customer',
      ...(inserted.payable.payer?.email ? { email: inserted.payable.payer.email } : {}),
      ...(inserted.payable.payer?.phone
        ? { phone: inserted.payable.payer.phone }
        : inserted.payable.booking.guestPhone
          ? { phone: inserted.payable.booking.guestPhone }
          : {}),
    },
    expires_at: expiresAt,
    callback_urls: {
      finish: `${ctx.env.WEB_BASE_URL.replace(/\/$/, '')}/payments/${inserted.payment.id}`,
      error: `${ctx.env.WEB_BASE_URL.replace(/\/$/, '')}/payments/${inserted.payment.id}`,
    },
  })
  const saved = await saveGatewayTransaction(ctx.db, {
    paymentId: inserted.payment.id,
    providerOrderId: gateway.provider_order_id,
    providerToken: gateway.provider_token,
    redirectUrl: gateway.redirect_url,
    expiresAt: gateway.expires_at,
    now: ctx.now,
  })
  if (!saved) throw err.internal()
  if (saved.status === 'paid') return saved
  if (saved.status !== 'pending') throw err.of(ERROR_CODE.PAYMENT_NOT_PENDING)
  try {
    await enqueueJobTo(
      ctx.queues,
      JOB.PAYMENT_EXPIRE_UNPAID,
      { paymentId: saved.id },
      { jobId: `expire-${saved.id}`, delay: Math.max(0, expiresAt.getTime() - ctx.now.getTime()) },
    )
  } catch (error) {
    ctx.logger.warn(
      { err: error, payment_id: saved.id },
      'enqueue expiry payment gagal; J-06 akan menyapu',
    )
  }
  return saved
}

export async function createManualPayment(
  ctx: PaymentsServiceContext,
  input: CreateManualPaymentInput,
): Promise<PaymentRow> {
  if (!ctx.actor || (ctx.actor.role !== 'staff' && ctx.actor.role !== 'admin'))
    throw err.forbidden()
  const paidAt = input.paid_at ? new Date(input.paid_at) : ctx.now
  if (paidAt > ctx.now || paidAt < addMinutes(ctx.now, -30 * 24 * 60)) {
    throw err.validation({ field: 'paid_at' }, 'paid_at maksimal 30 hari ke belakang.')
  }
  if (input.proof_media_id && !(await findReadyPaymentProof(ctx.db, input.proof_media_id))) {
    throw err.of(ERROR_CODE.MEDIA_NOT_UPLOADED)
  }
  return withTransaction(
    ctx.db,
    async (scope) => {
      await lockBookingPayment(scope.tx, input.booking_id)
      const payable = await findBookingPayable(scope.tx, input.booking_id)
      if (!payable) throw err.notFound('Booking tidak ditemukan.')
      if (payable.booking.status === 'confirmed') throw err.of(ERROR_CODE.BOOKING_ALREADY_PAID)
      if (payable.booking.status !== 'pending_payment')
        throw err.conflict('Booking tidak dapat dibayar.')
      if (input.amount !== payable.booking.totalAmount)
        throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
      await cancelPendingBookingPayments(scope.tx, { bookingId: input.booking_id, now: ctx.now })
      const payment = await insertPayment(scope.tx, {
        paymentCode: await nextPaymentCode(scope.tx, ctx.now),
        provider: 'manual',
        bookingId: input.booking_id,
        payerUserId: payable.booking.customerUserId,
        amount: input.amount,
        method: input.method,
        status: 'pending',
        providerOrderId: null,
        expiresAt: null,
        paidAt: null,
        recordedByUserId: ctx.actor?.userId ?? null,
        idempotencyKey: ctx.idempotencyKey ?? null,
        providerMeta: input.proof_media_id ? { proof_media_id: input.proof_media_id } : undefined,
        now: ctx.now,
      })
      const paid = await markPaidInScope(ctx, scope, {
        payment,
        method: input.method,
        providerTransactionId: null,
        paidAt,
        providerMeta: input.proof_media_id ? { proof_media_id: input.proof_media_id } : null,
      })
      if (!paid) throw err.internal()
      await writeAuditLog(scope.tx, {
        actorUserId: ctx.actor?.userId,
        actorRole: ctx.actor?.role,
        action: 'payment.manual_record',
        entityType: 'payment',
        entityId: paid.id,
        before: undefined,
        after: { booking_id: input.booking_id, amount: input.amount, method: input.method },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
      })
      return paid
    },
    { logger: ctx.logger },
  )
}

export async function getPayment(
  ctx: PaymentsServiceContext,
  paymentId: string,
): Promise<PaymentRow> {
  const payment = await findPayment(ctx.db, paymentId)
  if (!payment) throw err.notFound('Payment tidak ditemukan.')
  assertBookingAccess(ctx, payment)
  return payment
}

export async function getPayments(
  ctx: PaymentsServiceContext,
  query: PaymentsQuery,
): Promise<{ rows: PaymentRow[]; totalCount: number }> {
  if (!ctx.actor || (ctx.actor.role !== 'staff' && ctx.actor.role !== 'admin'))
    throw err.forbidden()
  const [rows, totalCount] = await Promise.all([
    listPayments(ctx.db, query),
    countPayments(ctx.db, query),
  ])
  return { rows, totalCount }
}

export async function cancelPayment(
  ctx: PaymentsServiceContext,
  paymentId: string,
): Promise<PaymentRow> {
  const payment = await getPayment(ctx, paymentId)
  if (payment.status !== 'pending') throw err.of(ERROR_CODE.PAYMENT_NOT_PENDING)
  return withTransaction(ctx.db, async ({ tx }) => {
    const transitioned = await transitionPendingPayment(tx, {
      paymentId,
      status: 'cancelled',
      method: payment.method,
      providerTransactionId: payment.providerTransactionId,
      failureReason: 'cancelled_by_user',
      needsManualReview: false,
      providerMeta:
        typeof payment.providerMeta === 'object' && payment.providerMeta
          ? (payment.providerMeta as Record<string, unknown>)
          : {},
      now: ctx.now,
    })
    if (!transitioned) throw err.of(ERROR_CODE.PAYMENT_NOT_PENDING)
    return transitioned
  })
}

async function applyProviderStatus(
  ctx: PaymentsServiceContext,
  scope: TransactionScope,
  payment: PaymentRow,
  status: ProviderTransactionStatus,
): Promise<PaymentRow> {
  if (status.gross_amount !== payment.amount) throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
  const mapped = mapMidtransStatus({
    transactionStatus: status.status,
    fraudStatus: status.fraud_status,
  })
  const transition = applyPaymentTransition(
    {
      status: payment.status,
      needsManualReview: payment.needsManualReview,
      failureReason: payment.failureReason,
    },
    mapped,
    'provider_settlement',
  )
  if (!transition.changed) {
    if (payment.status === 'pending') {
      await updatePendingPaymentReview(scope.tx, {
        paymentId: payment.id,
        needsManualReview: mapped.needsManualReview,
        providerMeta: status.raw,
        now: ctx.now,
      })
    }
    return (await findPayment(scope.tx, payment.id)) ?? payment
  }
  if (mapped.status === 'paid') {
    const paid = await markPaidInScope(ctx, scope, {
      payment,
      method: status.method,
      providerTransactionId: status.provider_transaction_id,
      paidAt: status.paid_at ?? ctx.now,
      providerMeta: status.raw,
    })
    return paid ?? payment
  }
  if (mapped.status === 'pending') return payment
  const terminal = await transitionPendingPayment(scope.tx, {
    paymentId: payment.id,
    status: mapped.status,
    method: status.method,
    providerTransactionId: status.provider_transaction_id,
    failureReason: mapped.failureReason,
    needsManualReview: mapped.needsManualReview,
    providerMeta: status.raw,
    now: ctx.now,
  })
  return terminal ?? payment
}

export async function syncPayment(
  ctx: PaymentsServiceContext,
  paymentId: string,
): Promise<PaymentRow> {
  if (!ctx.actor || (ctx.actor.role !== 'staff' && ctx.actor.role !== 'admin'))
    throw err.forbidden()
  const payment = await findPayment(ctx.db, paymentId)
  if (!payment) throw err.notFound('Payment tidak ditemukan.')
  if (payment.provider !== 'midtrans' || !payment.providerOrderId)
    throw err.of(ERROR_CODE.PAYMENT_METHOD_UNSUPPORTED)
  const provider = await midtransProvider(ctx)
  const status = await provider.getTransactionStatus({ provider_order_id: payment.providerOrderId })
  return withTransaction(
    ctx.db,
    async (scope) => applyProviderStatus(ctx, scope, payment, status),
    { logger: ctx.logger },
  )
}

export async function receiveMidtransWebhook(
  ctx: PaymentsServiceContext,
  input: { rawBody: string; headers: Readonly<Record<string, string | undefined>> },
): Promise<{ providerEventId: string; queued: boolean }> {
  const provider = await midtransProvider(ctx)
  const parsed = provider.parseWebhook(input)
  await insertWebhookEvent(ctx.db, {
    providerEventId: parsed.provider_event_id,
    providerOrderId: parsed.provider_order_id,
    isSignatureValid: parsed.is_signature_valid,
    payload: parsed.raw,
    receivedAt: ctx.now,
  })
  if (!parsed.is_signature_valid) throw err.of(ERROR_CODE.WEBHOOK_SIGNATURE_INVALID)
  try {
    await enqueueJobTo(
      ctx.queues,
      JOB.PAYMENT_PROCESS_WEBHOOK,
      { providerEventId: parsed.provider_event_id },
      { jobId: webhookJobId(parsed.provider_event_id) },
    )
    return { providerEventId: parsed.provider_event_id, queued: true }
  } catch (error) {
    ctx.logger.warn(
      { err: error, provider_event_id: parsed.provider_event_id },
      'event webhook tersimpan tetapi enqueue gagal',
    )
    return { providerEventId: parsed.provider_event_id, queued: false }
  }
}

export function webhookJobId(providerEventId: string): string {
  return `wh-midtrans-${createHash('sha256').update(providerEventId).digest('hex')}`
}

export async function processMidtransWebhook(
  ctx: PaymentsServiceContext,
  providerEventId: string,
): Promise<void> {
  await withTransaction(
    ctx.db,
    async (scope) => {
      const event = await lockWebhookEvent(scope.tx, providerEventId)
      if (!event || event.processedAt) return
      const parsed = readStoredMidtransPayload(event.payload)
      const payment = await findPaymentByProviderOrderId(scope.tx, parsed.provider_order_id)
      if (!payment) {
        await completeWebhookEvent(scope.tx, {
          eventId: event.id,
          paymentId: null,
          processError: 'unknown_order',
          now: ctx.now,
        })
        scope.afterCommit(() => {
          ctx.logger.error(
            { provider_event_id: providerEventId },
            'webhook Midtrans memakai order yang tidak dikenal',
          )
        })
        return
      }
      if (parsed.gross_amount !== payment.amount) {
        await completeWebhookEvent(scope.tx, {
          eventId: event.id,
          paymentId: payment.id,
          processError: 'amount_mismatch',
          now: ctx.now,
        })
        scope.afterCommit(() => {
          ctx.logger.error(
            { payment_id: payment.id, provider_event_id: providerEventId },
            'gross amount webhook tidak cocok',
          )
        })
        return
      }
      await applyProviderStatus(ctx, scope, payment, parsed)
      await completeWebhookEvent(scope.tx, {
        eventId: event.id,
        paymentId: payment.id,
        processError: null,
        now: ctx.now,
      })
    },
    { logger: ctx.logger },
  )
}

export async function simulateMidtransWebhook(
  ctx: PaymentsServiceContext,
  input: SimulateWebhookInput,
): Promise<{ providerEventId: string; queued: boolean }> {
  if (ctx.env.APP_ENV !== 'local') throw err.featureDisabled()
  const payment = await findPayment(ctx.db, input.payment_id)
  if (!payment?.providerOrderId) throw err.notFound('Payment Midtrans tidak ditemukan.')
  const gross = `${payment.amount}.00`
  const transactionTime = ctx.now.toISOString().slice(0, 19).replace('T', ' ')
  const statusCode = '200'
  const signature = createHash('sha512')
    .update(`${payment.providerOrderId}${statusCode}${gross}${ctx.env.MIDTRANS_SERVER_KEY}`)
    .digest('hex')
  const rawBody = JSON.stringify({
    order_id: payment.providerOrderId,
    transaction_status: input.transaction_status,
    status_code: statusCode,
    gross_amount: gross,
    transaction_time: transactionTime,
    transaction_id: `sim-${payment.id}`,
    payment_type: 'qris',
    ...(input.fraud_status ? { fraud_status: input.fraud_status } : {}),
    signature_key: signature,
  })
  return receiveMidtransWebhook(ctx, { rawBody, headers: {} })
}

export async function getWebhookEvent(
  ctx: Pick<PaymentsServiceContext, 'db'>,
  providerEventId: string,
): Promise<Awaited<ReturnType<typeof findWebhookEvent>>> {
  return findWebhookEvent(ctx.db, providerEventId)
}

/** J-07 delayed + fallback J-06. Kondisional dan aman diulang. */
export async function expireUnpaidPayment(
  ctx: PaymentsServiceContext,
  paymentId: string,
): Promise<boolean> {
  return withTransaction(
    ctx.db,
    async (scope) => {
      const payment = await findPayment(scope.tx, paymentId)
      if (!payment?.bookingId || payment.status !== 'pending') return false
      const expired = await expirePendingPayment(scope.tx, { paymentId, now: ctx.now })
      if (!expired) return false
      await expirePendingBooking(scope.tx, { bookingId: payment.bookingId, now: ctx.now })
      await releaseBookingSlotsInTransaction(ctx, payment.bookingId, scope)
      await releaseBookingPromo(ctx, payment.bookingId, 'payment_expired', scope)
      return true
    },
    { logger: ctx.logger },
  )
}

/** J-06: rekonsiliasi gateway sekaligus sweeper job durabel. */
export async function reconcilePendingPayments(
  ctx: PaymentsServiceContext,
): Promise<{ reconciled: number; expiryQueued: number; webhooksQueued: number }> {
  const before = new Date(ctx.now.getTime() - 5 * 60_000)
  const [pending, due, webhooks] = await Promise.all([
    listPendingPaymentsForReconciliation(ctx.db, { before, limit: 200 }),
    listDuePendingPayments(ctx.db, { now: ctx.now, limit: 200 }),
    listStuckWebhookEvents(ctx.db, { before, limit: 200 }),
  ])
  const provider = await midtransProvider(ctx)
  let reconciled = 0
  for (const payment of pending) {
    if (!payment.providerOrderId) continue
    try {
      const status = await provider.getTransactionStatus({
        provider_order_id: payment.providerOrderId,
      })
      const updated = await withTransaction(
        ctx.db,
        (scope) => applyProviderStatus(ctx, scope, payment, status),
        {
          logger: ctx.logger,
        },
      )
      if (payment.status !== 'paid' && updated.status === 'paid') {
        incrementMetric('payment_reconcile_fixed_total')
      }
      reconciled += 1
    } catch (error) {
      if (error instanceof ProviderTransactionNotFoundError) {
        if (ctx.now.getTime() - payment.createdAt.getTime() > 24 * 60 * 60_000) {
          await withTransaction(ctx.db, async ({ tx }) => {
            await transitionPendingPayment(tx, {
              paymentId: payment.id,
              status: 'failed',
              method: payment.method,
              providerTransactionId: payment.providerTransactionId,
              failureReason: 'not_found_at_gateway',
              needsManualReview: false,
              providerMeta: {},
              now: ctx.now,
            })
          })
        }
        continue
      }
      ctx.logger.warn(
        { err: error, payment_id: payment.id },
        'rekonsiliasi payment gagal; akan diulang',
      )
    }
  }
  let expiryQueued = 0
  for (const payment of due) {
    await enqueueJobTo(
      ctx.queues,
      JOB.PAYMENT_EXPIRE_UNPAID,
      { paymentId: payment.id },
      { jobId: `expire-${payment.id}` },
    )
    expiryQueued += 1
  }
  let webhooksQueued = 0
  for (const event of webhooks) {
    await enqueueJobTo(
      ctx.queues,
      JOB.PAYMENT_PROCESS_WEBHOOK,
      { providerEventId: event.providerEventId },
      { jobId: webhookJobId(event.providerEventId) },
    )
    webhooksQueued += 1
  }
  return { reconciled, expiryQueued, webhooksQueued }
}
