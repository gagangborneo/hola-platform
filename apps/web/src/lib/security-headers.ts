export interface SecurityHeader {
  key: string
  value: string
}

export interface SecurityHeaderOptions {
  apiBaseUrl: string | undefined
  isDevelopment: boolean
  sentryDsn: string | undefined
  /** Menentukan satu origin Snap yang diizinkan; sandbox tidak pernah ikut ke CSP produksi. */
  midtransIsProduction: boolean
}

export const MIDTRANS_ORIGIN = {
  production: 'https://app.midtrans.com',
  sandbox: 'https://app.sandbox.midtrans.com',
} as const

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

/** Header S-4 dengan origin API/Sentry/Midtrans yang dipersempit dari konfigurasi build. */
export function createSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  const midtransOrigin = options.midtransIsProduction
    ? MIDTRANS_ORIGIN.production
    : MIDTRANS_ORIGIN.sandbox
  const connectSources = [
    "'self'",
    originOf(options.apiBaseUrl),
    originOf(options.sentryDsn),
    midtransOrigin,
  ]
    .filter((source): source is string => source !== undefined)
    .join(' ')
  const scriptSources = options.isDevelopment
    ? `'self' 'unsafe-inline' 'unsafe-eval' ${midtransOrigin}`
    : `'self' 'unsafe-inline' ${midtransOrigin}`
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `frame-src 'self' ${midtransOrigin}`,
    `connect-src ${connectSources}`,
  ].join('; ')

  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ]
}
