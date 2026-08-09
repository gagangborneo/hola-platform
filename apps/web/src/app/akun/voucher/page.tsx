import { CalendarPlus, TicketPercent } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PromoList } from '../../../components/account/PromoList.tsx'
import { Button } from '../../../components/ui/button.tsx'

export const metadata: Metadata = { title: 'Voucher & promo' }

export default function VouchersPage(): ReactNode {
  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Voucher &amp; Promo
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Promo yang sedang berjalan untuk akunmu, plus cara memakai kode voucher yang kamu punya.
        </p>
        <div className="mt-4">
          <Button asChild size="sm">
            <Link href="/lapangan">
              <CalendarPlus className="size-4" aria-hidden />
              Pesan lapangan
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4">
        <h2 className="font-display text-xl font-bold text-foreground">Promo yang berjalan</h2>
        <PromoList />
      </section>

      {/* Kotak ini bukan hiasan: promo di daftar atas terpasang sendiri dan
          tidak berkode, jadi tanpa penjelasan ini customer yang memegang kode
          voucher tidak punya petunjuk harus memasukkannya di mana. */}
      <section className="rounded-xl bg-secondary/60 p-5">
        <div className="flex items-start gap-3">
          <TicketPercent className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-foreground">Punya kode voucher?</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Kode dimasukkan saat checkout, di kolom <strong>Kode promo</strong> tepat sebelum
              tombol bayar. Potongannya langsung terlihat di ringkasan harga, jadi kamu bisa
              memastikan kodenya berlaku sebelum membayar.
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Promo pada daftar di atas berbeda: promo tersebut terpasang otomatis selama syaratnya
              terpenuhi, tanpa perlu kode apa pun.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
