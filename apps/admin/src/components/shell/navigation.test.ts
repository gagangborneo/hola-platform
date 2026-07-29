import { describe, expect, it } from 'vitest'
import { navigationForRole } from './navigation.ts'

describe('navigasi back-office', () => {
  it('F0-73: tiap role melihat navigasi sesuai ruang kerjanya', () => {
    expect(navigationForRole('admin').map((item) => item.href)).toEqual(
      expect.arrayContaining(['/dashboard/users', '/dashboard/settings', '/dashboard/audit-logs']),
    )
    expect(navigationForRole('staff').map((item) => item.href)).toEqual([
      '/dashboard',
      '/dashboard/bookings',
    ])
    expect(navigationForRole('tenant').map((item) => item.href)).toEqual([
      '/dashboard',
      '/dashboard/contracts',
    ])
  })
})
