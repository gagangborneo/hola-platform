/**
 * 53 tipe enum PostgreSQL.
 *
 * Nilainya diambil langsung dari `PG_ENUMS` di @hola/shared — TIDAK diketik
 * ulang. Itu menutup satu-satunya celah drift yang mungkin antara enum
 * TypeScript dan enum PostgreSQL (RK-0-04): kalau nilainya berubah di shared,
 * migration berikutnya ikut berubah dengan sendirinya.
 *
 * Daftar kanoniknya tetap docs/03-DATA-MODEL.md § 3; test F0-20 menjaga shared
 * cocok dengan dokumen, dan test integrasi F0-31 menjaga database cocok dengan
 * shared.
 */
import { enumValues, PG_ENUMS } from '@hola/shared'
import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', enumValues(PG_ENUMS.user_role))
export const userStatusEnum = pgEnum('user_status', enumValues(PG_ENUMS.user_status))
export const courtStatusEnum = pgEnum('court_status', enumValues(PG_ENUMS.court_status))
export const rateClassEnum = pgEnum('rate_class', enumValues(PG_ENUMS.rate_class))
export const dayTypeEnum = pgEnum('day_type', enumValues(PG_ENUMS.day_type))
export const claimTypeEnum = pgEnum('claim_type', enumValues(PG_ENUMS.claim_type))
export const claimStatusEnum = pgEnum('claim_status', enumValues(PG_ENUMS.claim_status))
export const bookingStatusEnum = pgEnum('booking_status', enumValues(PG_ENUMS.booking_status))
export const bookingChannelEnum = pgEnum('booking_channel', enumValues(PG_ENUMS.booking_channel))
export const paymentStatusEnum = pgEnum('payment_status', enumValues(PG_ENUMS.payment_status))
export const paymentRefundStatusEnum = pgEnum(
  'payment_refund_status',
  enumValues(PG_ENUMS.payment_refund_status),
)
export const paymentMethodEnum = pgEnum('payment_method', enumValues(PG_ENUMS.payment_method))
export const paymentProviderEnum = pgEnum('payment_provider', enumValues(PG_ENUMS.payment_provider))
export const refundStatusEnum = pgEnum('refund_status', enumValues(PG_ENUMS.refund_status))
export const refundChannelEnum = pgEnum('refund_channel', enumValues(PG_ENUMS.refund_channel))
export const promoTypeEnum = pgEnum('promo_type', enumValues(PG_ENUMS.promo_type))
export const promoAppliesToEnum = pgEnum('promo_applies_to', enumValues(PG_ENUMS.promo_applies_to))
export const promoStatusEnum = pgEnum('promo_status', enumValues(PG_ENUMS.promo_status))
export const promoRedemptionStatusEnum = pgEnum(
  'promo_redemption_status',
  enumValues(PG_ENUMS.promo_redemption_status),
)
export const eventTypeEnum = pgEnum('event_type', enumValues(PG_ENUMS.event_type))
export const eventStatusEnum = pgEnum('event_status', enumValues(PG_ENUMS.event_status))
export const eventRegistrationStatusEnum = pgEnum(
  'event_registration_status',
  enumValues(PG_ENUMS.event_registration_status),
)
export const tournamentFormatEnum = pgEnum(
  'tournament_format',
  enumValues(PG_ENUMS.tournament_format),
)
export const tournamentStatusEnum = pgEnum(
  'tournament_status',
  enumValues(PG_ENUMS.tournament_status),
)
export const tournamentParticipantTypeEnum = pgEnum(
  'tournament_participant_type',
  enumValues(PG_ENUMS.tournament_participant_type),
)
export const tournamentRegistrationStatusEnum = pgEnum(
  'tournament_registration_status',
  enumValues(PG_ENUMS.tournament_registration_status),
)
export const matchStageEnum = pgEnum('match_stage', enumValues(PG_ENUMS.match_stage))
export const matchStatusEnum = pgEnum('match_status', enumValues(PG_ENUMS.match_status))
export const pointSourceTypeEnum = pgEnum(
  'point_source_type',
  enumValues(PG_ENUMS.point_source_type),
)
export const leaderboardPeriodTypeEnum = pgEnum(
  'leaderboard_period_type',
  enumValues(PG_ENUMS.leaderboard_period_type),
)
export const leaderboardPeriodStatusEnum = pgEnum(
  'leaderboard_period_status',
  enumValues(PG_ENUMS.leaderboard_period_status),
)
export const activityTypeEnum = pgEnum('activity_type', enumValues(PG_ENUMS.activity_type))
export const activityVerificationSourceEnum = pgEnum(
  'activity_verification_source',
  enumValues(PG_ENUMS.activity_verification_source),
)
export const tutorialLevelEnum = pgEnum('tutorial_level', enumValues(PG_ENUMS.tutorial_level))
export const tutorialVideoProviderEnum = pgEnum(
  'tutorial_video_provider',
  enumValues(PG_ENUMS.tutorial_video_provider),
)
export const contentStatusEnum = pgEnum('content_status', enumValues(PG_ENUMS.content_status))
export const cafeUnitStatusEnum = pgEnum('cafe_unit_status', enumValues(PG_ENUMS.cafe_unit_status))
export const cafeTenantStatusEnum = pgEnum(
  'cafe_tenant_status',
  enumValues(PG_ENUMS.cafe_tenant_status),
)
export const cafeContractStatusEnum = pgEnum(
  'cafe_contract_status',
  enumValues(PG_ENUMS.cafe_contract_status),
)
export const cafeInvoiceStatusEnum = pgEnum(
  'cafe_invoice_status',
  enumValues(PG_ENUMS.cafe_invoice_status),
)
export const accountTypeEnum = pgEnum('account_type', enumValues(PG_ENUMS.account_type))
export const journalEntryStatusEnum = pgEnum(
  'journal_entry_status',
  enumValues(PG_ENUMS.journal_entry_status),
)
export const financeSourceTypeEnum = pgEnum(
  'finance_source_type',
  enumValues(PG_ENUMS.finance_source_type),
)
export const employmentTypeEnum = pgEnum('employment_type', enumValues(PG_ENUMS.employment_type))
export const employeeStatusEnum = pgEnum('employee_status', enumValues(PG_ENUMS.employee_status))
export const attendanceStatusEnum = pgEnum(
  'attendance_status',
  enumValues(PG_ENUMS.attendance_status),
)
export const leaveTypeEnum = pgEnum('leave_type', enumValues(PG_ENUMS.leave_type))
export const leaveStatusEnum = pgEnum('leave_status', enumValues(PG_ENUMS.leave_status))
export const notificationChannelEnum = pgEnum(
  'notification_channel',
  enumValues(PG_ENUMS.notification_channel),
)
export const notificationStatusEnum = pgEnum(
  'notification_status',
  enumValues(PG_ENUMS.notification_status),
)
export const mediaStatusEnum = pgEnum('media_status', enumValues(PG_ENUMS.media_status))
export const mediaKindEnum = pgEnum('media_kind', enumValues(PG_ENUMS.media_kind))
export const outboxStatusEnum = pgEnum('outbox_status', enumValues(PG_ENUMS.outbox_status))

/** Seluruh enum, untuk diiterasi test integrasi F0-31. */
export const ALL_PG_ENUMS = [
  userRoleEnum,
  userStatusEnum,
  courtStatusEnum,
  rateClassEnum,
  dayTypeEnum,
  claimTypeEnum,
  claimStatusEnum,
  bookingStatusEnum,
  bookingChannelEnum,
  paymentStatusEnum,
  paymentRefundStatusEnum,
  paymentMethodEnum,
  paymentProviderEnum,
  refundStatusEnum,
  refundChannelEnum,
  promoTypeEnum,
  promoAppliesToEnum,
  promoStatusEnum,
  promoRedemptionStatusEnum,
  eventTypeEnum,
  eventStatusEnum,
  eventRegistrationStatusEnum,
  tournamentFormatEnum,
  tournamentStatusEnum,
  tournamentParticipantTypeEnum,
  tournamentRegistrationStatusEnum,
  matchStageEnum,
  matchStatusEnum,
  pointSourceTypeEnum,
  leaderboardPeriodTypeEnum,
  leaderboardPeriodStatusEnum,
  activityTypeEnum,
  activityVerificationSourceEnum,
  tutorialLevelEnum,
  tutorialVideoProviderEnum,
  contentStatusEnum,
  cafeUnitStatusEnum,
  cafeTenantStatusEnum,
  cafeContractStatusEnum,
  cafeInvoiceStatusEnum,
  accountTypeEnum,
  journalEntryStatusEnum,
  financeSourceTypeEnum,
  employmentTypeEnum,
  employeeStatusEnum,
  attendanceStatusEnum,
  leaveTypeEnum,
  leaveStatusEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  mediaStatusEnum,
  mediaKindEnum,
  outboxStatusEnum,
] as const
