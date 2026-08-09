import { describe, expect, it } from 'vitest'
import { parseRefundList, refundChannelLabel } from './refunds.ts'

const row = {
  id: 'refund-1',
  refund_code: 'RF-2608-0001',
  payment_id: 'payment-1',
  amount: 90_000,
  status: 'approved',
  channel: 'manual_transfer',
  reason: 'Hujan deras',
  policy_applied: 'option_b_50_percent',
  requested_by_user_id: 'user-1',
  approved_by_user_id: 'admin-1',
  approved_at: '2026-08-02T02:00:00.000Z',
  completed_at: null,
  failure_reason: null,
  created_at: '2026-08-01T02:00:00.000Z',
  updated_at: '2026-08-02T02:00:00.000Z',
}

describe('parseRefundList', () => {
  it('memetakan envelope API ke bentuk yang dipakai UI', () => {
    expect(parseRefundList({ data: [row] })).toEqual([
      {
        id: 'refund-1',
        refundCode: 'RF-2608-0001',
        amount: 90_000,
        status: 'approved',
        channel: 'manual_transfer',
        reason: 'Hujan deras',
        policyApplied: 'option_b_50_percent',
        approvedAt: '2026-08-02T02:00:00.000Z',
        completedAt: null,
        failureReason: null,
        createdAt: '2026-08-01T02:00:00.000Z',
      },
    ])
  })

  it('menerima daftar kosong', () => {
    expect(parseRefundList({ data: [] })).toEqual([])
  })

  /**
   * Ini soal uang customer: satu baris yang tidak dikenali harus menjatuhkan
   * seluruh permintaan supaya UI menampilkan "gagal dimuat", bukan diam-diam
   * menyembunyikan refund yang sedang ditunggu.
   */
  it('melempar saat ada baris yang bentuknya tidak dikenali, bukan membuangnya', () => {
    expect(() => parseRefundList({ data: [row, { id: 'refund-2' }] })).toThrow()
  })

  it('melempar saat envelope-nya bukan daftar', () => {
    expect(() => parseRefundList({ data: null })).toThrow()
    expect(() => parseRefundList(null)).toThrow()
  })
})

describe('label kanal refund', () => {
  it('menerjemahkan kanal yang dikenal dan tidak membocorkan enum mentah', () => {
    expect(refundChannelLabel('manual_transfer')).toBe('Transfer bank')
    expect(refundChannelLabel('cash')).toBe('Tunai di lokasi')
    expect(refundChannelLabel('gateway')).toBe('Kembali ke metode pembayaran')
    expect(refundChannelLabel('sesuatu_baru')).toBe('Kanal lain')
  })
})
