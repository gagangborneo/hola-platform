/**
 * Entitas identity & access.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 5. Aturan auth: docs/05-AUTH.md.
 */
import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAtOnly, money, pkId, timestamps, tstz, uuidV7Column } from '../columns.ts'
import { userRoleEnum, userStatusEnum } from './enums.ts'

export const users = pgTable(
  'users',
  {
    id: pkId(),
    /** Satu role per user. Tidak ada multi-role di v1. */
    role: userRoleEnum('role').notNull(),
    /** Disimpan lowercase; keunikannya case-insensitive lewat uq di bawah. */
    email: text('email'),
    /** Format E.164 (`+62812…`). */
    phone: text('phone'),
    /** argon2id. NULL untuk user yang hanya login OTP. */
    passwordHash: text('password_hash'),
    fullName: text('full_name').notNull(),
    avatarMediaId: uuid('avatar_media_id'),
    status: userStatusEnum('status').notNull().default('active'),
    /** Dinaikkan untuk mencabut SELURUH access token user (docs/05 § 4). */
    tokenVersion: integer('token_version').notNull().default(0),
    emailVerifiedAt: tstz('email_verified_at'),
    phoneVerifiedAt: tstz('phone_verified_at'),
    lastLoginAt: tstz('last_login_at'),
    /** Brute force (docs/05 § 8): 10 gagal → kunci 15 menit. */
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: tstz('locked_until'),
    ...timestamps,
  },
  (t) => [
    check('ck_users_identifier', sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`),
    // Keunikan email case-insensitive: index atas lower(email), bukan UNIQUE biasa.
    // Tanpa ini `Budi@x.com` dan `budi@x.com` menjadi dua akun berbeda.
    uniqueIndex('uq_users_email_lower').on(sql`lower(${t.email})`),
    uniqueIndex('uq_users_phone').on(t.phone),
  ],
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    /** Dipakai sebagai `jti` refresh. */
    id: pkId(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 dari token opaque. Token mentah TIDAK PERNAH disimpan. */
    tokenHash: text('token_hash').notNull(),
    /** Rantai rotasi. Reuse token lama → seluruh family dicabut (docs/05 T-4). */
    familyId: uuidV7Column('family_id').notNull(),
    parentId: uuid('parent_id'),
    deviceLabel: text('device_label'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: tstz('expires_at').notNull(),
    revokedAt: tstz('revoked_at'),
    /** `rotated` | `logout` | `reuse_detected` | `admin_revoke`. */
    revokedReason: text('revoked_reason'),
    lastUsedAt: tstz('last_used_at'),
    ...createdAtOnly,
  },
  (t) => [
    // C-23 — token tidak tabrakan.
    uniqueIndex('uq_refresh_tokens_token_hash').on(t.tokenHash),
    index('idx_refresh_tokens_user_revoked').on(t.userId, t.revokedAt),
    // Deteksi reuse mencabut seluruh family sekaligus → dicari lewat family_id.
    index('idx_refresh_tokens_family').on(t.familyId),
    index('idx_refresh_tokens_expires').on(t.expiresAt),
  ],
)

export const customerProfiles = pgTable('customer_profiles', {
  /** PK = user_id (1:1 dengan `users` untuk role `customer`). */
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  birthDate: text('birth_date'),
  /** `male` | `female` | `undisclosed`. */
  gender: text('gender'),
  /** `beginner` | `intermediate` | `advanced` — dilaporkan sendiri. */
  skillLevel: text('skill_level'),
  preferredSportId: uuid('preferred_sport_id'),
  /**
   * FK ke `tiers` BELUM dibuat: tabel `tiers` baru ada di Phase 3
   * (docs/12-MODULE-GAMIFICATION.md). Kolomnya berdiri sekarang dengan default
   * `bronze`; FK-nya ditambahkan bersama modul gamification, dengan pola
   * `ADD CONSTRAINT … NOT VALID` + `VALIDATE` (docs/03 § 19) agar tidak mengunci
   * tabel yang sudah berisi data.
   */
  tierCode: text('tier_code').notNull().default('bronze'),
  /** Agregat poin positif sepanjang waktu. Dihitung ulang J-24. */
  lifetimePoints: money('lifetime_points').notNull().default(0),
  /** UNIQUE, 6 karakter alfanumerik. */
  referralCode: text('referral_code').notNull().unique(),
  referredByUserId: uuid('referred_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  notificationPrefs: jsonb('notification_prefs')
    .notNull()
    .default({ push: true, email: true, whatsapp: false }),
  /** CRM — hanya terlihat admin/staff (field-level filtering, docs/05 § 7). */
  internalNotes: text('internal_notes'),
  ...timestamps,
})
