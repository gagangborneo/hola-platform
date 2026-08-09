import { Button } from '@hola/ui'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { HeaderAccountButton } from './HeaderAccountButton.tsx'

export function SiteHeader(): ReactNode {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      {/* Di bawah `sm` tautan navigasi turun ke baris kedua supaya logo dan tombol
          akun tidak terpotong. Hanya slot akun yang berupa komponen klien —
          sisanya tetap dirender di peladen. */}
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-4 sm:py-4"
        aria-label="Navigasi utama"
      >
        <Link href="/" aria-label="Hola Sports Center — beranda" className="mr-auto shrink-0">
          <Image
            src="/logo/logo-hola-full.png"
            alt="HOLA!"
            width={1254}
            height={268}
            priority
            className="h-7 w-auto object-contain sm:h-8"
          />
        </Link>
        <div className="order-last flex w-full items-center gap-1 sm:order-0 sm:w-auto sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="px-3 sm:px-4">
            <Link href="/lapangan">Lapangan</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-3 sm:px-4">
            <Link href="/info">Info</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-3 sm:px-4">
            <Link href="/akun/booking">Booking Saya</Link>
          </Button>
        </div>
        <HeaderAccountButton />
      </nav>
    </header>
  )
}
