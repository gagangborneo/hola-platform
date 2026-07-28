/**
 * F0-20 🔴 — gerbang DoD: konstanta enum WAJIB identik dengan docs/03-DATA-MODEL.md § 3.
 *
 * DOC_TABLE di bawah adalah SALINAN VERBATIM kolom 1–2 tabel "Daftar Enum" di
 * docs/03-DATA-MODEL.md § 3. Ia bukan ringkasan dan bukan ketikan ulang: saat
 * dokumen berubah, salin ulang barisnya ke sini. Test membandingkan PG_ENUMS
 * dengan tabel ini — nama enum, jumlah, urutan, dan nilainya.
 *
 * Kenapa disalin, bukan dibaca dari file: packages/shared harus jalan di React
 * Native, jadi tidak boleh menyentuh `node:fs` (docs/01-ARCHITECTURE.md § 3.6).
 */
import { describe, expect, it } from 'vitest'
import { enumValues, PG_ENUMS } from './enums.ts'

const DOC_TABLE = `
user_role = customer, admin, staff, tenant
user_status = active, suspended, deleted
court_status = active, maintenance, inactive
rate_class = peak, offpeak, special
day_type = weekday, weekend, holiday, specific_date
claim_type = booking, event, match, maintenance
claim_status = held, confirmed, released
booking_status = pending_payment, confirmed, completed, cancelled, expired, no_show
booking_channel = web, mobile, admin, walk_in
payment_status = pending, paid, expired, failed, cancelled
payment_refund_status = none, pending, partial, full
payment_method = qris, gopay, shopeepay, bank_transfer_va, credit_card, cash, manual_transfer
payment_provider = midtrans, manual
refund_status = requested, approved, processing, completed, rejected, failed
refund_channel = gateway, manual_transfer, cash
promo_type = percent, fixed, free_slot
promo_applies_to = booking, event, tournament, all
promo_status = draft, active, paused, expired, archived
promo_redemption_status = reserved, applied, released
event_type = open_play, coaching_clinic, community_gathering, other
event_status = draft, published, registration_open, registration_closed, ongoing, completed, cancelled
event_registration_status = pending_payment, confirmed, waitlisted, cancelled, attended, no_show
tournament_format = knockout, round_robin
tournament_status = draft, registration_open, registration_closed, seeding, ongoing, completed, cancelled
tournament_participant_type = single, double, team
tournament_registration_status = pending_payment, confirmed, withdrawn, disqualified
match_stage = group, knockout
match_status = pending_schedule, scheduled, ongoing, completed, walkover, cancelled
point_source_type = booking, match, tournament, event, activity, manual, referral, profile
leaderboard_period_type = monthly, seasonal, alltime
leaderboard_period_status = upcoming, active, closed
activity_type = match, practice, training, other
activity_verification_source = booking, checkin, manual, none
tutorial_level = beginner, intermediate, advanced
tutorial_video_provider = youtube, r2, stream
content_status = draft, published, archived
cafe_unit_status = available, occupied, maintenance
cafe_tenant_status = prospect, active, suspended, terminated
cafe_contract_status = draft, active, expiring, ended, terminated
cafe_invoice_status = draft, issued, partially_paid, paid, overdue, void
account_type = asset, liability, equity, revenue, contra_revenue, expense
journal_entry_status = draft, posted, voided
finance_source_type = booking, cafe_invoice, cafe_contract, event_registration, tournament_registration, payment, refund, expense, manual
employment_type = fulltime, parttime, contract, intern
employee_status = active, inactive, resigned, terminated
attendance_status = present, late, absent, leave, holiday, day_off
leave_type = annual, sick, unpaid, other
leave_status = pending, approved, rejected, cancelled
notification_channel = email, push, whatsapp, inapp
notification_status = queued, sent, failed, skipped
media_status = pending, ready, deleted
media_kind = court_photo, event_poster, tutorial_thumbnail, avatar, contract_document, payment_proof, expense_receipt
outbox_status = pending, processing, done, failed
`

interface DocEnum {
  name: string
  values: string[]
}

const docEnums: DocEnum[] = DOC_TABLE.trim()
  .split('\n')
  .map((line) => {
    const [rawName, rawValues] = line.split(' = ')
    if (rawName === undefined || rawValues === undefined) {
      throw new Error(`Baris DOC_TABLE tidak dapat diurai: ${line}`)
    }
    return { name: rawName.trim(), values: rawValues.split(',').map((v) => v.trim()) }
  })

describe('enums ≡ docs/03-DATA-MODEL.md § 3', () => {
  it('jumlah enum sama persis', () => {
    expect(Object.keys(PG_ENUMS)).toHaveLength(docEnums.length)
  })

  it('tidak ada enum di dokumen yang belum terdaftar di PG_ENUMS', () => {
    const registered = new Set(Object.keys(PG_ENUMS))
    const missing = docEnums.filter((e) => !registered.has(e.name)).map((e) => e.name)
    expect(missing).toEqual([])
  })

  it('tidak ada enum di PG_ENUMS yang tidak ada di dokumen', () => {
    const documented = new Set(docEnums.map((e) => e.name))
    const extra = Object.keys(PG_ENUMS).filter((name) => !documented.has(name))
    expect(extra).toEqual([])
  })

  describe.each(docEnums)('$name', ({ name, values }) => {
    it('nilai & urutannya identik dengan dokumen', () => {
      const constant = PG_ENUMS[name as keyof typeof PG_ENUMS]
      expect(constant, `enum ${name} tidak ada di PG_ENUMS`).toBeDefined()
      expect(enumValues(constant)).toEqual(values)
    })
  })
})
