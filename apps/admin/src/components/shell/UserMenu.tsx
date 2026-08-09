'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@hola/ui'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

interface UserMenuProps {
  readonly email: string | null
  readonly fullName: string
  readonly onLogout: () => void
  readonly roleLabel: string
}

/** Inisial dari satu atau dua kata pertama; sisanya jadi bising di lingkaran 2,3rem. */
function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? '?'
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return `${first}${second}`.toUpperCase()
}

/**
 * Menu akun.
 *
 * Dibangun di atas Radix DropdownMenu, bukan panel buatan sendiri: klik di
 * luar, Escape, pengembalian fokus, penguncian scroll, dan navigasi panah
 * semuanya sudah benar di sana. Versi tulisan tangan sebelumnya menangani dua
 * yang pertama dan diam-diam melewatkan sisanya.
 */
export function UserMenu({ email, fullName, onLogout, roleLabel }: UserMenuProps): ReactNode {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=open]:border-border data-[state=open]:bg-muted">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          {initialsOf(fullName)}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">{fullName}</span>
          <span className="truncate text-xs text-muted-foreground">{email ?? roleLabel}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-60">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="text-sm font-semibold text-foreground">{fullName}</span>
          <span className="text-xs break-words text-muted-foreground">
            {email ?? 'Akun operasional'}
          </span>
          <span className="mt-1 text-[0.68rem] font-bold tracking-wider text-primary uppercase">
            {roleLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/*
          Profil belum punya halaman, jadi ia item nonaktif dengan penanda —
          bukan item hidup yang tidak melakukan apa pun saat diklik.
        */}
        <DropdownMenuItem disabled>
          <UserRound />
          Profil
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-muted-foreground uppercase">
            Segera
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
