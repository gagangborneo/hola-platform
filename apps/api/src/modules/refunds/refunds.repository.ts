import { financeEvents, type HolaDb, mediaFiles, payments, refunds, users } from '@hola/db'
import { FINANCE_SOURCE_TYPE, type RefundChannel, type RefundStatus } from '@hola/shared'
import { and, asc, count, desc, eq, inArray, type SQL, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type { RefundsQuery } from './refunds.schema.ts'

type DbExecutor = HolaDb | Tx
export type RefundRow = typeof refunds.$inferSelect
export type LockedRefundPayment = typeof payments.$inferSelect

export async function lockRefundPayment(
  tx: Tx,
  paymentId: string,
): Promise<LockedRefundPayment | null> {
  const [row] = await tx
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1)
    .for('update')
  return row ?? null
}

export async function activeRefundAmount(tx: Tx, paymentId: string): Promise<number> {
  const [row] = await tx
    .select({ amount: sql<number>`coalesce(sum(${refunds.amount}), 0)::int` })
    .from(refunds)
    .where(
      and(
        eq(refunds.paymentId, paymentId),
        inArray(refunds.status, ['approved', 'processing', 'completed']),
      ),
    )
  return row?.amount ?? 0
}

export async function insertRefund(
  tx: Tx,
  input: {
    refundCode: string
    paymentId: string
    amount: number
    status: 'requested' | 'approved'
    channel: RefundChannel
    reason: string
    policyApplied: string
    requestedByUserId: string | null
    approvedByUserId: string | null
    destinationBankName?: string | undefined
    destinationAccountNumber?: string | undefined
    destinationAccountName?: string | undefined
    now: Date
  },
): Promise<RefundRow> {
  const [row] = await tx
    .insert(refunds)
    .values({
      refundCode: input.refundCode,
      paymentId: input.paymentId,
      amount: input.amount,
      status: input.status,
      channel: input.channel,
      reason: input.reason,
      policyApplied: input.policyApplied,
      requestedByUserId: input.requestedByUserId,
      approvedByUserId: input.approvedByUserId,
      approvedAt: input.status === 'approved' ? input.now : null,
      destinationBankName: input.destinationBankName,
      destinationAccountNumber: input.destinationAccountNumber,
      destinationAccountName: input.destinationAccountName,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning()
  if (!row) throw new Error('INSERT refunds tidak mengembalikan baris')
  return row
}

export async function markPaymentRefundPending(
  tx: Tx,
  input: { paymentId: string; now: Date },
): Promise<void> {
  await tx
    .update(payments)
    .set({
      refundStatus: sql`CASE WHEN ${payments.refundStatus} = 'none' THEN 'pending'::payment_refund_status ELSE ${payments.refundStatus} END`,
      updatedAt: input.now,
    })
    .where(eq(payments.id, input.paymentId))
}

export async function findRefund(db: DbExecutor, id: string): Promise<RefundRow | null> {
  const [row] = await db.select().from(refunds).where(eq(refunds.id, id)).limit(1)
  return row ?? null
}

export async function findRefundWithPayment(
  db: DbExecutor,
  id: string,
): Promise<{ refund: RefundRow; payment: LockedRefundPayment } | null> {
  const [row] = await db
    .select({ refund: refunds, payment: payments })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .where(eq(refunds.id, id))
    .limit(1)
  return row ?? null
}

function where(query: RefundsQuery): SQL | undefined {
  return and(
    ...(query.status ? [eq(refunds.status, query.status)] : []),
    ...(query.payment_id ? [eq(refunds.paymentId, query.payment_id)] : []),
  )
}

export async function listRefunds(db: HolaDb, query: RefundsQuery): Promise<RefundRow[]> {
  return db
    .select()
    .from(refunds)
    .where(where(query))
    .orderBy(desc(refunds.createdAt), desc(refunds.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countRefunds(db: HolaDb, query: RefundsQuery): Promise<number> {
  const [row] = await db.select({ value: count() }).from(refunds).where(where(query))
  return row?.value ?? 0
}

export async function listCustomerRefunds(
  db: HolaDb,
  query: RefundsQuery,
  userId: string,
): Promise<RefundRow[]> {
  return db
    .select({ refund: refunds })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .where(and(where(query), eq(payments.payerUserId, userId)))
    .orderBy(desc(refunds.createdAt), desc(refunds.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
    .then((rows) => rows.map((row) => row.refund))
}

export async function countCustomerRefunds(
  db: HolaDb,
  query: RefundsQuery,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .where(and(where(query), eq(payments.payerUserId, userId)))
  return row?.value ?? 0
}

export async function transitionRefund(
  tx: Tx,
  input: {
    id: string
    from: readonly RefundStatus[]
    to: RefundStatus
    now: Date
    approvedByUserId?: string | undefined
    failureReason?: string | null | undefined
    proofMediaId?: string | undefined
  },
): Promise<RefundRow | null> {
  const current = await findRefund(tx, input.id)
  const meta =
    current?.providerMeta && typeof current.providerMeta === 'object'
      ? (current.providerMeta as Record<string, unknown>)
      : {}
  const [row] = await tx
    .update(refunds)
    .set({
      status: input.to,
      updatedAt: input.now,
      ...(input.approvedByUserId
        ? { approvedByUserId: input.approvedByUserId, approvedAt: input.now }
        : {}),
      ...(input.failureReason !== undefined ? { failureReason: input.failureReason } : {}),
      ...(input.to === 'completed' ? { completedAt: input.now } : {}),
      ...(input.proofMediaId
        ? { providerMeta: { ...meta, proof_media_id: input.proofMediaId } }
        : {}),
    })
    .where(and(eq(refunds.id, input.id), inArray(refunds.status, [...input.from])))
    .returning()
  return row ?? null
}

export async function updateRefundDestination(
  tx: Tx,
  input: { id: string; bankName: string; accountNumber: string; accountName: string; now: Date },
): Promise<RefundRow | null> {
  const [row] = await tx
    .update(refunds)
    .set({
      destinationBankName: input.bankName,
      destinationAccountNumber: input.accountNumber,
      destinationAccountName: input.accountName,
      updatedAt: input.now,
    })
    .where(
      and(eq(refunds.id, input.id), inArray(refunds.status, ['requested', 'approved', 'failed'])),
    )
    .returning()
  return row ?? null
}

export async function completePaymentRefund(
  tx: Tx,
  input: { paymentId: string; amount: number; fullThreshold: number; now: Date },
): Promise<void> {
  await tx
    .update(payments)
    .set({
      refundedAmount: sql`${payments.refundedAmount} + ${input.amount}`,
      refundStatus: sql`CASE WHEN ${payments.refundedAmount} + ${input.amount} >= ${input.fullThreshold} THEN 'full'::payment_refund_status ELSE 'partial'::payment_refund_status END`,
      updatedAt: input.now,
    })
    .where(eq(payments.id, input.paymentId))
}

export async function insertRefundFinanceEvent(
  tx: Tx,
  input: { refund: RefundRow; kind: 'refund_accrual' | 'refund_settlement'; now: Date },
): Promise<void> {
  await tx
    .insert(financeEvents)
    .values({
      sourceType: FINANCE_SOURCE_TYPE.REFUND,
      sourceId: input.refund.id,
      kind: input.kind,
      payload: {
        refund_id: input.refund.id,
        refund_code: input.refund.refundCode,
        payment_id: input.refund.paymentId,
        amount: input.refund.amount,
        channel: input.refund.channel,
      },
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing({
      target: [financeEvents.sourceType, financeEvents.sourceId, financeEvents.kind],
    })
}

export async function findReadyRefundProof(db: DbExecutor, mediaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: mediaFiles.id })
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.status, 'ready')))
    .limit(1)
  return row !== undefined
}

export async function listApprovedRefunds(db: HolaDb, limit: number): Promise<RefundRow[]> {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.status, 'approved'))
    .orderBy(asc(refunds.createdAt), asc(refunds.id))
    .limit(limit)
}

export async function findPaymentRecipient(
  db: DbExecutor,
  paymentId: string,
): Promise<{ userId: string; email: string | null; fullName: string } | null> {
  const [row] = await db
    .select({ userId: users.id, email: users.email, fullName: users.fullName })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.payerUserId))
    .where(eq(payments.id, paymentId))
    .limit(1)
  return row ?? null
}

export async function listActiveAdminIds(db: DbExecutor): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.status, 'active')))
  return rows.map((row) => row.id)
}
