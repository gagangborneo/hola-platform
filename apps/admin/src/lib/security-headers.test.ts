import { describe, expect, it } from 'vitest'
import { createSecurityHeaders } from './security-headers.ts'

describe('security headers admin', () => {
  it('F0-73 / S-4: CSP dan empat header keamanan wajib dipasang untuk back-office', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: 'https://public@o1.ingest.de.sentry.io/1',
    })
    const values = new Map(headers.map((header) => [header.key, header.value]))

    expect(values.get('Content-Security-Policy')).toContain('https://api.hola.test')
    expect(values.get('Content-Security-Policy')).toContain('https://o1.ingest.de.sentry.io')
    expect(values.get('X-Content-Type-Options')).toBe('nosniff')
    expect(values.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(values.get('X-Frame-Options')).toBe('DENY')
  })
})
