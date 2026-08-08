import { describe, expect, it } from 'vitest'
import { isBeyondHorizon, unavailableLabel } from './availability-labels.ts'

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
})
