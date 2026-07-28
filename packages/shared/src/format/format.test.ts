import { describe, expect, it } from 'vitest'
import { witaToInstant } from '../utils/wita.ts'
import {
  formatDateRange,
  formatWita,
  formatWitaDate,
  formatWitaTime,
  formatWitaWeekday,
} from './date.ts'
import { formatCountdown, formatDuration } from './duration.ts'
import { formatIDR } from './money.ts'

const wita = (dateYmd: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':')
  return witaToInstant(dateYmd, Number(h) * 60 + Number(m))
}

describe('formatIDR', () => {
  const cases: Array<[number, string]> = [
    [0, 'Rp 0'],
    [100, 'Rp 100'],
    [1_000, 'Rp 1.000'],
    [10_000, 'Rp 10.000'],
    [150_000, 'Rp 150.000'],
    [1_000_000, 'Rp 1.000.000'],
    [12_345_678, 'Rp 12.345.678'],
    [-50_000, '-Rp 50.000'],
  ]

  it.each(cases)('formatIDR(%i) = %s', (input, expected) => {
    expect(formatIDR(input)).toBe(expected)
  })

  it('dapat menyembunyikan simbol', () => {
    expect(formatIDR(150_000, { withSymbol: false })).toBe('150.000')
  })

  it('menolak nilai non-integer (uang wajib integer rupiah, BR-TS-07)', () => {
    expect(() => formatIDR(1500.5)).toThrow()
    expect(() => formatIDR(Number.NaN)).toThrow()
  })
})

describe('format tanggal WITA', () => {
  const evening = wita('2026-07-28', '19:00')

  it('formatWitaDate', () => {
    expect(formatWitaDate(evening)).toBe('28 Jul 2026')
  })

  it('formatWitaTime', () => {
    expect(formatWitaTime(evening)).toBe('19:00')
  })

  it('formatWita menggabungkan keduanya + label zona', () => {
    expect(formatWita(evening)).toBe('28 Jul 2026, 19:00 WITA')
  })

  it('formatWitaWeekday memakai hari WITA', () => {
    // 28 Juli 2026 = SELASA. Dicatat eksplisit karena docs/07 § 3.4 menyebut
    // tanggal ini "Sabtu 28 Juli 2026 (weekend)" — klaim itu keliru dan sudah
    // dilaporkan; contoh perhitungan di sana perlu dikoreksi sebelum P1-13.
    expect(formatWitaWeekday(evening)).toBe('Selasa')
  })

  it('1 Agustus 2026 adalah Sabtu (verifikasi silang kalender)', () => {
    expect(formatWitaWeekday(wita('2026-08-01', '12:00'))).toBe('Sabtu')
  })

  it('instan UTC yang sama menghasilkan tanggal WITA berbeda dari tanggal UTC', () => {
    // 2026-07-28T17:00Z = 2026-07-29T01:00 WITA.
    const instant = new Date('2026-07-28T17:00:00Z')
    expect(formatWitaDate(instant)).toBe('29 Jul 2026')
    expect(formatWitaTime(instant)).toBe('01:00')
  })
})

describe('formatDateRange', () => {
  it('meringkas bila tanggal WITA-nya sama', () => {
    const out = formatDateRange(wita('2026-07-28', '19:00'), wita('2026-07-28', '21:00'))
    expect(out).toBe('28 Jul 2026, 19:00–21:00 WITA')
  })

  it('menulis lengkap bila melewati tengah malam WITA', () => {
    const out = formatDateRange(wita('2026-07-28', '23:00'), wita('2026-07-29', '01:00'))
    expect(out).toBe('28 Jul 2026, 23:00 – 29 Jul 2026, 01:00 WITA')
  })
})

describe('formatDuration', () => {
  const cases: Array<[number, string]> = [
    [0, '0 menit'],
    [1, '1 menit'],
    [45, '45 menit'],
    [60, '1 jam'],
    [90, '1 jam 30 menit'],
    [120, '2 jam'],
    [185, '3 jam 5 menit'],
  ]

  it.each(cases)('formatDuration(%i) = %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })

  it('menjepit nilai negatif ke 0', () => {
    expect(formatDuration(-30)).toBe('0 menit')
  })
})

describe('formatCountdown (docs/06 E-23)', () => {
  const cases: Array<[number, string]> = [
    [600, '10:00'],
    [599, '09:59'],
    [61, '01:01'],
    [9, '00:09'],
    [0, '00:00'],
    [-5, '00:00'],
  ]

  it.each(cases)('formatCountdown(%i) = %s', (input, expected) => {
    expect(formatCountdown(input)).toBe(expected)
  })
})
