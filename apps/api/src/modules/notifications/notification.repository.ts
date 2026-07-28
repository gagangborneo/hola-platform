/** Query notifikasi. Aturan pengiriman berada di notification.service.ts. */
import {
  type HolaDb,
  notifications,
  notificationTemplates,
  otpChallenges,
  passwordResetTokens,
  refreshTokens,
} from '@hola/db'
import { and, asc, desc, eq, isNull, lt, or } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx
export type NotificationRow = typeof notifications.$inferSelect

export async function createNotification(
  db: DbExecutor,
  input: {
    userId: string | undefined
    toEmail: string | undefined
    channel: 'email' | 'push' | 'whatsapp' | 'inapp'
    templateCode: string
    payload: Record<string, string | number | boolean | null>
    dedupeKey: string
    status: 'queued' | 'sent' | 'failed' | 'skipped'
    sentAt: Date | undefined
    relatedType: string | undefined
    relatedId: string | undefined
  },
): Promise<NotificationRow | null> {
  const [row] = await db
    .insert(notifications)
    .values({
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.toEmail ? { toEmail: input.toEmail } : {}),
      channel: input.channel,
      templateCode: input.templateCode,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      status: input.status,
      ...(input.sentAt ? { sentAt: input.sentAt } : {}),
      ...(input.relatedType ? { relatedType: input.relatedType } : {}),
      ...(input.relatedId ? { relatedId: input.relatedId } : {}),
    })
    .onConflictDoNothing()
    .returning()
  return row ?? null
}

export async function findNotificationForEmail(
  db: DbExecutor,
  notificationId: string,
): Promise<{
  notification: NotificationRow
  subjectTemplate: string | null
  bodyTemplate: string
  isTransactional: boolean
} | null> {
  const [row] = await db
    .select({
      notification: notifications,
      subjectTemplate: notificationTemplates.subjectTemplate,
      bodyTemplate: notificationTemplates.bodyTemplate,
      isTransactional: notificationTemplates.isTransactional,
    })
    .from(notifications)
    .innerJoin(notificationTemplates, eq(notificationTemplates.code, notifications.templateCode))
    .where(and(eq(notifications.id, notificationId), eq(notifications.channel, 'email')))
    .limit(1)
  return row ?? null
}

export async function markNotificationSent(
  db: DbExecutor,
  notificationId: string,
  now: Date,
): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ status: 'sent', sentAt: now, error: null })
    .where(and(eq(notifications.id, notificationId), eq(notifications.status, 'queued')))
    .returning({ id: notifications.id })
  return row !== undefined
}

export async function markNotificationFailed(
  db: DbExecutor,
  notificationId: string,
  message: string,
  now: Date,
): Promise<void> {
  await db
    .update(notifications)
    .set({ status: 'failed', failedAt: now, error: message.slice(0, 500) })
    .where(and(eq(notifications.id, notificationId), eq(notifications.status, 'queued')))
}

export async function markNotificationSkipped(
  db: DbExecutor,
  notificationId: string,
  now: Date,
): Promise<void> {
  await db
    .update(notifications)
    .set({ status: 'skipped', sentAt: now, error: null })
    .where(and(eq(notifications.id, notificationId), eq(notifications.status, 'queued')))
}

export async function listQueuedNotificationsBefore(
  db: DbExecutor,
  before: Date,
  limit: number,
): Promise<NotificationRow[]> {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.status, 'queued'), lt(notifications.createdAt, before)))
    .orderBy(asc(notifications.createdAt), asc(notifications.id))
    .limit(limit)
}

export async function listInAppNotifications(
  db: DbExecutor,
  input: { userId: string; limit: number; cursor: { createdAt: Date; id: string } | undefined },
): Promise<NotificationRow[]> {
  const cursorFilter = input.cursor
    ? or(
        lt(notifications.createdAt, input.cursor.createdAt),
        and(
          eq(notifications.createdAt, input.cursor.createdAt),
          lt(notifications.id, input.cursor.id),
        ),
      )
    : undefined
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.channel, 'inapp'),
        ...(cursorFilter ? [cursorFilter] : []),
      ),
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(input.limit)
}

export async function markNotificationRead(
  db: DbExecutor,
  input: { notificationId: string; userId: string; now: Date },
): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ readAt: input.now })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.userId, input.userId),
        eq(notifications.channel, 'inapp'),
      ),
    )
    .returning({ id: notifications.id })
  return row !== undefined
}

export async function markAllNotificationsRead(
  db: DbExecutor,
  input: { userId: string; now: Date },
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: input.now })
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.channel, 'inapp'),
        isNull(notifications.readAt),
      ),
    )
}

/** J-31: token yang tidak dapat dipakai lagi tak perlu tinggal tanpa batas. */
export async function cleanupExpiredTokens(db: DbExecutor, now: Date): Promise<void> {
  const retention = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  await Promise.all([
    db
      .delete(refreshTokens)
      .where(or(lt(refreshTokens.expiresAt, retention), lt(refreshTokens.revokedAt, retention))),
    db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now)),
    db.delete(otpChallenges).where(lt(otpChallenges.expiresAt, now)),
  ])
}
