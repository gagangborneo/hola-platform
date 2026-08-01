import { describe, expect, it } from 'vitest'
import { applyPaymentTransition, mapMidtransStatus } from './payment-state.ts'

describe('P1-51 payment state machine', () => {
  it.each(['paid', 'expired', 'failed', 'cancelled'] as const)(
    'BR-P-33: pending dapat berubah menjadi %s',
    (status) => {
      expect(
        applyPaymentTransition(
          { status: 'pending', needsManualReview: false, failureReason: null },
          { status, needsManualReview: false, failureReason: null },
        ).changed,
      ).toBe(true)
    },
  )

  it('BR-P-33: status yang sama menjadi no-op', () => {
    expect(
      applyPaymentTransition(
        { status: 'paid', needsManualReview: false, failureReason: null },
        { status: 'paid', needsManualReview: false, failureReason: null },
      ).changed,
    ).toBe(false)
  })

  it('BR-P-33: menolak transisi mundur', () => {
    expect(() =>
      applyPaymentTransition(
        { status: 'paid', needsManualReview: false, failureReason: null },
        { status: 'pending', needsManualReview: false, failureReason: null },
      ),
    ).toThrow(/tidak diizinkan/)
  })

  it('E-3: hanya provider settlement yang mengizinkan expired → paid', () => {
    const current = { status: 'expired' as const, needsManualReview: false, failureReason: null }
    const paid = { status: 'paid' as const, needsManualReview: false, failureReason: null }
    expect(() => applyPaymentTransition(current, paid)).toThrow(/tidak diizinkan/)
    expect(applyPaymentTransition(current, paid, 'provider_settlement').changed).toBe(true)
  })

  it.each([
    ['settlement', undefined, 'paid', false, null, undefined],
    ['capture', 'accept', 'paid', false, null, undefined],
    ['capture', 'challenge', 'pending', true, null, undefined],
    ['capture', 'deny', 'failed', false, 'fraud_deny', undefined],
    ['pending', undefined, 'pending', false, null, undefined],
    ['deny', undefined, 'failed', false, 'deny', undefined],
    ['cancel', undefined, 'cancelled', false, null, undefined],
    ['expire', undefined, 'expired', false, null, undefined],
    ['failure', undefined, 'failed', false, 'failure', undefined],
    ['refund', undefined, 'paid', false, null, 'full'],
    ['partial_refund', undefined, 'paid', false, null, 'partial'],
  ] as const)(
    'BR-P-33: Midtrans %s/%s → %s',
    (transactionStatus, fraudStatus, status, review, reason, refundStatus) => {
      expect(mapMidtransStatus({ transactionStatus, fraudStatus })).toEqual({
        status,
        needsManualReview: review,
        failureReason: reason,
        ...(refundStatus ? { refundStatus } : {}),
      })
    },
  )
})
