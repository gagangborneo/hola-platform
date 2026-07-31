/**
 * Bentuk `Quote` — keluaran `pricing.computeQuote()`, dan persis apa yang
 * disimpan sebagai `bookings.quote_snapshot`.
 *
 * Sumber kebenaran: docs/07-MODULE-PAYMENT.md § 3.1.
 *
 * Snapshot bersifat **immutable** (docs/06 BR-B-13): perubahan daftar harga
 * tidak pernah menyentuh transaksi lampau. Karena itu `pipeline_version` wajib
 * ikut disimpan — tanpa itu, snapshot lama tidak dapat ditafsirkan setelah
 * logika pipeline berubah.
 *
 * F0-19 menetapkan bentuknya; P1-07 mengunci `QuoteInput` bersama implementasi
 * pipeline-nya.
 */
import type { PromoType, RateClass, UserRole } from '../constants/enums.ts'

/** Dinaikkan setiap kali logika pipeline berubah (docs/07 § 3.1). */
export const QUOTE_PIPELINE_VERSION = 1

/** Apa yang sedang dihargai — menentukan cabang step P1. */
export type QuoteKind = 'booking' | 'event_registration' | 'tournament_registration'

/** Aktor dipakai evaluator promo dan penyesuaian tier di masa depan. */
export type QuoteActor = {
  user_id?: string
  role: UserRole
  tier_code?: string
}

export type QuoteBookingItemInput = {
  court_id: string
  starts_at: string
}

export type QuoteAddonInput = {
  addon_id: string
  quantity: number
}

/** Input kanonik untuk satu evaluasi pipeline harga (docs/07 § 3.1). */
export type QuoteInput =
  | {
      kind: 'booking'
      at: string
      actor: QuoteActor
      booking: { items: readonly QuoteBookingItemInput[]; addons: readonly QuoteAddonInput[] }
      promo_code?: string
      apply_auto_promo?: boolean
      reserve_promo?: boolean
    }
  | {
      kind: 'event_registration'
      at: string
      actor: QuoteActor
      event: { event_id: string }
      promo_code?: string
      apply_auto_promo?: boolean
      reserve_promo?: boolean
    }
  | {
      kind: 'tournament_registration'
      at: string
      actor: QuoteActor
      tournament: { tournament_id: string }
      promo_code?: string
      apply_auto_promo?: boolean
      reserve_promo?: boolean
    }

/** Jenis baris. `subtotal_amount` menjumlahkan `slot` + `fee`; `addon` terpisah. */
export type QuoteLineType = 'slot' | 'addon' | 'fee' | 'discount'

export interface QuoteLine {
  type: QuoteLineType
  ref_id: string
  label: string
  court_code?: string
  starts_at?: string
  ends_at?: string
  rate_class?: RateClass
  price_rule_id?: string
  quantity: number
  unit_price_amount: number
  line_total_amount: number
}

export interface QuotePromo {
  promo_id: string
  code: string
  name: string
  type: PromoType
  discount_amount: number
  reason_code?: string
}

export interface QuoteWarning {
  code: string
  message: string
  details?: unknown
}

export interface Quote {
  kind: QuoteKind
  computed_at: string
  pipeline_version: number
  lines: QuoteLine[]
  /** Jumlah `line_total_amount` untuk `type='slot'` / `'fee'`. */
  subtotal_amount: number
  /** Jumlah `line_total_amount` untuk `type='addon'`. */
  addon_amount: number
  /** SELALU 0 di v1 — P6 dinonaktifkan sampai membership berbayar diputuskan (D-09). */
  tier_discount_amount: number
  promo: QuotePromo | null
  /** `tier_discount_amount + promo.discount_amount`. */
  discount_amount: number
  taxable_base_amount: number
  /** Default 0 (D-06), dibaca dari `app_settings.tax_rate`. */
  tax_rate: number
  tax_amount: number
  /** Biaya kanal yang dibebankan ke customer. Default 0 (D-07). */
  fee_amount: number
  /** Selisih akibat pembulatan P10. Bisa negatif. */
  rounding_adjustment_amount: number
  /** Yang ditagih. Selalu ≥ 0 — diskon tidak pernah menghasilkan tagihan negatif. */
  total_amount: number
  currency: 'IDR'
  warnings: QuoteWarning[]
}
