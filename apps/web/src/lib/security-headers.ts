export interface SecurityHeader {
  key: string
  value: string
}

export interface SecurityHeaderOptions {
  apiBaseUrl: string | undefined
  isDevelopment: boolean
  sentryDsn: string | undefined
}

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

/** Header S-4 dengan origin API/Sentry yang dipersempit dari konfigurasi build. */
export function createSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  const connectSources = ["'self'", originOf(options.apiBaseUrl), originOf(options.sentryDsn)]
    .filter((source): source is string => source !== undefined)
    .join(' ')
  const scriptSources = options.isDevelopment
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'"
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
    `connect-src ${connectSources}`,
  ].join('; ')

  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ]
}
