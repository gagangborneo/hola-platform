/**
 * Kunci `app_settings` — daftar kanonik dari docs/03-DATA-MODEL.md § `app_settings`.
 *
 * `app_settings` adalah nilai yang boleh diubah admin **tanpa deploy**. Karena itu
 * nilainya TIDAK ada di file ini — hanya kuncinya. Default per kunci ada di tabel
 * dokumen dan diisi oleh seed (F0-96).
 *
 * Dilarang menulis kunci sebagai string literal di service (docs/16 AI-6).
 */

export const SETTINGS_KEY = {
  // ── Booking (docs/06) ──────────────────────────────────────────────────────
  BOOKING_HORIZON_DAYS: 'booking_horizon_days',
  MAX_CONFIRMED_BOOKINGS_PER_DAY: 'max_confirmed_bookings_per_day',
  REQUIRE_CONTIGUOUS_SLOTS: 'require_contiguous_slots',
  RESCHEDULE_MIN_HOURS_BEFORE: 'reschedule_min_hours_before',
  RESCHEDULE_MAX_COUNT: 'reschedule_max_count',
  REFUND_POLICY: 'refund_policy',
  CANCELLATION_POLICY_TEXT: 'cancellation_policy_text',

  // ── Payment (docs/07) ──────────────────────────────────────────────────────
  TAX_RATE: 'tax_rate',
  REFUND_API_SUPPORTED_METHODS: 'refund_api_supported_methods',

  // ── Event (docs/10) ────────────────────────────────────────────────────────
  EVENT_WAITLIST_PAYMENT_WINDOW_MINUTES: 'event_waitlist_payment_window_minutes',

  // ── Tenant cafe (docs/09) ──────────────────────────────────────────────────
  CAFE_INVOICE_AUTO_ISSUE: 'cafe_invoice_auto_issue',

  // ── Finance (docs/14) ──────────────────────────────────────────────────────
  STAFF_EXPENSE_LIMIT_AMOUNT: 'staff_expense_limit_amount',
  EXPENSE_RECEIPT_REQUIRED_ABOVE_AMOUNT: 'expense_receipt_required_above_amount',
  FINANCE_LOCKED_UNTIL_DATE: 'finance_locked_until_date',

  // ── Notifikasi (docs/02 § 7) ───────────────────────────────────────────────
  QUIET_HOURS_START: 'quiet_hours_start',
  QUIET_HOURS_END: 'quiet_hours_end',

  // ── Mobile (docs/15 § 10) ──────────────────────────────────────────────────
  MIN_SUPPORTED_MOBILE_VERSION: 'min_supported_mobile_version',

  // ── Promo (docs/08 § 4) ────────────────────────────────────────────────────
  // TIDAK DIPAKAI di v1. Hanya relevan bila stacking promo diaktifkan (D-02 Opsi B).
  MAX_TOTAL_DISCOUNT_PERCENT: 'max_total_discount_percent',
} as const

export type SettingsKey = (typeof SETTINGS_KEY)[keyof typeof SETTINGS_KEY]
