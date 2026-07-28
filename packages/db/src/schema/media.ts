/**
 * Entitas media & notifikasi.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 17, docs/02-INFRASTRUCTURE.md § 6–7.
 */
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAtOnly, pkId, timestamps, tstz } from '../columns.ts'
import {
  mediaKindEnum,
  mediaStatusEnum,
  notificationChannelEnum,
  notificationStatusEnum,
} from './enums.ts'
import { users } from './identity.ts'

/**
 * Berkas di object storage. Baris dibuat berstatus `pending` saat presign, lalu
 * `ready` setelah `/confirm` memverifikasi objeknya benar-benar ada.
 * Baris `pending` > 24 jam dibersihkan J-32 (docs/02 § 6).
 */
export const mediaFiles = pgTable(
  'media_files',
  {
    id: pkId(),
    bucket: text('bucket').notNull(),
    objectKey: text('object_key').notNull(),
    kind: mediaKindEnum('kind').notNull(),
    status: mediaStatusEnum('status').notNull().default('pending'),
    contentType: text('content_type'),
    /** Ukuran byte — bukan uang, jadi bigint biasa dengan mode number. */
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    checksum: text('checksum'),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    relatedType: text('related_type'),
    relatedId: text('related_id'),
    confirmedAt: tstz('confirmed_at'),
    deletedAt: tstz('deleted_at'),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex('uq_media_files_object_key').on(t.objectKey),
    // J-32 menyapu baris pending yang menua.
    index('idx_media_files_status_created').on(t.status, t.createdAt),
    index('idx_media_files_related').on(t.relatedType, t.relatedId),
  ],
)

/**
 * Template notifikasi. Katalog kode kanonik: docs/02 § 7 "Katalog template_code",
 * konstantanya `TEMPLATE_CODE` di @hola/shared.
 */
export const notificationTemplates = pgTable('notification_templates', {
  /** mis. `auth.password_reset`. */
  code: text('code').primaryKey(),
  channel: notificationChannelEnum('channel').notNull(),
  subjectTemplate: text('subject_template'),
  bodyTemplate: text('body_template').notNull(),
  /** Daftar variabel yang wajib disediakan pemanggil. */
  variables: jsonb('variables').notNull().default([]),
  /** Jika true, preferensi user diabaikan (docs/02 § 7 aturan 3). */
  isTransactional: boolean('is_transactional').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: pkId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expoPushToken: text('expo_push_token').notNull(),
    deviceId: text('device_id'),
    /** `ios` | `android`. */
    platform: text('platform'),
    appVersion: text('app_version'),
    lastSeenAt: tstz('last_seen_at'),
    /** Diisi saat Expo membalas `DeviceNotRegistered` (J-26). */
    revokedAt: tstz('revoked_at'),
    revokedReason: text('revoked_reason'),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex('uq_push_tokens_expo_token').on(t.expoPushToken),
    index('idx_push_tokens_user').on(t.userId, t.revokedAt),
  ],
)

/**
 * Baris notifikasi. Setiap kanal menulis satu baris; kanal `inapp` ditulis
 * sinkron agar user selalu punya inbox (docs/02 § 7).
 */
export const notifications = pgTable(
  'notifications',
  {
    id: pkId(),
    /** NULL untuk penerima tanpa akun (email guest). */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    toEmail: text('to_email'),
    toPhone: text('to_phone'),
    toPushTokenId: uuid('to_push_token_id').references(() => pushTokens.id, {
      onDelete: 'set null',
    }),
    channel: notificationChannelEnum('channel').notNull(),
    templateCode: text('template_code')
      .notNull()
      .references(() => notificationTemplates.code),
    payload: jsonb('payload').notNull().default({}),
    /** mis. `booking:{id}:reminder2h`. Bagian dari kunci dedupe C-19. */
    dedupeKey: text('dedupe_key'),
    status: notificationStatusEnum('status').notNull().default('queued'),
    queuedAt: tstz('queued_at').notNull().defaultNow(),
    sentAt: tstz('sent_at'),
    failedAt: tstz('failed_at'),
    error: text('error'),
    readAt: tstz('read_at'),
    relatedType: text('related_type'),
    relatedId: text('related_id'),
    ...createdAtOnly,
  },
  (t) => [
    // C-19 — inti aturan dedupe. Dua index partial: satu untuk penerima ber-akun,
    // satu untuk penerima yang hanya punya email (docs/03 § 17).
    uniqueIndex('uq_notifications_dedupe_user')
      .on(t.userId, t.templateCode, t.dedupeKey)
      .where(sql`${t.userId} IS NOT NULL AND ${t.dedupeKey} IS NOT NULL`),
    uniqueIndex('uq_notifications_dedupe_email')
      .on(t.toEmail, t.templateCode, t.dedupeKey)
      .where(sql`${t.userId} IS NULL AND ${t.toEmail} IS NOT NULL AND ${t.dedupeKey} IS NOT NULL`),
    // Dipakai J-36 untuk menyapu notifikasi yang menganggur di status queued.
    index('idx_notifications_status_created')
      .on(t.status, t.createdAt)
      .where(sql`${t.status} = 'queued'`),
    index('idx_notifications_user_created').on(t.userId, t.createdAt),
  ],
)
