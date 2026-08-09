export interface SecurityHeader {
  key: string
  value: string
}

export interface SecurityHeaderOptions {
  apiBaseUrl: string | undefined
  isDevelopment: boolean
  /**
   * Origin object storage. Presigned upload melakukan `PUT` langsung ke sana
   * dari peramban (docs/02 § 6) — tanpa origin ini di `connect-src`, unggah
   * foto lapangan diblokir CSP dan hanya terlihat sebagai kegagalan jaringan.
   */
  mediaBaseUrl: string | undefined
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
  const mediaOrigin = originOf(options.mediaBaseUrl)
  const connectSources = [
    "'self'",
    originOf(options.apiBaseUrl),
    mediaOrigin,
    originOf(options.sentryDsn),
  ]
    .filter((source): source is string => source !== undefined)
    .join(' ')
  // `https:` menutupi storage produksi; origin eksplisit diperlukan untuk MinIO
  // lokal yang berjalan di `http://`.
  const imageSources = ["'self'", 'data:', 'blob:', 'https:', mediaOrigin]
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
    `img-src ${imageSources}`,
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
