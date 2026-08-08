import { describe, expect, it } from 'vitest'
import { createSecurityHeaders } from './security-headers.ts'

describe('security headers web', () => {
  it('F0-69 / S-4: memasang CSP dan empat header keamanan wajib', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: 'https://public@o1.ingest.de.sentry.io/1',
      midtransIsProduction: false,
    })
    const values = new Map(headers.map((header) => [header.key, header.value]))

    expect(values.get('Content-Security-Policy')).toContain('connect-src')
    expect(values.get('Content-Security-Policy')).toContain('https://api.hola.test')
    expect(values.get('Content-Security-Policy')).toContain('https://o1.ingest.de.sentry.io')
    expect(values.get('X-Content-Type-Options')).toBe('nosniff')
    expect(values.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(values.get('X-Frame-Options')).toBe('DENY')
  })

  it('P1-76: CSP mengizinkan skrip dan iframe Snap produksi', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: undefined,
      midtransIsProduction: true,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )

    expect(csp).toContain('frame-src')
    expect(csp).toContain('https://app.midtrans.com')
    expect(csp).not.toContain('https://app.sandbox.midtrans.com')
  })

  it('P1-76: build non-produksi hanya mengizinkan origin sandbox', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: undefined,
      midtransIsProduction: false,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )

    expect(csp).toContain('https://app.sandbox.midtrans.com')
    expect(csp).not.toContain('https://app.midtrans.com')
  })
})
