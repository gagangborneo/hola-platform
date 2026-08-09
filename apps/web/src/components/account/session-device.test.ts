import { describe, expect, it } from 'vitest'
import { sessionDeviceName } from './session-device.ts'

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'

describe('sessionDeviceName', () => {
  it('memakai X-Client-Platform saat tersedia, bukan menebak dari User-Agent', () => {
    expect(sessionDeviceName({ device_label: 'mobile-ios', user_agent: CHROME_MAC })).toBe(
      'Aplikasi iOS',
    )
  })

  it('menyebut peramban dan sistem operasi dari User-Agent', () => {
    expect(sessionDeviceName({ device_label: null, user_agent: CHROME_MAC })).toBe(
      'Chrome di macOS',
    )
  })

  // Edge dan Chrome sama-sama menulis "Chrome/"; yang lebih spesifik harus menang.
  it('tidak salah menyebut Edge sebagai Chrome', () => {
    expect(sessionDeviceName({ device_label: null, user_agent: EDGE_WINDOWS })).toBe(
      'Edge di Windows',
    )
  })

  it('tetap memberi nama saat tidak ada petunjuk sama sekali', () => {
    expect(sessionDeviceName({ device_label: null, user_agent: null })).toBe(
      'Perangkat tidak dikenal',
    )
  })
})
