import { describe, expect, it } from 'vitest'
import { activeGroupId, navigationForRole, routableNavigationForRole } from './navigation.ts'

const hrefsFor = (role: 'admin' | 'staff' | 'tenant'): string[] =>
  routableNavigationForRole(role).map((item) => item.href ?? '')

describe('navigasi back-office', () => {
  it('F0-73: tiap role melihat navigasi sesuai ruang kerjanya', () => {
    expect(hrefsFor('admin')).toEqual(
      expect.arrayContaining(['/dashboard/users', '/dashboard/settings', '/dashboard/audit-logs']),
    )
    expect(hrefsFor('staff')).toEqual([
      '/dashboard',
      '/dashboard/analytics/bookings',
      '/dashboard/payments',
      '/dashboard/bookings',
      '/dashboard/schedule',
      '/dashboard/maintenance',
    ])
    expect(hrefsFor('tenant')).toEqual(['/dashboard', '/dashboard/contracts'])
  })

  it('P1-83/84/89/91: konfigurasi lapangan, harga, voucher, dan customer hanya untuk admin', () => {
    const adminOnly = [
      '/dashboard/courts',
      '/dashboard/price-rules',
      '/dashboard/vouchers',
      '/dashboard/customers',
    ]
    const staffHrefs = hrefsFor('staff')

    expect(hrefsFor('admin')).toEqual(expect.arrayContaining(adminOnly))
    for (const href of adminOnly) expect(staffHrefs).not.toContain(href)
  })

  it('grup tanpa item yang boleh dilihat peran ini tidak ikut dirender', () => {
    expect(navigationForRole('tenant').map((group) => group.id)).toEqual(['dashboard', 'tenant'])
    expect(navigationForRole('staff').map((group) => group.id)).toEqual([
      'dashboard',
      'finance',
      'sales',
      'maintenance',
    ])
  })

  it('modul roadmap tampil sebagai teks — tanpa href, jadi tidak bisa diklik', () => {
    const roadmapOnly = ['accounting', 'membership', 'event', 'coaching', 'purchasing', 'hr']
    const groups = navigationForRole('admin')

    for (const id of roadmapOnly) {
      const group = groups.find((entry) => entry.id === id)
      expect(group, `grup ${id} harus ada`).toBeDefined()
      expect(group?.items.every((item) => item.href === undefined)).toBe(true)
      expect(group?.items.length).toBeGreaterThan(0)
    }
  })

  it('satu fitur hanya muncul di satu modul', () => {
    const labels = navigationForRole('admin').flatMap((group) =>
      group.items.map((item) => `${group.id}:${item.label}`),
    )
    expect(new Set(labels).size).toBe(labels.length)

    // Membership, event, dan coaching punya modulnya sendiri, jadi Penjualan
    // tidak boleh mengulangnya.
    const sales = navigationForRole('admin').find((group) => group.id === 'sales')
    const salesLabels = sales?.items.map((item) => item.label) ?? []
    expect(salesLabels).not.toContain('Paket & membership')
    expect(salesLabels).not.toContain('Turnamen')
  })

  it('sidebar membuka grup yang memuat rute aktif, termasuk rute anaknya', () => {
    expect(activeGroupId('admin', '/dashboard/analytics/executive')).toBe('dashboard')
    expect(activeGroupId('admin', '/dashboard/vouchers')).toBe('sales')
    expect(activeGroupId('admin', '/dashboard/customers/abc-123')).toBe('crm')
    expect(activeGroupId('admin', '/dashboard/tidak-ada')).toBeNull()
  })

  it('`/dashboard` tidak mengklaim rute anak — kalau tidak, semua grup ikut terbuka', () => {
    expect(activeGroupId('admin', '/dashboard')).toBe('dashboard')
    expect(activeGroupId('admin', '/dashboard/users')).toBe('user-management')
  })
})
