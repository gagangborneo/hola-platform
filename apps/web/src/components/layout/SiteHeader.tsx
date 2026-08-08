import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '../ui/button.tsx'

export function SiteHeader(): ReactNode {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4"
        aria-label="Navigasi utama"
      >
        <Link href="/" className="font-display text-xl font-bold text-primary">
          Hola
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/lapangan">Lapangan</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/info">Info</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/akun/booking">Booking Saya</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
