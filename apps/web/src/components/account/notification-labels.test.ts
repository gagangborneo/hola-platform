import { TEMPLATE_CODE } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { notificationCopy, notificationHref } from './notification-labels.ts'

describe('notificationCopy', () => {
  it('menerjemahkan setiap kode template yang dikenal katalog (I1)', () => {
    for (const code of Object.values(TEMPLATE_CODE)) {
      expect(notificationCopy(code).title).not.toBe('Pemberitahuan')
    }
  })

  // Katalog template tumbuh per modul; baris lama tidak boleh hilang dari inbox
  // hanya karena kodenya belum punya terjemahan.
  it('tetap memberi judul untuk kode yang belum diterjemahkan', () => {
    expect(notificationCopy('promo.new').title).toBe('Pemberitahuan')
  })
})

describe('notificationHref', () => {
  it('hanya menautkan related_type yang punya halaman pelanggan', () => {
    expect(notificationHref('booking', 'booking-1')).toBe('/akun/booking/booking-1')
    expect(notificationHref('refund', 'refund-1')).toBeUndefined()
    expect(notificationHref('booking', null)).toBeUndefined()
  })
})
