import { CalendarPlus, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BookingList } from '../../../components/account/BookingList.tsx'
import { Button } from '../../../components/ui/button.tsx'

export const metadata: Metadata = { title: 'Booking saya' }

export default function MyBookingsPage(): ReactNode {
  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Booking Saya
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Semua pesanan lapangan kamu ada di sini — dari yang menunggu pembayaran sampai riwayat
          main.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/lapangan">
              <CalendarPlus className="size-4" aria-hidden />
              Pesan lapangan
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/jam-operasional">Jam operasional</Link>
          </Button>
        </div>
      </header>

      <Suspense fallback={null}>
        <BookingList />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-5">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Ada kendala dengan pesananmu?</p>
            <p className="text-sm text-muted-foreground">
              Tim Hola siap bantu selama jam operasional.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/jam-operasional">Hubungi kami</Link>
        </Button>
      </div>
    </div>
  )
}
