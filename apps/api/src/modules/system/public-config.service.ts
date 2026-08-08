import { SETTINGS_KEY } from '@hola/shared'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { findPublicSettings } from './public-config.repository.ts'

const PUBLIC_SETTINGS = [
  SETTINGS_KEY.CANCELLATION_POLICY_TEXT,
  SETTINGS_KEY.MIN_SUPPORTED_MOBILE_VERSION,
  SETTINGS_KEY.BOOKING_HORIZON_DAYS,
  SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS,
] as const

type PublicConfigContext = Pick<CoreDependencies, 'db' | 'env'> & { now: Date }

export interface PublicConfig {
  midtrans_client_key: string
  midtrans_is_production: boolean
  server_time: string
  timezone: string
  min_supported_mobile_version: string
  cancellation_policy_text: string | null
  booking_horizon_days: number
  require_contiguous_slots: boolean
  features: {
    whatsapp_enabled: boolean
    otp_login_enabled: boolean
  }
}

function stringSetting(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function nullableStringSetting(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function positiveIntegerSetting(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export async function getPublicConfig(ctx: PublicConfigContext): Promise<PublicConfig> {
  const rows = await findPublicSettings(ctx.db, PUBLIC_SETTINGS)
  const settings = new Map(rows.map((row) => [row.key, row.value]))

  return {
    midtrans_client_key: ctx.env.MIDTRANS_CLIENT_KEY,
    midtrans_is_production: ctx.env.MIDTRANS_IS_PRODUCTION,
    server_time: ctx.now.toISOString(),
    timezone: ctx.env.TZ_BUSINESS,
    min_supported_mobile_version: stringSetting(
      settings.get(SETTINGS_KEY.MIN_SUPPORTED_MOBILE_VERSION),
      '1.0.0',
    ),
    cancellation_policy_text: nullableStringSetting(
      settings.get(SETTINGS_KEY.CANCELLATION_POLICY_TEXT),
    ),
    booking_horizon_days: positiveIntegerSetting(
      settings.get(SETTINGS_KEY.BOOKING_HORIZON_DAYS),
      60,
    ),
    require_contiguous_slots: booleanSetting(
      settings.get(SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS),
      false,
    ),
    features: {
      // [D-04] default sementara — lihat docs/00-OVERVIEW.md § 6.
      // WhatsApp off ⇒ login OTP tidak aktif di v1 (docs/05 § 8).
      whatsapp_enabled: ctx.env.NOTIF_WHATSAPP_ENABLED,
      otp_login_enabled: ctx.env.NOTIF_WHATSAPP_ENABLED,
    },
  }
}
