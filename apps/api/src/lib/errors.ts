/**
 * Kelas error aplikasi.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 5, docs/16-CONVENTIONS.md § 5.
 *
 * Service melempar `AppError`; route TIDAK menangkapnya (BR-SV-04). Satu
 * `error-handler` middleware yang memetakannya ke response — itu satu-satunya
 * tempat error menjadi HTTP.
 */
import { ERROR_CODE, ERROR_HTTP_STATUS } from '@hola/shared'

/** Warning code tidak boleh dilempar sebagai error HTTP. */
export type AppErrorCode = keyof typeof ERROR_HTTP_STATUS

export interface AppErrorOptions {
  /**
   * Pesan berbahasa Indonesia, layak ditampilkan langsung ke user akhir.
   *
   * Bertipe `| undefined` eksplisit, bukan sekadar `?`: dengan
   * `exactOptionalPropertyTypes`, factory di bawah meneruskan argumen opsional
   * apa adanya, dan tanpa ini setiap pemanggilan harus menyaring `undefined`.
   */
  message?: string | undefined
  /** Konteks tambahan untuk client. Bentuknya per error code (docs/04 § 5). */
  details?: unknown
  /** Error asli, untuk log. TIDAK pernah ikut ke response. */
  cause?: unknown
  /** Timpa status HTTP dari katalog. Jarang dipakai. */
  status?: number | undefined
}

/** Pesan default per kode. Service boleh menimpanya dengan yang lebih spesifik. */
const DEFAULT_MESSAGES: Partial<Record<AppErrorCode, string>> = {
  [ERROR_CODE.VALIDATION_ERROR]: 'Data yang dikirim tidak valid.',
  [ERROR_CODE.MALFORMED_REQUEST]: 'Format permintaan tidak dapat dibaca.',
  [ERROR_CODE.UNAUTHENTICATED]: 'Anda perlu masuk untuk melanjutkan.',
  [ERROR_CODE.TOKEN_EXPIRED]: 'Sesi Anda telah berakhir. Silakan coba lagi.',
  [ERROR_CODE.TOKEN_REVOKED]: 'Sesi Anda telah dicabut. Silakan masuk kembali.',
  [ERROR_CODE.FORBIDDEN]: 'Anda tidak memiliki akses ke tindakan ini.',
  [ERROR_CODE.NOT_RESOURCE_OWNER]: 'Anda tidak memiliki akses ke data ini.',
  [ERROR_CODE.NOT_FOUND]: 'Data yang Anda cari tidak ditemukan.',
  [ERROR_CODE.CONFLICT]: 'Permintaan bertentangan dengan keadaan saat ini.',
  [ERROR_CODE.RATE_LIMITED]: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
  [ERROR_CODE.IDEMPOTENCY_KEY_REUSED]:
    'Kunci idempotency ini sudah dipakai untuk permintaan yang berbeda.',
  [ERROR_CODE.PRECONDITION_FAILED]: 'Data sudah berubah. Muat ulang lalu coba lagi.',
  [ERROR_CODE.INTERNAL_ERROR]: 'Terjadi kesalahan pada sistem. Tim kami sudah diberi tahu.',
  [ERROR_CODE.SERVICE_UNAVAILABLE]: 'Layanan sedang tidak tersedia. Coba lagi sebentar lagi.',
  [ERROR_CODE.UPSTREAM_ERROR]: 'Layanan mitra sedang bermasalah. Coba lagi sebentar lagi.',
  [ERROR_CODE.FEATURE_DISABLED]: 'Fitur ini belum aktif.',
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details: unknown

  constructor(code: AppErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? DEFAULT_MESSAGES[code] ?? 'Terjadi kesalahan.', {
      cause: options.cause,
    })
    this.name = 'AppError'
    this.code = code
    this.details = options.details
    this.status = options.status ?? ERROR_HTTP_STATUS[code]
  }

  /**
   * Apakah error ini "diharapkan"?
   *
   * docs/02 § 9: error yang diharapkan (validasi, 401, 403, 404, 409 konflik
   * slot, promo tidak valid) TIDAK dikirim ke Sentry. Kalau Sentry penuh dengan
   * 409 slot, alert jadi tidak berguna.
   */
  get isExpected(): boolean {
    return this.status < 500
  }
}

/**
 * Factory lengkap, satu entri untuk SETIAP error HTTP di katalog F0-35.
 *
 * Bentuk keyed ini membuat penambahan `ERROR_HTTP_STATUS` baru memaksa factory
 * ikut lengkap pada compile-time; warning-only sengaja tidak masuk.
 */
export type AppErrorFactories = {
  readonly [Code in AppErrorCode]: (options?: AppErrorOptions) => AppError
}

// Type assertion aman: sumber key adalah ERROR_HTTP_STATUS dan setiap value
// dibuat oleh callback yang selalu mengembalikan factory dengan signature sama.
export const APP_ERROR = Object.fromEntries(
  (Object.keys(ERROR_HTTP_STATUS) as AppErrorCode[]).map((code) => [
    code,
    (options?: AppErrorOptions) => new AppError(code, options),
  ]),
) as AppErrorFactories

/** Factory ringkas per kode — `err.notFound()` alih-alih `new AppError(...)`. */
export const err = {
  validation: (details?: unknown, message?: string) =>
    new AppError(ERROR_CODE.VALIDATION_ERROR, { details, message }),
  unauthenticated: (message?: string) => new AppError(ERROR_CODE.UNAUTHENTICATED, { message }),
  tokenExpired: () => new AppError(ERROR_CODE.TOKEN_EXPIRED),
  tokenRevoked: () => new AppError(ERROR_CODE.TOKEN_REVOKED),
  forbidden: (message?: string) => new AppError(ERROR_CODE.FORBIDDEN, { message }),
  notOwner: () => new AppError(ERROR_CODE.NOT_RESOURCE_OWNER),
  notFound: (message?: string) => new AppError(ERROR_CODE.NOT_FOUND, { message }),
  conflict: (message?: string, details?: unknown) =>
    new AppError(ERROR_CODE.CONFLICT, { message, details }),
  rateLimited: (message?: string) => new AppError(ERROR_CODE.RATE_LIMITED, { message }),
  idempotencyKeyReused: () => new AppError(ERROR_CODE.IDEMPOTENCY_KEY_REUSED),
  preconditionFailed: (message?: string) =>
    new AppError(ERROR_CODE.PRECONDITION_FAILED, { message }),
  internal: (cause?: unknown) => new AppError(ERROR_CODE.INTERNAL_ERROR, { cause }),
  serviceUnavailable: (message?: string) =>
    new AppError(ERROR_CODE.SERVICE_UNAVAILABLE, { message }),
  upstream: (message?: string, cause?: unknown) =>
    new AppError(ERROR_CODE.UPSTREAM_ERROR, { message, cause }),
  featureDisabled: (message?: string) => new AppError(ERROR_CODE.FEATURE_DISABLED, { message }),
  /** Untuk kode yang tidak punya factory khusus. */
  of: (code: AppErrorCode, options?: AppErrorOptions) => APP_ERROR[code](options),
}

/**
 * Pelanggaran unique constraint, MEMBAWA nama constraint-nya (BR-SV-22).
 *
 * Repository menerjemahkan error driver menjadi ini; service yang memutuskan
 * artinya secara bisnis — mis. `uq_slot_claims_active` → `SLOT_ALREADY_CLAIMED`,
 * `uq_users_email_lower` → registrasi anti-enumerasi. Tanpa nama constraint,
 * service harus menebak dari teks pesan driver, yang berubah antar versi.
 */
export class UniqueViolationError extends Error {
  readonly constraintName: string

  constructor(constraintName: string, options?: { cause?: unknown }) {
    super(`Pelanggaran unique constraint: ${constraintName}`, options)
    this.name = 'UniqueViolationError'
    this.constraintName = constraintName
  }
}

/** Kode SQLSTATE PostgreSQL yang kita terjemahkan. */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Terjemahkan error driver postgres menjadi `UniqueViolationError`.
 * Dipanggil repository, bukan service (BR-SV-22).
 */
export function translateDbError(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return error
  // Drizzle membungkus error driver PostgreSQL di `cause`; query langsung dari
  // driver menaruh SQLSTATE di objek terluar. Keduanya harus diterjemahkan.
  const e = error as {
    code?: string
    constraint_name?: string
    constraint?: string
    cause?: unknown
  }
  if (e.code === PG_UNIQUE_VIOLATION) {
    const name = e.constraint_name ?? e.constraint
    if (name) return new UniqueViolationError(name, { cause: error })
  }
  if (e.cause !== undefined && e.cause !== error) {
    const translatedCause = translateDbError(e.cause)
    if (translatedCause instanceof UniqueViolationError) {
      return new UniqueViolationError(translatedCause.constraintName, { cause: error })
    }
  }
  return error
}

/**
 * Guard yang menggantikan `!` (BR-TS-03).
 *
 * `noUncheckedIndexedAccess` membuat setiap akses array bertipe `T | undefined`.
 * Alih-alih membubuhkan `!` — yang menyembunyikan kesalahan asumsi — pakai ini:
 * kalau asumsinya salah, errornya menyebut apa yang diharapkan.
 */
export function assertPresent<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new AppError(ERROR_CODE.INTERNAL_ERROR, { message: `Invariant gagal: ${message}` })
  }
  return value
}
