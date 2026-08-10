import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDateWita,
  formatDayName,
  formatDayNumberWita,
  formatMonthShortWita,
  formatRupiah,
  formatTimeWita,
  formatWeekdayShortWita,
  isWitaWeekend,
  witaDateKey,
} from './format.ts'

describe('pemformatan tampilan', () => {
  it('rupiah tanpa desimal dan tanpa aritmetika', () => {
    expect(formatRupiah(150_000)).toBe('Rp150.000')
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('jam ditampilkan dalam zona WITA apa pun zona peladen', () => {
    expect(formatTimeWita('2026-07-28T06:00:00+08:00')).toBe('06.00')
    expect(formatTimeWita('2026-07-27T22:00:00Z')).toBe('06.00')
  })

  it('nama hari mengikuti indeks EXTRACT(DOW) PostgreSQL', () => {
    expect(formatDayName(0)).toBe('Minggu')
    expect(formatDayName(6)).toBe('Sabtu')
  })

  it('jam operasional dari kolom time dipangkas ke jam dan menit', () => {
    expect(formatClock('08:00:00')).toBe('08.00')
    expect(formatClock('22:30')).toBe('22.30')
  })

  it('BR-B-01: tanggal bisnis dihitung di WITA, bukan zona peladen', () => {
    expect(witaDateKey('2026-07-28T23:00:00+08:00')).toBe('2026-07-28')
    expect(witaDateKey('2026-07-28T16:30:00Z')).toBe('2026-07-29')
  })

  it('pil tanggal menampilkan hari, tanggal, dan bulan dari kunci `yyyy-mm-dd`', () => {
    // 2026-08-10 jatuh di hari Senin.
    expect(formatWeekdayShortWita('2026-08-10')).toBe('Sen')
    expect(formatDayNumberWita('2026-08-10')).toBe('10')
    expect(formatMonthShortWita('2026-08-10')).toBe('Agu')
    expect(formatDateWita('2026-08-10')).toBe('Senin, 10 Agustus 2026')
  })

  /**
   * Kunci tanggal diurai sebagai tengah malam UTC — di WITA itu masih hari yang
   * sama (pukul 08.00), dan pil tanggal HARUS memakai hari itu. Kalau formatter
   * memakai zona peramban di sebelah barat WITA, pil akan mundur satu hari dan
   * customer memesan tanggal yang salah.
   */
  it('nama hari pil tanggal tidak bergeser oleh zona waktu peramban', () => {
    expect(formatWeekdayShortWita('2026-08-09')).toBe('Min')
    expect(formatDayNumberWita('2026-08-09')).toBe('9')
  })

  it('akhir pekan ditandai menurut WITA', () => {
    expect(isWitaWeekend('2026-08-08')).toBe(true) // Sabtu
    expect(isWitaWeekend('2026-08-09')).toBe(true) // Minggu
    expect(isWitaWeekend('2026-08-10')).toBe(false) // Senin
  })
})
