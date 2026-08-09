import { describe, expect, it } from 'vitest'
import { promoAppliesToLabel, promoQuotaLabel, promoValueLabel } from './promo-labels.ts'

const base = {
  type: 'percent',
  value_percent: null,
  value_amount: null,
  free_slot_count: null,
  max_discount_amount: null,
}

describe('promoValueLabel', () => {
  it('menyebut batas maksimum diskon persen kalau ada', () => {
    expect(promoValueLabel({ ...base, value_percent: 30, max_discount_amount: 50_000 })).toBe(
      'Diskon 30% (maks Rp50.000)',
    )
    expect(promoValueLabel({ ...base, value_percent: 10 })).toBe('Diskon 10%')
  })

  it('memformat promo nominal dan slot gratis', () => {
    expect(promoValueLabel({ ...base, type: 'fixed', value_amount: 25_000 })).toBe(
      'Potongan Rp25.000',
    )
    expect(promoValueLabel({ ...base, type: 'free_slot', free_slot_count: 1 })).toBe(
      '1 slot gratis',
    )
  })

  /**
   * `null` dipakai pemanggil untuk menyembunyikan baris nilainya — menampilkan
   * "—" pada kartu promo terbaca seperti diskonnya nol.
   */
  it('mengembalikan null saat jenis dan nilainya tidak cocok', () => {
    expect(promoValueLabel(base)).toBeNull()
    expect(promoValueLabel({ ...base, type: 'fixed' })).toBeNull()
    expect(promoValueLabel({ ...base, type: 'sesuatu_baru', value_percent: 10 })).toBeNull()
  })
})

describe('promoAppliesToLabel', () => {
  it('menerjemahkan cakupan promo dan tidak membocorkan enum mentah', () => {
    expect(promoAppliesToLabel('booking')).toBe('Booking lapangan')
    expect(promoAppliesToLabel('all')).toBe('Semua transaksi')
    expect(promoAppliesToLabel('sesuatu_baru')).toBe('Transaksi tertentu')
  })
})

describe('promoQuotaLabel', () => {
  it('tidak menyebut sisa kuota untuk promo tanpa batas', () => {
    expect(promoQuotaLabel(null, 12)).toBeNull()
  })

  it('menghitung sisa kuota dari angka yang dikirim API', () => {
    expect(promoQuotaLabel(100, 40)).toBe('Sisa 60 kuota')
  })

  it('menyatakan kuota habis, bukan sisa negatif', () => {
    expect(promoQuotaLabel(10, 10)).toBe('Kuota habis')
    expect(promoQuotaLabel(10, 11)).toBe('Kuota habis')
  })
})
