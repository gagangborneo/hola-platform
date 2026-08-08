import Link from 'next/link'
import type { ReactNode } from 'react'
import { CourtCard } from '../../components/court/CourtCard.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { fetchCourts, fetchSports } from '../../lib/server-api.ts'

export default async function HomePage(): Promise<ReactNode> {
  const [sportsResult, courtsResult] = await Promise.all([fetchSports(), fetchCourts()])
  const featured = courtsResult.status === 'ok' ? courtsResult.items.slice(0, 3) : []

  return (
    <main>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Badge variant="accent" className="bg-accent/20 text-accent">
            Booking online Hola Sports Center
          </Badge>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-semibold leading-tight md:text-6xl">
            Pesan lapangan, <span className="text-accent">langsung main.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/80">
            Lihat slot yang benar-benar kosong, kunci lewat pembayaran online, dan datang tanpa
            perlu menelepon lebih dulu.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/lapangan">Pesan lapangan</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 text-white">
              <Link href="/info">Jam operasional</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-foreground">Olahraga yang tersedia</h2>
        {sportsResult.status === 'failed' ? (
          <p className="mt-4 text-muted-foreground">
            Daftar olahraga gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
          </p>
        ) : sportsResult.items.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Daftar olahraga sedang disiapkan.</p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {sportsResult.items.map((sport) => (
              <Button asChild key={sport.id} variant="secondary">
                <Link href={`/lapangan?olahraga=${sport.id}`}>{sport.name}</Link>
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold text-foreground">Lapangan unggulan</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/lapangan">Lihat semua</Link>
          </Button>
        </div>
        {courtsResult.status === 'failed' ? (
          <p className="mt-4 text-muted-foreground">
            Daftar lapangan gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
          </p>
        ) : featured.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Belum ada lapangan yang dapat dipesan.</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {featured.map((court) => (
              <CourtCard key={court.id} court={court} photoKey={null} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-display text-3xl font-bold text-foreground">Cara memesan</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ['1', 'Pilih slot', 'Buka lapangan yang diinginkan dan pilih jam yang masih kosong.'],
            ['2', 'Bayar', 'Slot dikunci 10 menit sementara kamu menyelesaikan pembayaran.'],
            ['3', 'Datang & main', 'Bukti pemesanan masuk ke halaman Booking Saya.'],
          ].map(([step, title, description]) => (
            <Card key={step}>
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
                  {step}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
