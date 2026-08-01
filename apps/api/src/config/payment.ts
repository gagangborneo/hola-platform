import type { PaymentMethod } from '@hola/shared'
import { env } from '../env.ts'
import { MidtransProvider } from '../providers/payment/midtrans-provider.ts'
import type { PaymentProvider } from '../providers/payment/payment-provider.ts'

export type PaymentProviderFactory = (
  refundApiSupportedMethods: readonly PaymentMethod[],
) => PaymentProvider

/** Provider dibentuk dari env tervalidasi; capability dinamis disuntikkan dari app_settings. */
export const paymentProviderFactory: PaymentProviderFactory = (refundApiSupportedMethods) =>
  new MidtransProvider({
    serverKey: env.MIDTRANS_SERVER_KEY,
    isProduction: env.MIDTRANS_IS_PRODUCTION,
    paymentExpiryMinutes: env.PAYMENT_EXPIRY_MINUTES,
    refundApiSupportedMethods,
  })
