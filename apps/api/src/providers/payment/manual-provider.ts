import type {
  CreateProviderTransactionInput,
  CreateRefundInput,
  ParsedProviderWebhook,
  PaymentProvider,
  PaymentProviderCapabilities,
  ProviderTransactionStatus,
} from './payment-provider.ts'

export { UnsupportedPaymentOperationError } from './payment-provider.ts'

import { UnsupportedPaymentOperationError } from './payment-provider.ts'

/** Provider pencatatan tunai/transfer; tidak pernah melakukan network I/O. */
export class ManualProvider implements PaymentProvider {
  async createTransaction(_input: CreateProviderTransactionInput): Promise<never> {
    throw new UnsupportedPaymentOperationError('createTransaction')
  }

  async getTransactionStatus(_input: {
    provider_order_id: string
  }): Promise<ProviderTransactionStatus> {
    throw new UnsupportedPaymentOperationError('getTransactionStatus')
  }

  parseWebhook(_input: {
    headers: Readonly<Record<string, string | undefined>>
    rawBody: string
  }): ParsedProviderWebhook {
    throw new UnsupportedPaymentOperationError('parseWebhook')
  }

  async createRefund(_input: CreateRefundInput): Promise<never> {
    throw new UnsupportedPaymentOperationError('createRefund')
  }

  capabilities(): PaymentProviderCapabilities {
    return {
      supports_api_refund_by_method: {
        qris: false,
        gopay: false,
        shopeepay: false,
        bank_transfer_va: false,
        credit_card: false,
        cash: false,
        manual_transfer: false,
      },
    }
  }
}
