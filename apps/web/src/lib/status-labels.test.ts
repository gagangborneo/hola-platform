import { describe, expect, it } from 'vitest'
import {
  bookingChannelLabel,
  bookingStatusLabel,
  bookingUsageLabel,
  paymentStatusLabel,
} from './status-labels.ts'

describe('I1: label status booking (satu sumber kebenaran lintas BookingList/BookingDetail/Receipt)', () => {
  it('setiap status booking dikenal diterjemahkan ke Bahasa Indonesia', () => {
    expect(bookingStatusLabel('pending_payment')).toBe('Menunggu pembayaran')
    expect(bookingStatusLabel('confirmed')).toBe('Terkonfirmasi')
    expect(bookingStatusLabel('completed')).toBe('Selesai')
    expect(bookingStatusLabel('cancelled')).toBe('Dibatalkan')
    expect(bookingStatusLabel('expired')).toBe('Kedaluwarsa')
    expect(bookingStatusLabel('no_show')).toBe('Tidak hadir')
  })

  it('status tak dikenal tidak menampilkan kode mentah ke customer', () => {
    expect(bookingStatusLabel('sesuatu_baru')).toBe('Status tidak dikenal')
  })
})

describe('status pemakaian tiket (dipakai BookingList & BookingDetail)', () => {
  it('booking terkonfirmasi terbaca belum atau sudah digunakan lewat `checked_in_at`', () => {
    expect(bookingUsageLabel({ status: 'confirmed', checked_in_at: null })).toEqual({
      label: 'Belum digunakan',
      tone: 'ready',
    })
    expect(
      bookingUsageLabel({ status: 'confirmed', checked_in_at: '2026-08-13T01:00:00.000Z' }),
    ).toEqual({ label: 'Sudah digunakan', tone: 'used' })
  })

  it('booking selesai selalu terhitung sudah digunakan', () => {
    expect(bookingUsageLabel({ status: 'completed', checked_in_at: null })?.label).toBe(
      'Sudah digunakan',
    )
  })

  it('tidak menduplikasi lencana status yang sudah menjelaskan dirinya sendiri', () => {
    for (const status of ['pending_payment', 'cancelled', 'expired', 'no_show', 'sesuatu_baru']) {
      expect(bookingUsageLabel({ status, checked_in_at: null })).toBeNull()
    }
  })
})

describe('label kanal booking', () => {
  it('menerjemahkan kanal yang dikenal dan tidak membocorkan enum mentah', () => {
    expect(bookingChannelLabel('web')).toBe('Situs web')
    expect(bookingChannelLabel('walk_in')).toBe('Walk-in di lokasi')
    expect(bookingChannelLabel('sesuatu_baru')).toBe('Kanal lain')
  })
})

describe('I1: label status pembayaran (dipakai PaymentStatus)', () => {
  it('setiap status pembayaran dikenal diterjemahkan ke Bahasa Indonesia', () => {
    expect(paymentStatusLabel('pending')).toBe('Menunggu pembayaran')
    expect(paymentStatusLabel('paid')).toBe('Dibayar')
    expect(paymentStatusLabel('failed')).toBe('Gagal')
    expect(paymentStatusLabel('expired')).toBe('Kedaluwarsa')
    expect(paymentStatusLabel('cancelled')).toBe('Dibatalkan')
    expect(paymentStatusLabel('refunded')).toBe('Dikembalikan')
  })

  it('status tak dikenal tidak menampilkan kode mentah ke customer', () => {
    expect(paymentStatusLabel('sesuatu_baru')).toBe('Status tidak dikenal')
  })
})
