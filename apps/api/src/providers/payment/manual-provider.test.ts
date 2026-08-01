import { describe, expect, it } from 'vitest'
import { ManualProvider, UnsupportedPaymentOperationError } from './manual-provider.ts'

describe('P1-47 ManualProvider', () => {
  it('tidak menyediakan operasi jaringan dan semua capability refund false', async () => {
    const provider = new ManualProvider()
    await expect(
      provider.getTransactionStatus({ provider_order_id: 'manual' }),
    ).rejects.toBeInstanceOf(UnsupportedPaymentOperationError)
    expect(Object.values(provider.capabilities().supports_api_refund_by_method)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })
})
