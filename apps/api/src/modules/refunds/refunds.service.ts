import { ERROR_CODE, JOB, type RefundChannel, TEMPLATE_CODE } from '@hola/shared'
import { enqueueJobTo } from '../../config/queues.ts'
import { nextRefundCode } from '../../lib/codes.ts'
import { err } from '../../lib/errors.ts'
import { type TransactionScope, withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { createNotification } from '../notifications/notification.repository.ts'
import {
  enqueueEmailNotification,
  writeEmailNotification,
} from '../notifications/notification.service.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  activeRefundAmount,
  completePaymentRefund,
  countCustomerRefunds,
  countRefunds,
  findPaymentRecipient,
  findReadyRefundProof,
  findRefund,
  findRefundWithPayment,
  insertRefund,
  insertRefundFinanceEvent,
  listActiveAdminIds,
  listCustomerRefunds,
  listRefunds,
  lockRefundPayment,
  markPaymentRefundPending,
  type RefundRow,
  transitionRefund,
  updateRefundDestination,
} from './refunds.repository.ts'
import type {
  ApproveRefundInput,
  CreateRefundInput,
  MarkRefundCompletedInput,
  RefundsQuery,
} from './refunds.schema.ts'

export type RefundsServiceContext = Pick<CoreDependencies, 'db' | 'logger' | 'queues'> & {
  now: Date
  actor?: Viewer | undefined
  requestId?: string | undefined
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

function audit(ctx: RefundsServiceContext) {
  return {
    actorUserId: ctx.actor?.userId,
    actorRole: ctx.actor?.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

/** Snapshot audit sengaja tidak pernah memuat rekening tujuan atau provider_meta. */
function refundAuditSnapshot(refund: RefundRow): Record<string, unknown> {
  return {
    id: refund.id,
    refund_code: refund.refundCode,
    payment_id: refund.paymentId,
    amount: refund.amount,
    status: refund.status,
    channel: refund.channel,
    reason: refund.reason,
    policy_applied: refund.policyApplied,
    approved_at: refund.approvedAt?.toISOString() ?? null,
    completed_at: refund.completedAt?.toISOString() ?? null,
    failure_reason: refund.failureReason,
  }
}

async function enqueueRefund(ctx: RefundsServiceContext, refundId: string): Promise<void> {
  await enqueueJobTo(
    ctx.queues,
    JOB.PAYMENT_PROCESS_REFUND,
    { refundId },
    { jobId: `refund-${refundId}` },
  )
}

export async function createRefundInScope(
  ctx: RefundsServiceContext,
  scope: TransactionScope,
  input: {
    paymentId: string
    amount: number
    reason: string
    policyApplied: string
    channel: RefundChannel
    automatic: boolean
    requestedByUserId?: string | undefined
    destinationBankName?: string | undefined
    destinationAccountNumber?: string | undefined
    destinationAccountName?: string | undefined
  },
): Promise<RefundRow> {
  const payment = await lockRefundPayment(scope.tx, input.paymentId)
  if (payment?.status !== 'paid') throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
  const allocated = await activeRefundAmount(scope.tx, payment.id)
  if (allocated + input.amount > payment.amount) {
    throw err.of(ERROR_CODE.REFUND_AMOUNT_EXCEEDS_PAYMENT)
  }
  const refund = await insertRefund(scope.tx, {
    refundCode: await nextRefundCode(scope.tx, ctx.now),
    paymentId: payment.id,
    amount: input.amount,
    status: input.automatic ? 'approved' : 'requested',
    channel: input.channel,
    reason: input.reason,
    policyApplied: input.policyApplied,
    requestedByUserId: input.requestedByUserId ?? ctx.actor?.userId ?? null,
    approvedByUserId: input.automatic ? null : null,
    destinationBankName: input.destinationBankName,
    destinationAccountNumber: input.destinationAccountNumber,
    destinationAccountName: input.destinationAccountName,
    now: ctx.now,
  })
  await markPaymentRefundPending(scope.tx, { paymentId: payment.id, now: ctx.now })
  await writeAuditLog(scope.tx, {
    ...audit(ctx),
    action: input.automatic ? 'refund.auto_approved' : 'refund.requested',
    entityType: 'refund',
    entityId: refund.id,
    before: undefined,
    after: refundAuditSnapshot(refund),
  })
  if (input.automatic) {
    await insertRefundFinanceEvent(scope.tx, { refund, kind: 'refund_accrual', now: ctx.now })
    scope.afterCommit(() => enqueueRefund(ctx, refund.id))
    const recipient = await findPaymentRecipient(scope.tx, payment.id)
    if (recipient?.email) {
      const notification = await writeEmailNotification(
        scope.tx,
        {
          userId: recipient.userId,
          toEmail: recipient.email,
          templateCode: TEMPLATE_CODE.PAYMENT_REFUND_AUTO_CREATED,
          dedupeKey: `refund:${refund.id}:auto-created`,
          relatedType: 'refund',
          relatedId: refund.id,
          payload: { refund_code: refund.refundCode, amount: refund.amount },
        },
        ctx.now,
      )
      if (notification) scope.afterCommit(() => enqueueEmailNotification(ctx, notification.id))
    }
  }
  return refund
}

export async function createRefundRequest(
  ctx: RefundsServiceContext,
  input: CreateRefundInput,
): Promise<RefundRow> {
  if (!ctx.actor || (ctx.actor.role !== 'staff' && ctx.actor.role !== 'admin'))
    throw err.forbidden()
  return withTransaction(
    ctx.db,
    (scope) =>
      createRefundInScope(ctx, scope, {
        paymentId: input.payment_id,
        amount: input.amount,
        reason: input.reason,
        policyApplied: 'manual_admin',
        channel: input.channel,
        automatic: false,
        destinationBankName: input.destination_bank_name,
        destinationAccountNumber: input.destination_account_number,
        destinationAccountName: input.destination_account_name,
      }),
    { logger: ctx.logger },
  )
}

export async function getRefund(ctx: RefundsServiceContext, id: string): Promise<RefundRow> {
  const found = await findRefundWithPayment(ctx.db, id)
  if (!found) throw err.notFound('Refund tidak ditemukan.')
  if (ctx.actor?.role === 'customer' && found.payment.payerUserId !== ctx.actor.userId)
    throw err.notFound()
  return found.refund
}

export async function getRefunds(
  ctx: RefundsServiceContext,
  query: RefundsQuery,
): Promise<{ rows: RefundRow[]; totalCount: number }> {
  if (!ctx.actor) throw err.unauthenticated()
  if (ctx.actor.role === 'customer') {
    const [rows, totalCount] = await Promise.all([
      listCustomerRefunds(ctx.db, query, ctx.actor.userId),
      countCustomerRefunds(ctx.db, query, ctx.actor.userId),
    ])
    return { rows, totalCount }
  }
  const [rows, totalCount] = await Promise.all([
    listRefunds(ctx.db, query),
    countRefunds(ctx.db, query),
  ])
  return { rows, totalCount }
}

export async function approveRefund(
  ctx: RefundsServiceContext,
  id: string,
  input: ApproveRefundInput = {},
): Promise<RefundRow> {
  if (ctx.actor?.role !== 'admin') throw err.forbidden()
  const actor = ctx.actor
  return withTransaction(
    ctx.db,
    async (scope) => {
      let before = await findRefund(scope.tx, id)
      if (!before) throw err.notFound('Refund tidak ditemukan.')
      if (
        input.destination_bank_name &&
        input.destination_account_number &&
        input.destination_account_name
      ) {
        before = await updateRefundDestination(scope.tx, {
          id,
          bankName: input.destination_bank_name,
          accountNumber: input.destination_account_number,
          accountName: input.destination_account_name,
          now: ctx.now,
        })
        if (!before) throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      }
      const payment = await lockRefundPayment(scope.tx, before.paymentId)
      if (payment?.status !== 'paid') throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      const allocated = await activeRefundAmount(scope.tx, before.paymentId)
      const alreadyAllocated = before.status === 'approved' ? allocated - before.amount : allocated
      if (alreadyAllocated + before.amount > payment.amount) {
        throw err.of(ERROR_CODE.REFUND_AMOUNT_EXCEEDS_PAYMENT)
      }
      if (
        before.channel === 'manual_transfer' &&
        (!before.destinationBankName ||
          !before.destinationAccountNumber ||
          !before.destinationAccountName)
      ) {
        throw err.validation(
          { field: 'destination_bank' },
          'Rekening tujuan wajib lengkap sebelum refund diproses.',
        )
      }
      const updated = await transitionRefund(scope.tx, {
        id,
        from: ['requested', 'failed', 'approved'],
        to: 'approved',
        approvedByUserId: actor.userId,
        failureReason: null,
        now: ctx.now,
      })
      if (!updated) throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      await insertRefundFinanceEvent(scope.tx, {
        refund: updated,
        kind: 'refund_accrual',
        now: ctx.now,
      })
      await writeAuditLog(scope.tx, {
        ...audit(ctx),
        action: 'refund.approved',
        entityType: 'refund',
        entityId: id,
        before: refundAuditSnapshot(before),
        after: refundAuditSnapshot(updated),
      })
      scope.afterCommit(() => enqueueRefund(ctx, id))
      return updated
    },
    { logger: ctx.logger },
  )
}

export async function rejectRefund(
  ctx: RefundsServiceContext,
  id: string,
  reason: string,
): Promise<RefundRow> {
  if (ctx.actor?.role !== 'admin') throw err.forbidden()
  return withTransaction(
    ctx.db,
    async (scope) => {
      const before = await findRefund(scope.tx, id)
      if (!before) throw err.notFound('Refund tidak ditemukan.')
      const updated = await transitionRefund(scope.tx, {
        id,
        from: ['requested'],
        to: 'rejected',
        failureReason: reason,
        now: ctx.now,
      })
      if (!updated) throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      await writeAuditLog(scope.tx, {
        ...audit(ctx),
        action: 'refund.rejected',
        entityType: 'refund',
        entityId: id,
        before: refundAuditSnapshot(before),
        after: refundAuditSnapshot(updated),
      })
      return updated
    },
    { logger: ctx.logger },
  )
}

export async function processManualRefund(
  ctx: RefundsServiceContext,
  id: string,
): Promise<RefundRow | null> {
  return withTransaction(
    ctx.db,
    async (scope) => {
      const before = await findRefund(scope.tx, id)
      if (before?.status !== 'approved') return null
      if (
        before.channel === 'manual_transfer' &&
        (!before.destinationBankName ||
          !before.destinationAccountNumber ||
          !before.destinationAccountName)
      ) {
        for (const adminId of await listActiveAdminIds(scope.tx)) {
          await createNotification(scope.tx, {
            userId: adminId,
            toEmail: undefined,
            channel: 'inapp',
            templateCode: TEMPLATE_CODE.PAYMENT_REFUND_REQUIRED,
            payload: { refund_code: before.refundCode, amount: before.amount },
            dedupeKey: `refund:${id}:manual-task:inapp`,
            status: 'sent',
            sentAt: ctx.now,
            relatedType: 'refund',
            relatedId: id,
          })
        }
        return before
      }
      const updated = await transitionRefund(scope.tx, {
        id,
        from: ['approved'],
        to: 'processing',
        now: ctx.now,
      })
      if (!updated) return null
      await writeAuditLog(scope.tx, {
        actorUserId: undefined,
        actorRole: undefined,
        action: 'refund.processing',
        entityType: 'refund',
        entityId: id,
        before: refundAuditSnapshot(before),
        after: refundAuditSnapshot(updated),
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
      })
      for (const adminId of await listActiveAdminIds(scope.tx)) {
        await createNotification(scope.tx, {
          userId: adminId,
          toEmail: undefined,
          channel: 'inapp',
          templateCode: TEMPLATE_CODE.PAYMENT_REFUND_REQUIRED,
          payload: { refund_code: updated.refundCode, amount: updated.amount },
          dedupeKey: `refund:${id}:manual-task:inapp`,
          status: 'sent',
          sentAt: ctx.now,
          relatedType: 'refund',
          relatedId: id,
        })
      }
      return updated
    },
    { logger: ctx.logger },
  )
}

export async function markRefundCompleted(
  ctx: RefundsServiceContext,
  id: string,
  input: MarkRefundCompletedInput,
): Promise<RefundRow> {
  if (!ctx.actor || (ctx.actor.role !== 'staff' && ctx.actor.role !== 'admin'))
    throw err.forbidden()
  if (input.proof_media_id && !(await findReadyRefundProof(ctx.db, input.proof_media_id)))
    throw err.of(ERROR_CODE.MEDIA_NOT_UPLOADED)
  return withTransaction(
    ctx.db,
    async (scope) => {
      const before = await findRefund(scope.tx, id)
      if (!before) throw err.notFound('Refund tidak ditemukan.')
      if (before.channel !== 'manual_transfer' && before.channel !== 'cash')
        throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      if (before.status === 'completed') throw err.of(ERROR_CODE.REFUND_ALREADY_COMPLETED)
      const updated = await transitionRefund(scope.tx, {
        id,
        from: ['processing'],
        to: 'completed',
        proofMediaId: input.proof_media_id,
        now: ctx.now,
      })
      if (!updated) throw err.of(ERROR_CODE.REFUND_NOT_ALLOWED)
      const payment = await lockRefundPayment(scope.tx, updated.paymentId)
      if (!payment) throw err.internal()
      await completePaymentRefund(scope.tx, {
        paymentId: updated.paymentId,
        amount: updated.amount,
        fullThreshold:
          updated.policyApplied === 'option_b_100_percent_minus_gateway_fee'
            ? Math.max(0, payment.amount - payment.gatewayFeeAmount)
            : payment.amount,
        now: ctx.now,
      })
      await insertRefundFinanceEvent(scope.tx, {
        refund: updated,
        kind: 'refund_settlement',
        now: ctx.now,
      })
      await writeAuditLog(scope.tx, {
        ...audit(ctx),
        action: 'refund.completed',
        entityType: 'refund',
        entityId: id,
        before: refundAuditSnapshot(before),
        after: refundAuditSnapshot(updated),
      })
      const recipient = await findPaymentRecipient(scope.tx, updated.paymentId)
      const notification = recipient?.email
        ? await writeEmailNotification(
            scope.tx,
            {
              userId: recipient.userId,
              toEmail: recipient.email,
              templateCode: TEMPLATE_CODE.PAYMENT_REFUND_COMPLETED,
              dedupeKey: `refund:${id}:completed`,
              relatedType: 'refund',
              relatedId: id,
              payload: { refund_code: updated.refundCode, amount: updated.amount },
            },
            ctx.now,
          )
        : null
      if (notification) scope.afterCommit(() => enqueueEmailNotification(ctx, notification.id))
      return updated
    },
    { logger: ctx.logger },
  )
}
