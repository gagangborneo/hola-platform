import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DevelopmentNoticeDialog,
  NBT_PORTFOLIO_URL,
  NOTICE_INTERVAL_MS,
  shouldShowNotice,
} from './DevelopmentNoticeDialog.tsx'

const NOW = Date.UTC(2026, 7, 11, 10, 0, 0)

describe('shouldShowNotice', () => {
  it('tampil saat perangkat belum pernah melihatnya', () => {
    expect(shouldShowNotice(null, NOW)).toBe(true)
  })

  it('menahan dialog selama jendela 1 jam belum lewat', () => {
    expect(shouldShowNotice(String(NOW - (NOTICE_INTERVAL_MS - 1)), NOW)).toBe(false)
  })

  it('tampil lagi tepat setelah 1 jam', () => {
    expect(shouldShowNotice(String(NOW - NOTICE_INTERVAL_MS), NOW)).toBe(true)
  })

  it('memperlakukan penanda rusak sebagai belum pernah tampil', () => {
    expect(shouldShowNotice('bukan-angka', NOW)).toBe(true)
  })

  it('tidak terkunci ketika jam perangkat mundur', () => {
    expect(shouldShowNotice(String(NOW + NOTICE_INTERVAL_MS * 5), NOW)).toBe(true)
  })
})

describe('DevelopmentNoticeDialog', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('menyebut tim NBT dan menautkannya ke portofolio di tab baru', () => {
    render(<DevelopmentNoticeDialog />)

    const link = screen.getByRole('link', { name: 'NBT' })
    expect(link.getAttribute('href')).toBe(NBT_PORTFOLIO_URL)
    expect(link.getAttribute('target')).toBe('_blank')
    // Tanpa noreferrer, halaman tujuan bisa mengakses window.opener.
    expect(link.getAttribute('rel')).toContain('noreferrer')
  })

  it('tidak muncul lagi pada kunjungan kedua dalam jam yang sama', () => {
    const first = render(<DevelopmentNoticeDialog />)
    expect(screen.queryByRole('dialog')).not.toBeNull()
    first.unmount()

    render(<DevelopmentNoticeDialog />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('muncul kembali setelah penanda melewati 1 jam', () => {
    const first = render(<DevelopmentNoticeDialog />)
    first.unmount()

    window.localStorage.setItem(
      'hola:dev-notice:shown-at',
      String(Date.now() - NOTICE_INTERVAL_MS - 1000),
    )

    render(<DevelopmentNoticeDialog />)
    expect(screen.queryByRole('dialog')).not.toBeNull()
  })
})
