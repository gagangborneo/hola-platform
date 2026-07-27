/**
 * Batas numerik yang TIDAK dapat diubah tanpa deploy.
 *
 * Bedakan dari `settings-keys.ts`: apa pun yang boleh diubah admin runtime hidup
 * di `app_settings`, bukan di sini. Nilai di file ini adalah batas keras yang
 * menjadi bagian dari kontrak API dan dari test.
 *
 * Setiap nilai menyebut sumbernya. Jangan menambah baris tanpa acuan dokumen.
 */

// ── Hold slot & pembayaran ───────────────────────────────────────────────────

/** Umur hold slot lapis 1 & lapis 4 (docs/02 § 4.1, § 8.1 `SLOT_HOLD_TTL_SECONDS`). */
export const HOLD_SLOT_TTL_SECONDS = 600

/** Umur transaksi di gateway (docs/02 § 8.1 `PAYMENT_EXPIRY_MINUTES`). */
export const PAYMENT_EXPIRY_MINUTES = 15

// ── Pipeline harga (docs/07 § 3.3 P0) ────────────────────────────────────────

/** Batas keras baris slot per quote → `QUOTE_ITEM_LIMIT_EXCEEDED`. */
export const MAX_SLOTS_PER_QUOTE = 8

/** Batas keras baris addon per quote → `QUOTE_ITEM_LIMIT_EXCEEDED`. */
export const MAX_ADDONS_PER_QUOTE = 10

/** Rentang quantity addon yang sah (docs/07 § 3.3 P5). */
export const ADDON_QUANTITY_MIN = 1
export const ADDON_QUANTITY_MAX = 20

// ── Booking (docs/06) ────────────────────────────────────────────────────────

/** Maksimum booking `pending_payment` bersamaan per customer (BR-B-14). */
export const MAX_PENDING_PAYMENT_BOOKINGS_PER_CUSTOMER = 3

/** Rentang maksimum satu permintaan ketersediaan, dalam hari (BR-B-47). */
export const AVAILABILITY_MAX_RANGE_DAYS = 14

// ── Auth (docs/05) ───────────────────────────────────────────────────────────

/** Panjang minimum password (docs/05 § 8 Password). */
export const PASSWORD_MIN_LENGTH = 8

/** Gagal login berturut-turut sebelum akun dikunci (docs/05 § 8 Brute force). */
export const LOGIN_MAX_FAILED_ATTEMPTS = 10

/** Lama penguncian akun setelah lockout, dalam menit (docs/05 § 8). */
export const LOGIN_LOCKOUT_MINUTES = 15

/** Progressive delay per kegagalan login berturut-turut, dalam detik (docs/05 § 8). */
export const LOGIN_PROGRESSIVE_DELAY_SECONDS = [1, 2, 4, 8] as const

/** Maksimum sesi (refresh token family) aktif per user (docs/05 § 5, T-5). */
export const MAX_ACTIVE_SESSIONS = 10

// ── TTL Redis (docs/02 § 4.1) ────────────────────────────────────────────────

/** TTL cache ketersediaan. */
export const AVAILABILITY_CACHE_TTL_SECONDS = 60

/** TTL fast path idempotency (24 jam). */
export const IDEMPOTENCY_TTL_SECONDS = 86_400

/** TTL heartbeat worker. */
export const WORKER_HEARTBEAT_TTL_SECONDS = 90

/** Batas atas TTL lock ringan. */
export const LOCK_MAX_TTL_SECONDS = 30

// ── Notifikasi (docs/02 § 7) ─────────────────────────────────────────────────

/**
 * Quiet hours push non-transaksional: 22:00–07:00 WITA. Job MENUNDA pengiriman
 * ke jam mulai kembali, bukan membatalkannya. Nilai runtime dapat ditimpa lewat
 * `app_settings.quiet_hours_start` / `quiet_hours_end`.
 */
export const QUIET_HOURS_DEFAULT_START = '22:00'
export const QUIET_HOURS_DEFAULT_END = '07:00'

// ── Rate limit (docs/02 § 4.5) ───────────────────────────────────────────────

/**
 * 12 bucket fixed window. `identifier` di dokumen bersifat deskriptif — cara
 * menyusunnya adalah tanggung jawab middleware di apps/api (F0-39).
 *
 * Fail-open: kalau Redis tidak terjangkau, request DIIZINKAN (docs/02 § 4.5,
 * docs/16 BR-RD-08). Menolak seluruh traffic karena Redis mati lebih buruk
 * daripada kehilangan proteksi sementara.
 */
export const RATE_LIMIT_BUCKET = {
  AUTH_LOGIN: 'auth-login',
  AUTH_REGISTER: 'auth-register',
  AUTH_OTP: 'auth-otp',
  AUTH_REFRESH: 'auth-refresh',
  BOOKING_QUOTE: 'booking-quote',
  BOOKING_CREATE: 'booking-create',
  PROMO_VALIDATE: 'promo-validate',
  AVAILABILITY_READ: 'availability-read',
  ACTIVITY_CREATE: 'activity-create',
  WEBHOOK_MIDTRANS: 'webhook-midtrans',
  DEFAULT_READ: 'default-read',
  DEFAULT_WRITE: 'default-write',
} as const

export type RateLimitBucket = (typeof RATE_LIMIT_BUCKET)[keyof typeof RATE_LIMIT_BUCKET]

export interface RateLimitConfig {
  /** Jumlah request yang diizinkan dalam satu window. */
  readonly limit: number
  /** Panjang window, dalam detik. */
  readonly windowSeconds: number
}

export const RATE_LIMIT = {
  [RATE_LIMIT_BUCKET.AUTH_LOGIN]: { limit: 5, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.AUTH_REGISTER]: { limit: 3, windowSeconds: 3600 },
  [RATE_LIMIT_BUCKET.AUTH_OTP]: { limit: 3, windowSeconds: 600 },
  [RATE_LIMIT_BUCKET.AUTH_REFRESH]: { limit: 30, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.BOOKING_QUOTE]: { limit: 60, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.BOOKING_CREATE]: { limit: 10, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.PROMO_VALIDATE]: { limit: 20, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.AVAILABILITY_READ]: { limit: 120, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.ACTIVITY_CREATE]: { limit: 20, windowSeconds: 3600 },
  [RATE_LIMIT_BUCKET.WEBHOOK_MIDTRANS]: { limit: 600, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.DEFAULT_READ]: { limit: 300, windowSeconds: 60 },
  [RATE_LIMIT_BUCKET.DEFAULT_WRITE]: { limit: 60, windowSeconds: 60 },
} as const satisfies Record<RateLimitBucket, RateLimitConfig>
