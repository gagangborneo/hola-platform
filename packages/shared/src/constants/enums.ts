/**
 * Seluruh enum domain Hola.
 *
 * Sumber kebenaran nilai: docs/03-DATA-MODEL.md § 3. Nilai di sini WAJIB identik
 * dengan tipe enum PostgreSQL yang dibuat di migration 0001 — drift antara
 * keduanya muncul sebagai `invalid input value for enum` di runtime produksi
 * (RK-0-04). Dua test menjaganya:
 *   - F0-20 (unit)      : konstanta di file ini ≡ daftar di docs/03 § 3
 *   - F0-31 (integrasi) : konstanta di file ini ≡ `pg_enum` di database uji
 *
 * Ditulis sebagai `as const` object + union type, bukan `enum` TypeScript
 * (docs/16-CONVENTIONS.md BR-TS-05).
 */

// ── Identity & access ────────────────────────────────────────────────────────

export const USER_ROLE = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  STAFF: 'staff',
  TENANT: 'tenant',
} as const
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

// ── Venue, court, pricing ────────────────────────────────────────────────────

export const COURT_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
} as const
export type CourtStatus = (typeof COURT_STATUS)[keyof typeof COURT_STATUS]

export const RATE_CLASS = {
  PEAK: 'peak',
  OFFPEAK: 'offpeak',
  SPECIAL: 'special',
} as const
export type RateClass = (typeof RATE_CLASS)[keyof typeof RATE_CLASS]

export const DAY_TYPE = {
  WEEKDAY: 'weekday',
  WEEKEND: 'weekend',
  HOLIDAY: 'holiday',
  SPECIFIC_DATE: 'specific_date',
} as const
export type DayType = (typeof DAY_TYPE)[keyof typeof DAY_TYPE]

// ── Slot claim ───────────────────────────────────────────────────────────────

export const CLAIM_TYPE = {
  BOOKING: 'booking',
  EVENT: 'event',
  MATCH: 'match',
  MAINTENANCE: 'maintenance',
} as const
export type ClaimType = (typeof CLAIM_TYPE)[keyof typeof CLAIM_TYPE]

export const CLAIM_STATUS = {
  HELD: 'held',
  CONFIRMED: 'confirmed',
  RELEASED: 'released',
} as const
export type ClaimStatus = (typeof CLAIM_STATUS)[keyof typeof CLAIM_STATUS]

// ── Booking ──────────────────────────────────────────────────────────────────

export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  NO_SHOW: 'no_show',
} as const
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS]

export const BOOKING_CHANNEL = {
  WEB: 'web',
  MOBILE: 'mobile',
  ADMIN: 'admin',
  WALK_IN: 'walk_in',
} as const
export type BookingChannel = (typeof BOOKING_CHANNEL)[keyof typeof BOOKING_CHANNEL]

// ── Payment & refund ─────────────────────────────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  EXPIRED: 'expired',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

export const PAYMENT_REFUND_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  PARTIAL: 'partial',
  FULL: 'full',
} as const
export type PaymentRefundStatus = (typeof PAYMENT_REFUND_STATUS)[keyof typeof PAYMENT_REFUND_STATUS]

export const PAYMENT_METHOD = {
  QRIS: 'qris',
  GOPAY: 'gopay',
  SHOPEEPAY: 'shopeepay',
  BANK_TRANSFER_VA: 'bank_transfer_va',
  CREDIT_CARD: 'credit_card',
  CASH: 'cash',
  MANUAL_TRANSFER: 'manual_transfer',
} as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

export const PAYMENT_PROVIDER = {
  MIDTRANS: 'midtrans',
  MANUAL: 'manual',
} as const
export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER]

export const REFUND_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const
export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS]

export const REFUND_CHANNEL = {
  GATEWAY: 'gateway',
  MANUAL_TRANSFER: 'manual_transfer',
  CASH: 'cash',
} as const
export type RefundChannel = (typeof REFUND_CHANNEL)[keyof typeof REFUND_CHANNEL]

// ── Promo ────────────────────────────────────────────────────────────────────

export const PROMO_TYPE = {
  PERCENT: 'percent',
  FIXED: 'fixed',
  FREE_SLOT: 'free_slot',
} as const
export type PromoType = (typeof PROMO_TYPE)[keyof typeof PROMO_TYPE]

export const PROMO_APPLIES_TO = {
  BOOKING: 'booking',
  EVENT: 'event',
  TOURNAMENT: 'tournament',
  ALL: 'all',
} as const
export type PromoAppliesTo = (typeof PROMO_APPLIES_TO)[keyof typeof PROMO_APPLIES_TO]

export const PROMO_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
} as const
export type PromoStatus = (typeof PROMO_STATUS)[keyof typeof PROMO_STATUS]

export const PROMO_REDEMPTION_STATUS = {
  RESERVED: 'reserved',
  APPLIED: 'applied',
  RELEASED: 'released',
} as const
export type PromoRedemptionStatus =
  (typeof PROMO_REDEMPTION_STATUS)[keyof typeof PROMO_REDEMPTION_STATUS]

// ── Event ────────────────────────────────────────────────────────────────────

export const EVENT_TYPE = {
  OPEN_PLAY: 'open_play',
  COACHING_CLINIC: 'coaching_clinic',
  COMMUNITY_GATHERING: 'community_gathering',
  OTHER: 'other',
} as const
export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE]

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REGISTRATION_OPEN: 'registration_open',
  REGISTRATION_CLOSED: 'registration_closed',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS]

export const EVENT_REGISTRATION_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  WAITLISTED: 'waitlisted',
  CANCELLED: 'cancelled',
  ATTENDED: 'attended',
  NO_SHOW: 'no_show',
} as const
export type EventRegistrationStatus =
  (typeof EVENT_REGISTRATION_STATUS)[keyof typeof EVENT_REGISTRATION_STATUS]

// ── Tournament & match ───────────────────────────────────────────────────────

export const TOURNAMENT_FORMAT = {
  KNOCKOUT: 'knockout',
  ROUND_ROBIN: 'round_robin',
} as const
export type TournamentFormat = (typeof TOURNAMENT_FORMAT)[keyof typeof TOURNAMENT_FORMAT]

export const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  REGISTRATION_OPEN: 'registration_open',
  REGISTRATION_CLOSED: 'registration_closed',
  SEEDING: 'seeding',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
export type TournamentStatus = (typeof TOURNAMENT_STATUS)[keyof typeof TOURNAMENT_STATUS]

export const TOURNAMENT_PARTICIPANT_TYPE = {
  SINGLE: 'single',
  DOUBLE: 'double',
  TEAM: 'team',
} as const
export type TournamentParticipantType =
  (typeof TOURNAMENT_PARTICIPANT_TYPE)[keyof typeof TOURNAMENT_PARTICIPANT_TYPE]

export const TOURNAMENT_REGISTRATION_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  WITHDRAWN: 'withdrawn',
  DISQUALIFIED: 'disqualified',
} as const
export type TournamentRegistrationStatus =
  (typeof TOURNAMENT_REGISTRATION_STATUS)[keyof typeof TOURNAMENT_REGISTRATION_STATUS]

export const MATCH_STAGE = {
  GROUP: 'group',
  KNOCKOUT: 'knockout',
} as const
export type MatchStage = (typeof MATCH_STAGE)[keyof typeof MATCH_STAGE]

export const MATCH_STATUS = {
  PENDING_SCHEDULE: 'pending_schedule',
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  WALKOVER: 'walkover',
  CANCELLED: 'cancelled',
} as const
export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS]

// ── Gamification & activity ──────────────────────────────────────────────────

export const POINT_SOURCE_TYPE = {
  BOOKING: 'booking',
  MATCH: 'match',
  TOURNAMENT: 'tournament',
  EVENT: 'event',
  ACTIVITY: 'activity',
  MANUAL: 'manual',
  REFERRAL: 'referral',
  PROFILE: 'profile',
} as const
export type PointSourceType = (typeof POINT_SOURCE_TYPE)[keyof typeof POINT_SOURCE_TYPE]

export const LEADERBOARD_PERIOD_TYPE = {
  MONTHLY: 'monthly',
  SEASONAL: 'seasonal',
  ALLTIME: 'alltime',
} as const
export type LeaderboardPeriodType =
  (typeof LEADERBOARD_PERIOD_TYPE)[keyof typeof LEADERBOARD_PERIOD_TYPE]

export const LEADERBOARD_PERIOD_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  CLOSED: 'closed',
} as const
export type LeaderboardPeriodStatus =
  (typeof LEADERBOARD_PERIOD_STATUS)[keyof typeof LEADERBOARD_PERIOD_STATUS]

export const ACTIVITY_TYPE = {
  MATCH: 'match',
  PRACTICE: 'practice',
  TRAINING: 'training',
  OTHER: 'other',
} as const
export type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE]

export const ACTIVITY_VERIFICATION_SOURCE = {
  BOOKING: 'booking',
  CHECKIN: 'checkin',
  MANUAL: 'manual',
  NONE: 'none',
} as const
export type ActivityVerificationSource =
  (typeof ACTIVITY_VERIFICATION_SOURCE)[keyof typeof ACTIVITY_VERIFICATION_SOURCE]

// ── Tutorial & konten ────────────────────────────────────────────────────────

export const TUTORIAL_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const
export type TutorialLevel = (typeof TUTORIAL_LEVEL)[keyof typeof TUTORIAL_LEVEL]

export const TUTORIAL_VIDEO_PROVIDER = {
  YOUTUBE: 'youtube',
  R2: 'r2',
  STREAM: 'stream',
} as const
export type TutorialVideoProvider =
  (typeof TUTORIAL_VIDEO_PROVIDER)[keyof typeof TUTORIAL_VIDEO_PROVIDER]

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS]

// ── Tenant cafe ──────────────────────────────────────────────────────────────

export const CAFE_UNIT_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
} as const
export type CafeUnitStatus = (typeof CAFE_UNIT_STATUS)[keyof typeof CAFE_UNIT_STATUS]

export const CAFE_TENANT_STATUS = {
  PROSPECT: 'prospect',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
} as const
export type CafeTenantStatus = (typeof CAFE_TENANT_STATUS)[keyof typeof CAFE_TENANT_STATUS]

export const CAFE_CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  ENDED: 'ended',
  TERMINATED: 'terminated',
} as const
export type CafeContractStatus = (typeof CAFE_CONTRACT_STATUS)[keyof typeof CAFE_CONTRACT_STATUS]

export const CAFE_INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
} as const
export type CafeInvoiceStatus = (typeof CAFE_INVOICE_STATUS)[keyof typeof CAFE_INVOICE_STATUS]

// ── Finance ──────────────────────────────────────────────────────────────────

export const ACCOUNT_TYPE = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  EQUITY: 'equity',
  REVENUE: 'revenue',
  CONTRA_REVENUE: 'contra_revenue',
  EXPENSE: 'expense',
} as const
export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE]

export const JOURNAL_ENTRY_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  VOIDED: 'voided',
} as const
export type JournalEntryStatus = (typeof JOURNAL_ENTRY_STATUS)[keyof typeof JOURNAL_ENTRY_STATUS]

export const FINANCE_SOURCE_TYPE = {
  BOOKING: 'booking',
  CAFE_INVOICE: 'cafe_invoice',
  CAFE_CONTRACT: 'cafe_contract',
  EVENT_REGISTRATION: 'event_registration',
  TOURNAMENT_REGISTRATION: 'tournament_registration',
  PAYMENT: 'payment',
  REFUND: 'refund',
  EXPENSE: 'expense',
  MANUAL: 'manual',
} as const
export type FinanceSourceType = (typeof FINANCE_SOURCE_TYPE)[keyof typeof FINANCE_SOURCE_TYPE]

// ── HRIS ─────────────────────────────────────────────────────────────────────

export const EMPLOYMENT_TYPE = {
  FULLTIME: 'fulltime',
  PARTTIME: 'parttime',
  CONTRACT: 'contract',
  INTERN: 'intern',
} as const
export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE]

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  RESIGNED: 'resigned',
  TERMINATED: 'terminated',
} as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS]

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
  LEAVE: 'leave',
  HOLIDAY: 'holiday',
  DAY_OFF: 'day_off',
} as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS]

export const LEAVE_TYPE = {
  ANNUAL: 'annual',
  SICK: 'sick',
  UNPAID: 'unpaid',
  OTHER: 'other',
} as const
export type LeaveType = (typeof LEAVE_TYPE)[keyof typeof LEAVE_TYPE]

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const
export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS]

// ── Notifikasi, media, sistem ────────────────────────────────────────────────

export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  INAPP: 'inapp',
} as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL]

export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS]

export const MEDIA_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
  DELETED: 'deleted',
} as const
export type MediaStatus = (typeof MEDIA_STATUS)[keyof typeof MEDIA_STATUS]

export const MEDIA_KIND = {
  COURT_PHOTO: 'court_photo',
  EVENT_POSTER: 'event_poster',
  TUTORIAL_THUMBNAIL: 'tutorial_thumbnail',
  AVATAR: 'avatar',
  CONTRACT_DOCUMENT: 'contract_document',
  PAYMENT_PROOF: 'payment_proof',
  EXPENSE_RECEIPT: 'expense_receipt',
} as const
export type MediaKind = (typeof MEDIA_KIND)[keyof typeof MEDIA_KIND]

export const OUTBOX_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const
export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS]

// ─────────────────────────────────────────────────────────────────────────────
// Registry: nama tipe enum PostgreSQL → konstanta TypeScript-nya.
//
// Dipakai oleh test drift F0-20 (vs docs/03 § 3) dan F0-31 (vs `pg_enum`).
// Menambah enum baru WAJIB menambahkannya di sini juga, kalau tidak kedua test
// itu tidak akan pernah melihatnya.
// ─────────────────────────────────────────────────────────────────────────────

export const PG_ENUMS = {
  user_role: USER_ROLE,
  user_status: USER_STATUS,
  court_status: COURT_STATUS,
  rate_class: RATE_CLASS,
  day_type: DAY_TYPE,
  claim_type: CLAIM_TYPE,
  claim_status: CLAIM_STATUS,
  booking_status: BOOKING_STATUS,
  booking_channel: BOOKING_CHANNEL,
  payment_status: PAYMENT_STATUS,
  payment_refund_status: PAYMENT_REFUND_STATUS,
  payment_method: PAYMENT_METHOD,
  payment_provider: PAYMENT_PROVIDER,
  refund_status: REFUND_STATUS,
  refund_channel: REFUND_CHANNEL,
  promo_type: PROMO_TYPE,
  promo_applies_to: PROMO_APPLIES_TO,
  promo_status: PROMO_STATUS,
  promo_redemption_status: PROMO_REDEMPTION_STATUS,
  event_type: EVENT_TYPE,
  event_status: EVENT_STATUS,
  event_registration_status: EVENT_REGISTRATION_STATUS,
  tournament_format: TOURNAMENT_FORMAT,
  tournament_status: TOURNAMENT_STATUS,
  tournament_participant_type: TOURNAMENT_PARTICIPANT_TYPE,
  tournament_registration_status: TOURNAMENT_REGISTRATION_STATUS,
  match_stage: MATCH_STAGE,
  match_status: MATCH_STATUS,
  point_source_type: POINT_SOURCE_TYPE,
  leaderboard_period_type: LEADERBOARD_PERIOD_TYPE,
  leaderboard_period_status: LEADERBOARD_PERIOD_STATUS,
  activity_type: ACTIVITY_TYPE,
  activity_verification_source: ACTIVITY_VERIFICATION_SOURCE,
  tutorial_level: TUTORIAL_LEVEL,
  tutorial_video_provider: TUTORIAL_VIDEO_PROVIDER,
  content_status: CONTENT_STATUS,
  cafe_unit_status: CAFE_UNIT_STATUS,
  cafe_tenant_status: CAFE_TENANT_STATUS,
  cafe_contract_status: CAFE_CONTRACT_STATUS,
  cafe_invoice_status: CAFE_INVOICE_STATUS,
  account_type: ACCOUNT_TYPE,
  journal_entry_status: JOURNAL_ENTRY_STATUS,
  finance_source_type: FINANCE_SOURCE_TYPE,
  employment_type: EMPLOYMENT_TYPE,
  employee_status: EMPLOYEE_STATUS,
  attendance_status: ATTENDANCE_STATUS,
  leave_type: LEAVE_TYPE,
  leave_status: LEAVE_STATUS,
  notification_channel: NOTIFICATION_CHANNEL,
  notification_status: NOTIFICATION_STATUS,
  media_status: MEDIA_STATUS,
  media_kind: MEDIA_KIND,
  outbox_status: OUTBOX_STATUS,
} as const

export type PgEnumName = keyof typeof PG_ENUMS

/**
 * Nilai sebuah enum sebagai tuple non-kosong, urut sesuai deklarasi.
 *
 * Tipe return-nya sengaja `[T, ...T[]]`, bukan `T[]`: `pgEnum()` Drizzle dan
 * `z.enum()` keduanya mensyaratkan tuple non-kosong. Mengembalikan array biasa
 * memaksa setiap pemanggil menulis `as` — dan `as` di jalur enum persis yang
 * bisa menyembunyikan drift yang ingin kita cegah.
 */
export function enumValues<T extends Record<string, string>>(
  e: T,
): [T[keyof T], ...Array<T[keyof T]>] {
  const [first, ...rest] = Object.values(e) as Array<T[keyof T]>
  if (first === undefined) {
    throw new Error('Enum tidak boleh kosong')
  }
  return [first, ...rest]
}
