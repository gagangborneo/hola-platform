import { describe, expect, it } from 'vitest'
import { createSecurityHeaders } from './security-headers.ts'

describe('security headers admin', () => {
  it('F0-73 / S-4: CSP dan empat header keamanan wajib dipasang untuk back-office', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      mediaBaseUrl: 'https://media.hola.test/hola-media',
      sentryDsn: 'https://public@o1.ingest.de.sentry.io/1',
    })
    const values = new Map(headers.map((header) => [header.key, header.value]))

    expect(values.get('Content-Security-Policy')).toContain('https://api.hola.test')
    expect(values.get('Content-Security-Policy')).toContain('https://o1.ingest.de.sentry.io')
    expect(values.get('X-Content-Type-Options')).toBe('nosniff')
    expect(values.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(values.get('X-Frame-Options')).toBe('DENY')
  })

  it('P1-83: origin object storage masuk connect-src supaya presigned PUT tidak diblokir CSP', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      mediaBaseUrl: 'http://localhost:9000/hola-media',
      sentryDsn: undefined,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )
    const connectSrc = csp?.split('; ').find((directive) => directive.startsWith('connect-src '))
    const imgSrc = csp?.split('; ').find((directive) => directive.startsWith('img-src '))

    expect(connectSrc).toContain('http://localhost:9000')
    expect(imgSrc).toContain('http://localhost:9000')
  })

  it('media base url yang tidak valid tidak boleh melebarkan CSP', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      mediaBaseUrl: 'bukan-url',
      sentryDsn: undefined,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )

    expect(csp).toContain("connect-src 'self' https://api.hola.test")
    expect(csp).not.toContain('bukan-url')
  })
})
