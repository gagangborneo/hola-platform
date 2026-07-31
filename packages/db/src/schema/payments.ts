/** Entitas payment dan refund. Sumber kebenaran: docs/03-DATA-MODEL.md § 9. */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { money, pkId, timestamps, tstz } from '../columns.ts'
import { bookings } from './bookings.ts'
import {
  paymentMethodEnum,
  paymentProviderEnum,
  paymentRefundStatusEnum,
  paymentStatusEnum,
  refundChannelEnum,
  refundStatusEnum,
} from './enums.ts'
import { users } from './identity.ts'

export const payments = pgTable(
  'payments',
  {
    id: pkId(),
    paymentCode: text('payment_code').notNull(),
    provider: paymentProviderEnum('provider').notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id),
    /** FK ditambahkan pada Phase 2 bersama event registrations. */
    eventRegistrationId: uuid('event_registration_id'),
    /** FK ditambahkan pada Phase 4 bersama tournament registrations. */
    tournamentRegistrationId: uuid('tournament_registration_id'),
    /** FK ditambahkan pada Phase 2 bersama cafe invoices. */
    cafeInvoiceId: uuid('cafe_invoice_id'),
    payerUserId: uuid('payer_user_id').references(() => users.id, { onDelete: 'set null' }),
    amount: money('amount').notNull(),
    method: paymentMethodEnum('method'),
    status: paymentStatusEnum('status').notNull(),
    refundStatus: paymentRefundStatusEnum('refund_status').notNull().default('none'),
    refundedAmount: money('refunded_amount').notNull().default(0),
    providerOrderId: text('provider_order_id'),
    providerTransactionId: text('provider_transaction_id'),
    snapToken: text('snap_token'),
    snapRedirectUrl: text('snap_redirect_url'),
    expiresAt: tstz('expires_at'),
    paidAt: tstz('paid_at'),
    failedAt: tstz('failed_at'),
    failureReason: text('failure_reason'),
    gatewayFeeAmount: money('gateway_fee_amount').notNull().default(0),
    settledAmount: money('settled_amount').notNull().default(0),
    providerMeta: jsonb('provider_meta'),
    recordedByUserId: uuid('recorded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    idempotencyKey: text('idempotency_key'),
    needsManualReview: boolean('needs_manual_review').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_payments_payment_code').on(t.paymentCode),
    // C-5 — payment selalu memiliki tepat satu payable.
    check(
      'ck_payments_single_payable',
      sql`((${t.bookingId} IS NOT NULL)::integer + (${t.eventRegistrationId} IS NOT NULL)::integer + (${t.tournamentRegistrationId} IS NOT NULL)::integer + (${t.cafeInvoiceId} IS NOT NULL)::integer) = 1`,
    ),
    // C-7 — PostgreSQL UNIQUE tetap mengizinkan beberapa NULL.
    uniqueIndex('uq_payments_provider_order_id').on(t.providerOrderId),
    uniqueIndex('uq_payments_idempotency_key')
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    index('idx_payments_status_expires').on(t.status, t.expiresAt),
    index('idx_payments_booking').on(t.bookingId),
    index('idx_payments_cafe_invoice').on(t.cafeInvoiceId),
    index('idx_payments_paid_at').on(t.paidAt).where(sql`${t.status} = 'paid'`),
  ],
)

export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: pkId(),
    provider: paymentProviderEnum('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    providerOrderId: text('provider_order_id'),
    paymentId: uuid('payment_id').references(() => payments.id),
    isSignatureValid: boolean('is_signature_valid').notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: tstz('received_at').notNull(),
    processedAt: tstz('processed_at'),
    processError: text('process_error'),
    attemptCount: integer('attempt_count').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    // C-6 — idempotency webhook yang durabel.
    uniqueIndex('uq_payment_webhook_events_provider_event').on(t.provider, t.providerEventId),
    index('idx_payment_webhook_events_payment').on(t.paymentId),
  ],
)

export const refunds = pgTable(
  'refunds',
  {
    id: pkId(),
    refundCode: text('refund_code').notNull(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    amount: money('amount').notNull(),
    status: refundStatusEnum('status').notNull(),
    channel: refundChannelEnum('channel').notNull(),
    reason: text('reason').notNull(),
    policyApplied: text('policy_applied').notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: tstz('approved_at'),
    providerRefundId: text('provider_refund_id'),
    providerMeta: jsonb('provider_meta'),
    completedAt: tstz('completed_at'),
    failureReason: text('failure_reason'),
    destinationBankName: text('destination_bank_name'),
    destinationAccountNumber: text('destination_account_number'),
    destinationAccountName: text('destination_account_name'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_refunds_refund_code').on(t.refundCode),
    check('ck_refunds_amount_positive', sql`${t.amount} > 0`),
    index('idx_refunds_payment').on(t.paymentId),
  ],
)
