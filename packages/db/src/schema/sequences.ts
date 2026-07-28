/**
 * Sequence untuk kode yang dibaca manusia.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 2 "Format kode manusia".
 *
 * | Kode                            | Format                  | Contoh            |
 * |---------------------------------|-------------------------|-------------------|
 * | `bookings.booking_code`         | `HB-{YYMMDD}-{seq4}`    | `HB-260728-0042`  |
 * | `payments.payment_code`         | `HP-{YYMMDD}-{seq4}`    | `HP-260728-0031`  |
 * | `refunds.refund_code`           | `HR-{YYMMDD}-{seq3}`    | `HR-260728-002`   |
 * | `cafe_invoices.invoice_number`  | `INV-{YYYYMM}-{seq3}`   | `INV-202607-004`  |
 * | `journal_entries.entry_number`  | `JE-{YYYYMM}-{seq5}`    | `JE-202607-00128` |
 * | `employees.employee_number`     | `EMP-{seq4}`            | `EMP-0007`        |
 *
 * Kode dibuat DI DALAM transaksi yang membuat barisnya, memakai sequence —
 * bukan `count(*) + 1`, yang balapan dan menghasilkan kode ganda. Kolomnya
 * UNIQUE, jadi tabrakan gagal keras alih-alih menghasilkan dua booking berkode
 * sama.
 *
 * Sequence dibuat sekarang (Phase 0) meskipun sebagian tabel pemakainya baru
 * ada di phase berikutnya: sequence tidak punya dependensi ke tabel, dan
 * membuatnya belakangan berarti satu migration tambahan tanpa manfaat.
 *
 * CATATAN: keempat sequence harian/bulanan TIDAK di-reset otomatis oleh
 * PostgreSQL. Bagian `{YYMMDD}`/`{YYYYMM}` pada kode berasal dari tanggal
 * transaksi, sementara nomor urutnya monoton naik — jadi kode tetap unik tanpa
 * reset. Generator di apps/api (F0-37 `lib/codes.ts`) yang menyusun keduanya.
 */
import { pgSequence } from 'drizzle-orm/pg-core'

export const seqBookingCode = pgSequence('seq_booking_code', { startWith: 1, minValue: 1 })
export const seqPaymentCode = pgSequence('seq_payment_code', { startWith: 1, minValue: 1 })
export const seqRefundCode = pgSequence('seq_refund_code', { startWith: 1, minValue: 1 })
export const seqInvoiceNumber = pgSequence('seq_invoice_number', { startWith: 1, minValue: 1 })
export const seqJournalEntry = pgSequence('seq_journal_entry', { startWith: 1, minValue: 1 })
export const seqEmployeeNumber = pgSequence('seq_employee_number', { startWith: 1, minValue: 1 })

/** Seluruh sequence, untuk diiterasi test. */
export const ALL_SEQUENCES = [
  'seq_booking_code',
  'seq_payment_code',
  'seq_refund_code',
  'seq_invoice_number',
  'seq_journal_entry',
  'seq_employee_number',
] as const
