import { describe, expect, it } from 'vitest'
import {
  dayOfWeekFor,
  formatRupiah,
  formatTimeWita,
  isoToWitaLocal,
  shiftDateKey,
  todayWita,
  witaLocalToIso,
} from './format.ts'

// TZ runner sengaja America/New_York (lihat vitest.config.ts): setiap ekspektasi
// di bawah gagal kalau ada fungsi yang diam-diam jatuh ke zona mesin.

describe('format back-office', () => {
  it('rupiah selalu bulat tanpa desimal dan tanpa spasi', () => {
    expect(formatRupiah(150_000)).toBe('Rp150.000')
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('jam ditampilkan menurut WITA, bukan zona mesin', () => {
    // 03:00Z = 11:00 WITA. Di zona runner (UTC-4) ini 23:00 hari sebelumnya.
    expect(formatTimeWita('2026-08-10T03:00:00Z')).toBe('11.00')
  })

  it('tanggal bisnis hari ini mengikuti kalender WITA', () => {
    // 17:00Z 9 Agustus sudah tanggal 10 di WITA, masih tanggal 9 di runner.
    expect(todayWita(new Date('2026-08-09T17:00:00Z'))).toBe('2026-08-10')
    expect(todayWita(new Date('2026-08-09T15:59:00Z'))).toBe('2026-08-09')
  })

  it('menggeser tanggal bisnis melewati batas bulan', () => {
    expect(shiftDateKey('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('hari dalam minggu mengikuti EXTRACT(DOW): 0 = Minggu', () => {
    expect(dayOfWeekFor('2026-08-09')).toBe(0)
    expect(dayOfWeekFor('2026-08-10')).toBe(1)
    expect(dayOfWeekFor('2026-08-15')).toBe(6)
  })

  it('datetime-local ditafsirkan sebagai WITA, bukan zona mesin', () => {
    // Tanpa ini, "berlaku sampai 23:00" akan tersimpan sebagai 23:00 New York.
    expect(witaLocalToIso('2026-08-10T23:00')).toBe('2026-08-10T15:00:00.000Z')
    expect(witaLocalToIso('2026-08-10T00:00')).toBe('2026-08-09T16:00:00.000Z')
  })

  it('bolak-balik datetime-local WITA tidak menggeser waktu', () => {
    const local = '2026-12-31T23:30'
    expect(isoToWitaLocal(witaLocalToIso(local))).toBe(local)
  })
})
