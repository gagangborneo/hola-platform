import { describe, expect, it } from 'vitest'
import { isBeyondHorizon, rateClassLabel, unavailableLabel } from './availability-labels.ts'

describe('label ketersediaan', () => {
  it('P1-73: booking, event, dan match digabung agar identitas pemesan tidak bocor', () => {
    expect(unavailableLabel('booking')).toBe('Sudah dipesan')
    expect(unavailableLabel('event')).toBe('Sudah dipesan')
    expect(unavailableLabel('match')).toBe('Sudah dipesan')
  })

  it('P1-73: alasan operasional punya label sendiri', () => {
    expect(unavailableLabel('maintenance')).toBe('Perawatan')
    expect(unavailableLabel('closed')).toBe('Tutup')
    expect(unavailableLabel('past')).toBe('Sudah lewat')
    expect(unavailableLabel('beyond_horizon')).toBe('Belum dibuka')
  })

  it('P1-73: alasan tak dikenal tidak menampilkan kode mentah ke customer', () => {
    expect(unavailableLabel('sesuatu_yang_baru')).toBe('Tidak tersedia')
    expect(unavailableLabel(null)).toBe('Tidak tersedia')
  })

  it('E-11: peringatan horizon terdeteksi tanpa melempar saat meta kosong', () => {
    expect(isBeyondHorizon([{ code: 'BEYOND_BOOKING_HORIZON' }])).toBe(true)
    expect(isBeyondHorizon([{ code: 'PRICE_CHANGED' }])).toBe(false)
    expect(isBeyondHorizon(undefined)).toBe(false)
  })

  it('I1: rate_class dikenal diterjemahkan ke Bahasa Indonesia', () => {
    expect(rateClassLabel('peak')).toBe('Jam sibuk')
    expect(rateClassLabel('offpeak')).toBe('Jam biasa')
    expect(rateClassLabel('special')).toBe('Tarif khusus')
  })

  it('I1: rate_class null menampilkan placeholder netral, bukan fallback "tidak dikenal"', () => {
    expect(rateClassLabel(null)).toBe('—')
  })

  it('I1: rate_class tak dikenal tidak menampilkan kode mentah ke customer', () => {
    expect(rateClassLabel('sesuatu_baru')).toBe('Tarif lain')
  })
})
