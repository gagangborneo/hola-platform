'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useAuthSession } from '../../lib/auth.ts'
import { cn } from '../../lib/cn.ts'
import { logout } from '../../lib/logout.ts'
import { accountDisplayName, accountIdentity, accountInitials } from '../../lib/session-identity.ts'
import { Badge } from '../ui/badge.tsx'
import { ACCOUNT_NAV, type AccountNavItem, isAccountNavItemActive } from './account-nav.ts'

function SoonBadge(): ReactNode {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
      Segera
    </span>
  )
}

interface NavRowProps {
  item: AccountNavItem
  isActive: boolean
}

/** Baris menu untuk sidebar layar besar: ikon, label, keterangan singkat. */
function NavRow({ item, isActive }: NavRowProps): ReactNode {
  const Icon = item.icon
  const body = (
    <>
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          isActive ? 'text-primary-foreground' : 'text-primary',
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{item.label}</span>
          {item.href ? null : <SoonBadge />}
        </span>
        <span
          className={cn(
            'mt-0.5 block text-xs leading-snug',
            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
          )}
        >
          {item.description}
        </span>
      </span>
    </>
  )

  // `min-w-0` wajib di setiap tingkat antara teks `truncate` dan kotak yang
  // membatasi lebar: baris ini adalah grid item, dan minimum otomatisnya =
  // min-content, yang untuk teks `white-space: nowrap` sama dengan lebar penuh
  // label.
  const className = cn(
    'flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : item.href
        ? 'text-foreground hover:bg-secondary'
        : 'cursor-not-allowed text-muted-foreground',
  )

  if (!item.href) {
    return (
      <span aria-disabled className={className}>
        {body}
      </span>
    )
  }

  return (
    <Link aria-current={isActive ? 'page' : undefined} className={className} href={item.href}>
      {body}
    </Link>
  )
}

/** Versi ringkas untuk layar kecil: satu baris chip yang bisa digeser mendatar. */
function NavChip({ item, isActive }: NavRowProps): ReactNode {
  const Icon = item.icon
  const className = cn(
    'flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold whitespace-nowrap',
    isActive
      ? 'border-primary bg-primary text-primary-foreground'
      : item.href
        ? 'border-border bg-card text-foreground'
        : 'border-border bg-card text-muted-foreground',
  )
  const body = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
      {item.href ? null : <SoonBadge />}
    </>
  )

  if (!item.href) {
    return (
      <span aria-disabled className={className}>
        {body}
      </span>
    )
  }

  return (
    <Link aria-current={isActive ? 'page' : undefined} className={className} href={item.href}>
      {body}
    </Link>
  )
}

/**
 * Navigasi akun pelanggan. Menu dirender dua kali dari konfigurasi yang sama —
 * daftar vertikal pada `lg`, chip yang dapat digeser di bawahnya — supaya tidak
 * ada menu tersembunyi di ponsel dan tidak perlu drawer berbasis JavaScript.
 */
export function AccountSidebar(): ReactNode {
  const pathname = usePathname()
  const router = useRouter()
  const session = useAuthSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const identity = accountIdentity(session.user)

  const signOut = async (): Promise<void> => {
    setIsLoggingOut(true)
    await logout()
    router.replace('/')
  }

  // `min-w-0` pada <aside>: keterangan menu memakai `truncate` (white-space:
  // nowrap), yang membuat min-content sidebar selebar teks terpanjang. Tanpa itu
  // item grid menolak menyusut ke jalur 17rem dan menu melebar melewati kartunya.
  return (
    <aside className="min-w-0 print:hidden lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg font-bold text-primary"
            aria-hidden
          >
            {accountInitials(session.user)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-foreground">
              {accountDisplayName(session.user)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {identity ?? 'Sesi aktif di perangkat ini'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Member Hola</Badge>
          <span className="text-xs text-muted-foreground">Program poin segera hadir</span>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60 lg:hidden"
          disabled={isLoggingOut}
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" aria-hidden />
          {isLoggingOut ? 'Keluar…' : 'Keluar'}
        </button>
      </div>

      <nav aria-label="Menu akun" className="mt-4 hidden rounded-xl border bg-card p-2 lg:block">
        {ACCOUNT_NAV.map((group) => (
          <div key={group.title} className="mb-2 last:mb-0">
            <p className="px-3 pb-1 pt-2 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">
              {group.title}
            </p>
            <div className="grid gap-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  isActive={isAccountNavItemActive(item.href, pathname)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 border-t pt-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={() => void signOut()}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            {isLoggingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      </nav>

      {/* Bleed ke tepi layar supaya chip terakhir terlihat "terpotong" — petunjuk
          visual bahwa daftarnya masih bisa digeser. */}
      <nav
        aria-label="Menu akun"
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden"
      >
        {ACCOUNT_NAV.flatMap((group) => group.items).map((item) => (
          <NavChip
            key={item.label}
            item={item}
            isActive={isAccountNavItemActive(item.href, pathname)}
          />
        ))}
      </nav>
    </aside>
  )
}
