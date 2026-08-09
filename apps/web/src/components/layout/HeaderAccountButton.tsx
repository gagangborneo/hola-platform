'use client'

import { ChevronRight, UserRound } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuthSession } from '../../lib/auth.ts'
import { accountIdentityLabel, accountInitials } from '../../lib/session-identity.ts'
import { Button } from '../ui/button.tsx'

/**
 * Slot kanan header: tombol "Masuk" untuk tamu, identitas akun untuk yang sudah
 * masuk. Selama sesi dipulihkan (`isReady === false`) bentuk dan tingginya
 * dipertahankan supaya baris header tidak melompat setelah hydration.
 */
export function HeaderAccountButton(): ReactNode {
  const session = useAuthSession()

  if (!session.isReady) {
    return <div className="h-9 w-24 shrink-0 animate-pulse rounded-xl bg-muted" aria-hidden />
  }

  if (!session.accessToken) {
    return (
      <Button asChild size="sm">
        <Link href="/login">Masuk</Link>
      </Button>
    )
  }

  const identity = accountIdentityLabel(session.user)

  return (
    <Link
      href="/akun/booking"
      className="flex h-9 shrink-0 items-center gap-2 rounded-xl border-2 border-border bg-card pl-1.5 pr-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:pr-3"
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground"
        aria-hidden
      >
        {accountInitials(session.user)}
      </span>
      <span className="hidden max-w-[11rem] truncate sm:inline">{identity}</span>
      <span className="sm:hidden">
        <UserRound className="size-4" aria-hidden />
      </span>
      <ChevronRight className="hidden size-4 text-muted-foreground sm:inline" aria-hidden />
      <span className="sr-only">Buka akun saya ({identity})</span>
    </Link>
  )
}
