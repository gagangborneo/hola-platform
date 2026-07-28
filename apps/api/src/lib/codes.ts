/**
 * Generator kode yang dibaca manusia.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 2 "Format kode manusia".
 *
 * Dua aturan keras:
 *
 * 1. Nomor urut diambil dari PostgreSQL **sequence**, bukan `count(*) + 1`.
 *    `count(*) + 1` balapan: dua booking bersamaan menghasilkan kode yang sama,
 *    dan kolomnya UNIQUE sehingga salah satunya gagal — di tengah checkout.
 *
 * 2. Dipanggil DI DALAM transaksi yang membuat barisnya, dengan `tx` yang sama.
 *    `nextval()` tidak ikut rollback (itu memang sifat sequence, dan disengaja:
 *    lompatan nomor lebih baik daripada tabrakan), tetapi kodenya harus lahir
 *    bersama barisnya.
 */

import { toWitaParts } from '@hola/shared'
import { sql } from 'drizzle-orm'
import type { Tx } from './transaction.ts'

const SEQUENCE = {
  BOOKING: 'seq_booking_code',
  PAYMENT: 'seq_payment_code',
  REFUND: 'seq_refund_code',
  INVOICE: 'seq_invoice_number',
  JOURNAL: 'seq_journal_entry',
  EMPLOYEE: 'seq_employee_number',
} as const

async function nextval(tx: Tx, sequence: string): Promise<number> {
  const rows = await tx.execute<{ nextval: string }>(
    sql`SELECT nextval(${sequence}::regclass) AS nextval`,
  )
  const value = rows[0]?.nextval
  if (value === undefined) {
    throw new Error(`Sequence ${sequence} tidak mengembalikan nilai`)
  }
  return Number(value)
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

/** `YYMMDD` menurut tanggal bisnis WITA. */
function yymmdd(at: Date): string {
  const { year, month, day } = toWitaParts(at)
  return `${pad(year % 100, 2)}${pad(month, 2)}${pad(day, 2)}`
}

/** `YYYYMM` menurut tanggal bisnis WITA. */
function yyyymm(at: Date): string {
  const { year, month } = toWitaParts(at)
  return `${year}${pad(month, 2)}`
}

/** `HB-{YYMMDD}-{seq4}` — mis. `HB-260728-0042`. */
export async function nextBookingCode(tx: Tx, at: Date): Promise<string> {
  return `HB-${yymmdd(at)}-${pad(await nextval(tx, SEQUENCE.BOOKING), 4)}`
}

/** `HP-{YYMMDD}-{seq4}` — mis. `HP-260728-0031`. */
export async function nextPaymentCode(tx: Tx, at: Date): Promise<string> {
  return `HP-${yymmdd(at)}-${pad(await nextval(tx, SEQUENCE.PAYMENT), 4)}`
}

/** `HR-{YYMMDD}-{seq3}` — mis. `HR-260728-002`. */
export async function nextRefundCode(tx: Tx, at: Date): Promise<string> {
  return `HR-${yymmdd(at)}-${pad(await nextval(tx, SEQUENCE.REFUND), 3)}`
}

/** `INV-{YYYYMM}-{seq3}` — mis. `INV-202607-004`. */
export async function nextInvoiceNumber(tx: Tx, at: Date): Promise<string> {
  return `INV-${yyyymm(at)}-${pad(await nextval(tx, SEQUENCE.INVOICE), 3)}`
}

/** `JE-{YYYYMM}-{seq5}` — mis. `JE-202607-00128`. */
export async function nextJournalEntryNumber(tx: Tx, at: Date): Promise<string> {
  return `JE-${yyyymm(at)}-${pad(await nextval(tx, SEQUENCE.JOURNAL), 5)}`
}

/** `EMP-{seq4}` — mis. `EMP-0007`. Tanpa komponen tanggal. */
export async function nextEmployeeNumber(tx: Tx): Promise<string> {
  return `EMP-${pad(await nextval(tx, SEQUENCE.EMPLOYEE), 4)}`
}
