/**
 * Entitas sistem: pengaturan, audit, idempotency, token sekali pakai.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 17.
 */
import { desc } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAtOnly, pkId, tstz } from '../columns.ts'
import { users } from './identity.ts'

/**
 * Nilai yang boleh diubah admin TANPA deploy. Daftar kunci kanonik ada di
 * docs/03 § `app_settings` dan sebagai konstanta di
 * `@hola/shared` → `SETTINGS_KEY`.
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: tstz('updated_at').notNull().defaultNow(),
})

/**
 * Jejak audit. Append-only — tidak pernah di-UPDATE.
 *
 * Wajib dicatat untuk: perubahan harga, promo, force release slot, pembatalan
 * booking oleh staff, refund, perubahan kontrak/tagihan tenant, penyesuaian poin
 * manual, perubahan role user, perubahan gaji, void jurnal (docs/03 § 17).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pkId(),
    /** NULL = dilakukan sistem/job, bukan manusia. */
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: text('actor_role'),
    /** mis. `booking.cancel`, `slot.force_release`, `promo.update`. */
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    ...createdAtOnly,
  },
  (t) => [index('idx_audit_logs_entity').on(t.entityType, t.entityId, desc(t.createdAt))],
)

/**
 * Jaminan durabel `Idempotency-Key` untuk POST dari client (bukan webhook).
 * Redis hanya fast path (docs/02 § 4.2 R-4); tabel inilah yang menjamin.
 */
export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: pkId(),
    key: text('key').notNull(),
    /** mis. `booking.create`. */
    scope: text('scope').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    /**
     * Hash body request. Kunci sama + body berbeda = `409
     * IDEMPOTENCY_KEY_REUSED`, bukan diam-diam mengembalikan hasil lama.
     */
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    expiresAt: tstz('expires_at').notNull(),
    ...createdAtOnly,
  },
  (t) => [
    // C-22 — POST idempoten.
    uniqueIndex('uq_idempotency_records_key').on(t.key),
    index('idx_idempotency_records_expires').on(t.expiresAt),
  ],
)

/**
 * Tantangan OTP. Disimpan di PostgreSQL, BUKAN Redis — user yang sedang menunggu
 * OTP tidak boleh gagal tanpa penjelasan karena Redis di-flush (docs/03 § 17).
 *
 * [D-04] default sementara — lihat docs/00-OVERVIEW.md § 6: login OTP tidak
 * aktif di v1, tetapi tabelnya berdiri agar mengaktifkannya tidak butuh migration.
 */
export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: pkId(),
    phone: text('phone').notNull(),
    /** Hash OTP, BUKAN OTP mentah. */
    codeHash: text('code_hash').notNull(),
    /** `login` | `verify_phone`. */
    purpose: text('purpose').notNull(),
    /** Maks 5, lalu challenge dibatalkan (docs/05 § 8). */
    attemptCount: integer('attempt_count').notNull().default(0),
    expiresAt: tstz('expires_at').notNull(),
    consumedAt: tstz('consumed_at'),
    ipAddress: text('ip_address'),
    ...createdAtOnly,
  },
  (t) => [index('idx_otp_challenges_phone_created').on(t.phone, desc(t.createdAt))],
)

/** Token reset password: 32 byte acak, TTL 1 jam, sekali pakai (docs/05 § 8). */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: pkId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 dari token acak. Token mentah tidak pernah disimpan. */
    tokenHash: text('token_hash').notNull(),
    expiresAt: tstz('expires_at').notNull(),
    /** Diisi saat dipakai — inilah yang membuatnya sekali pakai. */
    consumedAt: tstz('consumed_at'),
    ipAddress: text('ip_address'),
    ...createdAtOnly,
  },
  (t) => [
    uniqueIndex('uq_password_reset_tokens_hash').on(t.tokenHash),
    index('idx_password_reset_tokens_expires').on(t.expiresAt),
  ],
)
