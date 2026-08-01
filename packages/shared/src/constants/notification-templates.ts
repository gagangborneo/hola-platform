/**
 * Kode template notifikasi (`notification_templates.code`).
 *
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 7 "Katalog `template_code`".
 *
 * Katalog tumbuh PER MODUL: sebuah template masuk ke dokumen bersama modul
 * yang mengirimnya, di perubahan yang sama.
 *
 * Konvensi nama: `{domain}.{peristiwa}` (docs/03 § `notification_templates`).
 *
 * `dedupe_key` BUKAN bagian dari kode template — ia disusun per pemanggilan dan
 * menjadi bagian UNIQUE `(user_id, template_code, dedupe_key)` (C-19).
 */

export const TEMPLATE_CODE = {
  // ── Auth (docs/05 § 8, § 9) — satu-satunya lingkup Phase 0 ─────────────────
  /** Tautan verifikasi alamat email setelah registrasi (docs/05 § 8). */
  AUTH_EMAIL_VERIFY: 'auth.email_verify',
  /** Tautan reset password, TTL 1 jam, sekali pakai (docs/05 § 8). */
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  /** Pemberitahuan password berhasil diubah (docs/05 § 8 `/password/change`). */
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  /** Pemberitahuan akun terkunci setelah 10 gagal login (docs/05 § 8 Brute force). */
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  /** Konfirmasi booking dan e-receipt setelah payment berhasil. */
  BOOKING_CONFIRMED: 'booking.confirmed',
} as const

export type TemplateCode = (typeof TEMPLATE_CODE)[keyof typeof TEMPLATE_CODE]

/**
 * Template transaksional mengabaikan preferensi notifikasi user
 * (docs/02 § 7 aturan 3).
 */
export const TRANSACTIONAL_TEMPLATE_CODES: readonly TemplateCode[] = [
  TEMPLATE_CODE.AUTH_EMAIL_VERIFY,
  TEMPLATE_CODE.AUTH_PASSWORD_RESET,
  TEMPLATE_CODE.AUTH_PASSWORD_CHANGED,
  TEMPLATE_CODE.AUTH_ACCOUNT_LOCKED,
  TEMPLATE_CODE.BOOKING_CONFIRMED,
]
