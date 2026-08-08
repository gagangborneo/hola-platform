import { describe, expect, it } from 'vitest'
import { bookingStatusLabel, paymentStatusLabel } from './status-labels.ts'

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
