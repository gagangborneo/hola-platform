/**
 * Validasi rentang tanggal dashboard.
 *
 * Dibangun di atas `dateRange` milik @hola/shared, bukan aturan baru: skema itu
 * sudah mendefinisikan tanggal bisnis `YYYY-MM-DD` dan larangan `to` mendahului
 * `from`. Yang ditambahkan di sini hanya batas yang memang milik UI — lebar
 * rentang, yang menentukan berapa halaman API harus diambil.
 *
 * Nilainya datang dari `<input type="date">` dan bisa kosong atau setengah
 * diketik saat user masih mengetik, jadi ia diparse, bukan dipercaya.
 */
import { type DateRange, dateRange } from '@hola/shared'
import type { z } from 'zod'
import { shiftDateKey } from '../format.ts'
import { MAX_RANGE_DAYS } from './operations.ts'

export type { DateRange }

/** Selisih hari inklusif antara dua tanggal bisnis. */
function spanInDays(range: DateRange): number {
  let days = 1
  let cursor = range.from
  while (cursor < range.to && days <= MAX_RANGE_DAYS) {
    cursor = shiftDateKey(cursor, 1)
    days += 1
  }
  return days
}

export const analyticsDateRange = dateRange.refine((value) => spanInDays(value) <= MAX_RANGE_DAYS, {
  message: `Rentang maksimal ${MAX_RANGE_DAYS} hari`,
  path: ['from'],
})

export type AnalyticsDateRangeError = 'invalid-date' | 'reversed' | 'too-wide' | null

export interface DateRangeParseResult {
  readonly error: AnalyticsDateRangeError
  /** Selalu rentang yang sah — kandidat yang gagal diperbaiki, bukan dibuang. */
  readonly range: DateRange
}

function firstIssueCode(issues: readonly z.core.$ZodIssue[]): AnalyticsDateRangeError {
  if (issues.some((issue) => issue.code === 'invalid_format')) return 'invalid-date'
  if (issues.some((issue) => issue.message.startsWith('Rentang maksimal'))) return 'too-wide'
  return 'reversed'
}

/**
 * Memvalidasi kandidat rentang dan mengembalikan versi yang pasti sah.
 *
 * Rentang diperbaiki, bukan ditolak diam-diam: kalau `from` melewati `to`,
 * yang baru saja diubah user-lah yang menang, dan sisi lainnya ikut bergeser.
 * Menolak input tanpa mengubah apa pun akan membuat kalender terasa macet.
 */
export function parseDateRange(candidate: DateRange, previous: DateRange): DateRangeParseResult {
  const result = analyticsDateRange.safeParse(candidate)
  if (result.success) return { error: null, range: result.data }

  const error = firstIssueCode(result.error.issues)
  if (error === 'invalid-date') return { error, range: previous }

  // Sisi yang berubah dipertahankan; sisi lainnya ditarik ke batas terdekat.
  const isToChanged = candidate.to !== previous.to
  if (error === 'reversed') {
    return {
      error,
      range: isToChanged
        ? { from: candidate.to, to: candidate.to }
        : { from: candidate.from, to: candidate.from },
    }
  }

  return {
    error,
    range: isToChanged
      ? { from: shiftDateKey(candidate.to, -(MAX_RANGE_DAYS - 1)), to: candidate.to }
      : { from: candidate.from, to: shiftDateKey(candidate.from, MAX_RANGE_DAYS - 1) },
  }
}
