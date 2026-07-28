/** Orkestrasi inbox, pengiriman email, dan sweeper notifikasi. */
import type { HolaDb } from '@hola/db'
import {
  type CursorPaginationQuery,
  JOB,
  NOTIFICATION_CHANNEL,
  type NotificationChannel,
  TEMPLATE_CODE,
  type TemplateCode,
  toWitaParts,
} from '@hola/shared'
import { enqueueJobTo } from '../../config/queues.ts'
import { err } from '../../lib/errors.ts'
import { buildCursorMeta, cursorFetchLimit, decodeCursor } from '../../lib/pagination.ts'
import type { Tx } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { createPasswordResetToken, findUserById } from '../auth/auth.repository.ts'
import { issueEmailVerificationToken } from '../auth/jwt.ts'
import { createOpaqueToken, hashOpaqueToken } from '../auth/tokens.ts'
import {
  cleanupExpiredTokens,
  createNotification,
  findNotificationForEmail,
  listInAppNotifications,
  listQueuedNotificationsBefore,
  markAllNotificationsRead,
  markNotificationFailed,
  markNotificationRead,
  markNotificationSent,
  markNotificationSkipped,
  type NotificationRow,
} from './notification.repository.ts'

type DbExecutor = HolaDb | Tx
type NotificationDependencies = Pick<CoreDependencies, 'db' | 'env' | 'logger' | 'mail' | 'queues'>

export interface NotificationServiceContext extends NotificationDependencies {
  now: Date
}

type NotificationPayload = Record<string, string | number | boolean | null>

export interface EmailNotificationInput {
  userId: string
  toEmail: string
  templateCode: TemplateCode
  dedupeKey: string
  relatedType?: string | undefined
  relatedId?: string | undefined
  payload?: NotificationPayload | undefined
}

function channelDedupeKey(base: string, channel: NotificationChannel): string {
  // Constraint C-19 belum menyertakan `channel`; suffix membuat satu event
  // tetap dapat memiliki delivery eksternal dan inbox tanpa melonggarkan dedupe.
  return `${base}:${channel}`
}

/**
 * Tulis email dan inbox dalam transaksi pemanggil. URL/token tidak pernah
 * masuk ke PostgreSQL atau payload BullMQ; ia dibuat tepat saat worker mengirim.
 */
export async function writeEmailNotification(
  db: DbExecutor,
  input: EmailNotificationInput,
  now: Date,
): Promise<NotificationRow | null> {
  const payload = input.payload ?? {}
  const email = await createNotification(db, {
    userId: input.userId,
    toEmail: input.toEmail,
    channel: NOTIFICATION_CHANNEL.EMAIL,
    templateCode: input.templateCode,
    payload,
    dedupeKey: channelDedupeKey(input.dedupeKey, NOTIFICATION_CHANNEL.EMAIL),
    status: 'queued',
    sentAt: undefined,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
  })
  await createNotification(db, {
    userId: input.userId,
    toEmail: undefined,
    channel: NOTIFICATION_CHANNEL.INAPP,
    templateCode: input.templateCode,
    payload,
    dedupeKey: channelDedupeKey(input.dedupeKey, NOTIFICATION_CHANNEL.INAPP),
    status: 'sent',
    sentAt: now,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
  })
  return email
}

/** Best-effort setelah commit: J-36 akan memulihkan baris queued yang tertinggal. */
export async function enqueueEmailNotification(
  ctx: Pick<NotificationDependencies, 'queues'>,
  notificationId: string,
): Promise<void> {
  await enqueueJobTo(
    ctx.queues,
    JOB.NOTIFICATION_SEND_EMAIL,
    { notificationId },
    {
      jobId: notificationJobId(notificationId),
    },
  )
}

/** BullMQ v5 melarang `:` pada custom jobId; format tetap deterministik. */
export function notificationJobId(notificationId: string): string {
  return `notif-${notificationId}`
}

export async function createAndEnqueueEmailNotification(
  ctx: Pick<NotificationServiceContext, 'db' | 'queues' | 'logger' | 'now'>,
  input: EmailNotificationInput,
): Promise<void> {
  const notification = await writeEmailNotification(ctx.db, input, ctx.now)
  if (!notification) return
  try {
    await enqueueEmailNotification(ctx, notification.id)
  } catch (error) {
    ctx.logger.warn(
      { err: error, notification_id: notification.id, template_code: input.templateCode },
      'enqueue email gagal; sweeper notifikasi akan mencoba ulang',
    )
  }
}

function appUrl(baseUrl: string, path: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}?token=${encodeURIComponent(token)}`
}

function replaceTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{([a-z_]+)}}/g, (_match, key: string) => variables[key] ?? '')
}

function htmlFromText(text: string, url: string | undefined): string {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  if (!url) return `<p>${escaped}</p>`
  return `<p>${escaped.replace(url, `<a href="${url}">tautan ini</a>`)}</p>`
}

function stringPayload(payload: unknown): Record<string, string> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return {}
  return Object.fromEntries(
    Object.entries(payload).flatMap(([key, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? [[key, String(value)]]
        : [],
    ),
  )
}

async function mailVariables(
  ctx: NotificationServiceContext,
  notification: NotificationRow,
): Promise<Record<string, string> | null> {
  const variables = stringPayload(notification.payload)
  const user = await findUserById(ctx.db, notification.userId ?? '')
  if (!user?.email || user.email !== notification.toEmail) return null

  if (notification.templateCode === TEMPLATE_CODE.AUTH_EMAIL_VERIFY) {
    variables.url = appUrl(
      ctx.env.WEB_BASE_URL,
      '/verify-email',
      await issueEmailVerificationToken({ id: user.id, email: user.email }, ctx.env),
    )
  }
  if (notification.templateCode === TEMPLATE_CODE.AUTH_PASSWORD_RESET) {
    if (user.status !== 'active' || user.emailVerifiedAt === null) return null
    const token = createOpaqueToken()
    await createPasswordResetToken(ctx.db, {
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(ctx.now.getTime() + 60 * 60 * 1000),
      ipAddress: undefined,
    })
    variables.url = appUrl(ctx.env.WEB_BASE_URL, '/reset-password', token)
  }
  return variables
}

/** J-25: kirim satu email queued, aman dipanggil ulang setelah retry. */
export async function sendQueuedEmail(
  ctx: NotificationServiceContext,
  notificationId: string,
): Promise<void> {
  const row = await findNotificationForEmail(ctx.db, notificationId)
  if (row?.notification.status !== 'queued' || !row.notification.toEmail) return
  const variables = await mailVariables(ctx, row.notification)
  if (!variables) {
    await markNotificationSkipped(ctx.db, notificationId, ctx.now)
    return
  }
  const subject = replaceTemplate(row.subjectTemplate ?? 'Notifikasi Hola', variables)
  const text = replaceTemplate(row.bodyTemplate, variables)
  await ctx.mail.send({
    to: row.notification.toEmail,
    subject,
    text,
    html: htmlFromText(text, variables.url),
  })
  await markNotificationSent(ctx.db, notificationId, ctx.now)
}

export async function recordEmailDeliveryFailure(
  ctx: NotificationServiceContext,
  notificationId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'provider email menolak pengiriman'
  await markNotificationFailed(ctx.db, notificationId, message, ctx.now)
}

/** J-36: antrikan lagi baris queued yang mungkin hilang saat Redis ter-flush. */
export async function retryStuckNotifications(ctx: NotificationServiceContext): Promise<void> {
  const before = new Date(ctx.now.getTime() - 5 * 60 * 1000)
  const stuck = await listQueuedNotificationsBefore(ctx.db, before, 100)
  for (const notification of stuck) {
    if (notification.channel === NOTIFICATION_CHANNEL.EMAIL) {
      try {
        await enqueueEmailNotification(ctx, notification.id)
      } catch (error) {
        ctx.logger.warn(
          { err: error, notification_id: notification.id },
          'sweeper gagal enqueue email',
        )
      }
    }
  }
}

/** J-31, termasuk reset password dan OTP yang memang dikontrak untuk dibersihkan. */
export async function removeExpiredTokens(
  ctx: Pick<NotificationServiceContext, 'db' | 'now'>,
): Promise<void> {
  await cleanupExpiredTokens(ctx.db, ctx.now)
}

/** Quiet hours hanya berlaku untuk push non-transaksional (02 § 7 aturan 4). */
export function nextPushDeliveryAt(now: Date, isTransactional: boolean): Date | undefined {
  if (isTransactional) return undefined
  const wita = toWitaParts(now)
  if (wita.hour >= 7 && wita.hour < 22) return undefined
  const date = new Date(Date.UTC(wita.year, wita.month - 1, wita.day, 7 - 8, 0, 0))
  if (wita.hour >= 22) date.setUTCDate(date.getUTCDate() + 1)
  return date
}

export async function listMyNotifications(
  ctx: Pick<NotificationServiceContext, 'db'>,
  userId: string,
  query: CursorPaginationQuery,
): Promise<{
  rows: NotificationRow[]
  pagination: ReturnType<typeof buildCursorMeta<NotificationRow>>['pagination']
}> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined
  const createdAt = cursor?.k[0]
  if (cursor && typeof createdAt !== 'string')
    throw err.validation({ cursor: 'Cursor tidak valid' })
  const rows = await listInAppNotifications(ctx.db, {
    userId,
    limit: cursorFetchLimit(query),
    cursor:
      cursor && typeof createdAt === 'string'
        ? { createdAt: new Date(createdAt), id: cursor.id }
        : undefined,
  })
  return buildCursorMeta(rows, query, (row) => ({ k: [row.createdAt.toISOString()], id: row.id }))
}

export async function readMyNotification(
  ctx: Pick<NotificationServiceContext, 'db' | 'now'>,
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!(await markNotificationRead(ctx.db, { notificationId, userId, now: ctx.now })))
    throw err.notFound()
}

export async function readAllMyNotifications(
  ctx: Pick<NotificationServiceContext, 'db' | 'now'>,
  userId: string,
): Promise<void> {
  await markAllNotificationsRead(ctx.db, { userId, now: ctx.now })
}
