'use client'

import { Button } from '@hola/ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APP_VERSION, BUILD_SHA } from '../../lib/app-version.ts'
import { authStore, useAuthSession } from '../../lib/auth.ts'
import { env } from '../../lib/env.ts'
import { ChevronIcon, MenuIcon, NavIcon } from './NavIcon.tsx'
import { activeGroupId, type NavigationGroup, navigationForRole } from './navigation.ts'
import { UserMenu } from './UserMenu.tsx'

interface AdminShellProps {
  children: ReactNode
}

const EXPANDED_GROUPS_KEY = 'hola.admin.nav.expanded-groups'

function roleLabel(role: string): string {
  if (role === 'admin') return 'Administrator'
  if (role === 'staff') return 'Staff operasional'
  return 'Tenant'
}

function readExpandedGroups(): string[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(EXPANDED_GROUPS_KEY)
    if (raw === null || raw === undefined) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    // Storage bisa ditolak (mode privat, kuota). Sidebar tetap harus tampil.
    return null
  }
}

function writeExpandedGroups(ids: ReadonlySet<string>): void {
  try {
    globalThis.localStorage?.setItem(EXPANDED_GROUPS_KEY, JSON.stringify([...ids]))
  } catch {
    // Preferensi tampilan tidak sepadan untuk menggagalkan render.
  }
}

/**
 * Grup mana yang terbuka.
 *
 * Pilihan operator disimpan supaya modul yang sering dipakai tetap terbuka
 * antar-kunjungan. Grup rute aktif dibuka otomatis, tetapi HANYA saat rute
 * berpindah grup — kalau tidak, grup yang baru saja ditutup operator akan
 * langsung terbuka lagi dan tombolnya terasa rusak.
 */
function useExpandedGroups(activeId: string | null): {
  expanded: ReadonlySet<string>
  toggle: (id: string) => void
} {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set<string>())
  const previousActiveId = useRef<string | null>(null)
  const isRestored = useRef(false)

  useEffect(() => {
    if (isRestored.current) return
    isRestored.current = true
    const stored = readExpandedGroups()
    setExpanded(new Set(stored ?? (activeId === null ? [] : [activeId])))
  }, [activeId])

  useEffect(() => {
    if (activeId === null || previousActiveId.current === activeId) return
    previousActiveId.current = activeId
    setExpanded((current) => (current.has(activeId) ? current : new Set([...current, activeId])))
  }, [activeId])

  const toggle = (id: string): void => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      writeExpandedGroups(next)
      return next
    })
  }

  return { expanded, toggle }
}

const RAIL_MODE_KEY = 'hola.admin.nav.rail'

/**
 * Sidebar terkuncup jadi rel ikon.
 *
 * Nilai awalnya selalu `false`, baru dipulihkan dari storage setelah mount:
 * membaca `localStorage` saat render membuat markup server dan klien berbeda,
 * dan React melaporkannya sebagai hydration mismatch.
 */
function useRailMode(): { isRail: boolean; setRail: (value: boolean) => void } {
  const [isRail, setIsRail] = useState(false)
  const isRestored = useRef(false)

  useEffect(() => {
    if (isRestored.current) return
    isRestored.current = true
    try {
      if (globalThis.localStorage?.getItem(RAIL_MODE_KEY) === '1') setIsRail(true)
    } catch {
      // Sidebar tetap tampil lebar kalau storage ditolak.
    }
  }, [])

  const setRail = (value: boolean): void => {
    setIsRail(value)
    try {
      globalThis.localStorage?.setItem(RAIL_MODE_KEY, value ? '1' : '0')
    } catch {
      // Preferensi tampilan tidak sepadan untuk menggagalkan render.
    }
  }

  return { isRail, setRail }
}

function NavGroup({
  group,
  isExpanded,
  isRail,
  onToggle,
  pathname,
}: {
  group: NavigationGroup
  isExpanded: boolean
  isRail: boolean
  onToggle: () => void
  pathname: string
}): ReactNode {
  const panelId = `nav-group-${group.id}`
  const hasActiveChild = group.items.some((item) => item.href === pathname)
  // Dalam mode rail sub-menu tidak terlihat, jadi penanda halaman aktif harus
  // tetap muncul walau grupnya sedang terbuka.
  const isMarked = hasActiveChild && (isRail || !isExpanded)

  return (
    <div className="nav-group">
      <button
        aria-controls={panelId}
        aria-expanded={isExpanded}
        className={isMarked ? 'nav-group-toggle is-marked' : 'nav-group-toggle'}
        onClick={onToggle}
        title={isRail ? group.label : undefined}
        type="button"
      >
        <NavIcon name={group.icon} />
        <span className="nav-group-label">{group.label}</span>
        <ChevronIcon />
      </button>
      <ul className="nav-group-items" hidden={!isExpanded} id={panelId}>
        {group.items.map((item) => (
          <li key={item.href ?? `${group.id}:${item.label}`}>
            {item.href === undefined ? (
              <span className="nav-link nav-link-planned">
                {item.label}
                <em>Segera</em>
              </span>
            ) : (
              <Link
                aria-current={pathname === item.href ? 'page' : undefined}
                className={pathname === item.href ? 'nav-link nav-link-active' : 'nav-link'}
                href={item.href}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminShell({ children }: AdminShellProps): ReactNode {
  const pathname = usePathname()
  const router = useRouter()
  const session = useAuthSession()
  const user = session.user
  const role = user?.role ?? null

  const groups = useMemo(() => (role === null ? [] : navigationForRole(role)), [role])
  const activeId = useMemo(
    () => (role === null ? null : activeGroupId(role, pathname)),
    [pathname, role],
  )
  const { expanded, toggle } = useExpandedGroups(activeId)
  const { isRail, setRail } = useRailMode()

  // Di layar sempit sidebar menutupi konten, jadi berpindah halaman harus
  // menutupnya. Yang disimpan adalah rute saat laci dibuka, bukan boolean:
  // begitu `pathname` berubah, "terbuka" berhenti benar dengan sendirinya —
  // tanpa efek yang menyinkronkan state ke rute setelah render.
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null)
  const isMobileNavOpen = openedAtPath === pathname

  // Mengklik ikon modul saat sidebar terkuncup membentangkannya kembali dan
  // membuka grup itu — kalau tidak, kliknya hanya membuka daftar yang tak terlihat.
  const onGroupToggle = (id: string): void => {
    if (isRail) {
      setRail(false)
      if (!expanded.has(id)) toggle(id)
      return
    }
    toggle(id)
  }

  const logout = async (): Promise<void> => {
    try {
      const accessToken = authStore.getAccessToken()
      if (accessToken) {
        await globalThis.fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
    } catch {
      // Pembersihan sesi lokal tetap harus berjalan jika API sedang tidak dapat dijangkau.
    } finally {
      authStore.clearAccessToken()
      router.replace('/login')
    }
  }

  if (!user) return null

  const asideClass = [
    'side-nav',
    isRail ? 'side-nav-rail' : '',
    isMobileNavOpen ? 'side-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={isRail ? 'admin-shell is-rail' : 'admin-shell'}>
      <aside className={asideClass} id="admin-side-nav">
        <div className="side-head">
          <Link className="brand" href="/dashboard" title="Hola Back Office">
            <span aria-hidden="true" className="brand-mark">
              H
            </span>
            <span className="brand-name">Hola Back Office</span>
          </Link>
          <p className="side-role">{roleLabel(user.role)}</p>
        </div>
        <nav aria-label="Navigasi back-office">
          {groups.map((group) => (
            <NavGroup
              group={group}
              isExpanded={expanded.has(group.id)}
              isRail={isRail}
              key={group.id}
              onToggle={() => onGroupToggle(group.id)}
              pathname={pathname}
            />
          ))}
        </nav>
        <p className="side-version">
          <span>Versi aplikasi</span>
          <strong>v{APP_VERSION}</strong>
          <small>build {BUILD_SHA}</small>
        </p>
      </aside>
      <div className="main-shell">
        <header className="admin-header">
          {/*
            Dua tombol, bukan satu yang pintar: di layar lebar hamburger
            menguncupkan sidebar jadi rel ikon, di layar sempit ia membuka laci.
            Satu tombol yang berganti arti mengikuti lebar layar berarti menebak
            breakpoint di JavaScript, dan tebakan itu salah saat render pertama.
          */}
          <Button
            aria-controls="admin-side-nav"
            aria-expanded={!isRail}
            aria-label={isRail ? 'Bentangkan menu samping' : 'Kuncupkan menu samping'}
            className="mr-auto hidden min-[52rem]:inline-flex"
            onClick={() => setRail(!isRail)}
            size="icon"
            variant="secondary"
          >
            <MenuIcon />
          </Button>
          <Button
            aria-controls="admin-side-nav"
            aria-expanded={isMobileNavOpen}
            aria-label={isMobileNavOpen ? 'Tutup menu' : 'Buka menu'}
            className="mr-auto inline-flex min-[52rem]:hidden"
            onClick={() => setOpenedAtPath(isMobileNavOpen ? null : pathname)}
            size="icon"
            variant="secondary"
          >
            <MenuIcon />
          </Button>
          <UserMenu
            email={user.email ?? null}
            fullName={user.fullName}
            onLogout={() => void logout()}
            roleLabel={roleLabel(user.role)}
          />
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
