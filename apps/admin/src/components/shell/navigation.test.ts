import { describe, expect, it } from 'vitest'
import { navigationForRole } from './navigation.ts'

describe('navigasi back-office', () => {
  it('F0-73: tiap role melihat navigasi sesuai ruang kerjanya', () => {
    expect(navigationForRole('admin').map((item) => item.href)).toEqual(
      expect.arrayContaining(['/dashboard/users', '/dashboard/settings', '/dashboard/audit-logs']),
    )
    expect(navigationForRole('staff').map((item) => item.href)).toEqual([
      '/dashboard',
      '/dashboard/schedule',
      '/dashboard/bookings',
      '/dashboard/payments',
      '/dashboard/maintenance',
    ])
    expect(navigationForRole('tenant').map((item) => item.href)).toEqual([
      '/dashboard',
      '/dashboard/contracts',
    ])
  })

  it('P1-83/84/89/91: konfigurasi lapangan, harga, voucher, dan customer hanya untuk admin', () => {
    const adminOnly = [
      '/dashboard/courts',
      '/dashboard/price-rules',
      '/dashboard/vouchers',
      '/dashboard/customers',
    ]
    const staffHrefs = navigationForRole('staff').map((item) => item.href)
    const adminHrefs = navigationForRole('admin').map((item) => item.href)

    expect(adminHrefs).toEqual(expect.arrayContaining(adminOnly))
    for (const href of adminOnly) expect(staffHrefs).not.toContain(href)
  })
})
