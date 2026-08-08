import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export function SiteFooter(): ReactNode {
  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Image
            src="/logo/logo-hola-full.png"
            alt="HOLA! Hola Sports Center"
            width={1254}
            height={268}
            className="h-8 w-auto object-contain"
          />
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Pusat olahraga di Balikpapan. Pesan lapangan online, bayar langsung, main tanpa ribet.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Tautan</p>
          <ul className="mt-2 grid gap-1.5 text-muted-foreground">
            <li>
              <Link className="hover:text-primary" href="/lapangan">
                Daftar lapangan
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/info">
                Jam operasional & lokasi
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/akun/booking">
                Booking saya
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground">Kontak</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">Balikpapan, Kalimantan Timur</p>
        </div>
      </div>
    </footer>
  )
}
