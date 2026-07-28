/**
 * Schema env `apps/api` (dipakai container `hola-api` dan `hola-worker`).
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 8.1.
 *
 * File ini hanya MENDESKRIPSIKAN bentuk env — ia tidak membaca `process.env`
 * (packages/shared harus jalan di React Native). apps/api memanggil
 * `apiEnvSchema.parse(process.env)` di `env.ts` dan **gagal keras saat boot**
 * kalau ada yang hilang (docs/02 § 8).
 */
import { z } from 'zod'
import { booleanFromEnv, csvList, intFromEnv, numberFromEnv, optionalCsvList } from './shared.ts'

export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_ENV: z.enum(['local', 'staging', 'prod']),
    PORT: intFromEnv.default(4000),

    API_BASE_URL: z.url(),
    WEB_BASE_URL: z.url(),
    ADMIN_BASE_URL: z.url(),
    CORS_ORIGINS: csvList,

    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: intFromEnv.default(10),
    REDIS_URL: z.string().min(1),

    // 32+ byte acak. Panjang minimum ditegakkan agar secret lemah tidak lolos
    // ke produksi tanpa disadari.
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: intFromEnv.default(30),
    PASSWORD_PEPPER: z.string().min(16),
    COOKIE_DOMAIN: z.string().min(1),

    TZ_BUSINESS: z.string().default('Asia/Makassar'),
    SLOT_HOLD_TTL_SECONDS: intFromEnv.default(600),
    PAYMENT_EXPIRY_MINUTES: intFromEnv.default(15),

    MIDTRANS_SERVER_KEY: z.string().min(1),
    MIDTRANS_CLIENT_KEY: z.string().min(1),
    MIDTRANS_MERCHANT_ID: z.string().min(1),
    MIDTRANS_IS_PRODUCTION: booleanFromEnv,
    MIDTRANS_WEBHOOK_ALLOWED_IPS: optionalCsvList.default([]),

    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_MEDIA: z.string().min(1),
    S3_BUCKET_PRIVATE: z.string().min(1),
    S3_BUCKET_BACKUP: z.string().min(1),
    S3_FORCE_PATH_STYLE: booleanFromEnv.default(false),
    MEDIA_PUBLIC_BASE_URL: z.url(),

    MAIL_TRANSPORT: z.enum(['resend', 'smtp', 'console']).default('resend'),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().min(1),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: intFromEnv.optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    EXPO_ACCESS_TOKEN: z.string().min(1),

    NOTIF_WHATSAPP_ENABLED: booleanFromEnv.default(false),
    WHATSAPP_PROVIDER: z.string().optional(),
    WHATSAPP_API_KEY: z.string().optional(),
    WHATSAPP_SENDER: z.string().optional(),

    SENTRY_DSN: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: numberFromEnv.default(0.1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RATE_LIMIT_ENABLED: booleanFromEnv.default(true),
    INTERNAL_TOKEN: z.string().min(32),

    BULLBOARD_USER: z.string().min(1),
    BULLBOARD_PASSWORD: z.string().min(1),

    BACKUP_ENABLED: booleanFromEnv.default(true),
    BACKUP_RETENTION_DAYS: intFromEnv.default(30),
  })
  .superRefine((env, ctx) => {
    // docs/02 § 8.1: RESEND_API_KEY bertanda ✓* — wajib HANYA bila transport-nya resend.
    if (env.MAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Wajib diisi saat MAIL_TRANSPORT=resend',
      })
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'Wajib diisi saat MAIL_TRANSPORT=smtp',
      })
    }
    // D-04: mengaktifkan WhatsApp berarti provider & kredensialnya wajib ada.
    if (env.NOTIF_WHATSAPP_ENABLED && !env.WHATSAPP_PROVIDER) {
      ctx.addIssue({
        code: 'custom',
        path: ['WHATSAPP_PROVIDER'],
        message: 'Wajib diisi saat NOTIF_WHATSAPP_ENABLED=true',
      })
    }
  })

export type ApiEnv = z.infer<typeof apiEnvSchema>
