import { describe, expect, it } from 'vitest'
import {
  bullboardRequestIp,
  isBullboardAuthorized,
  isBullboardIpAllowed,
} from './bullboard.security.ts'

describe('proteksi Bull Board', () => {
  it('F0-63: dashboard default-deny untuk IP dan basic auth yang tidak cocok', () => {
    const credentials = Buffer.from('operator:rahasia-kuat', 'utf8').toString('base64')
    expect(isBullboardIpAllowed(undefined, ['127.0.0.1'])).toBe(false)
    expect(isBullboardIpAllowed('::ffff:127.0.0.1', ['127.0.0.1'])).toBe(true)
    expect(isBullboardAuthorized(undefined, 'operator', 'rahasia-kuat')).toBe(false)
    expect(isBullboardAuthorized(`Basic ${credentials}`, 'operator', 'rahasia-kuat')).toBe(true)
    expect(isBullboardAuthorized(`Basic ${credentials}`, 'operator', 'berbeda')).toBe(false)
  })

  it('F0-63: hanya IP klien pertama dari proxy tepercaya yang dipakai', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.2' })
    expect(bullboardRequestIp(headers)).toBe('203.0.113.10')
  })
})
