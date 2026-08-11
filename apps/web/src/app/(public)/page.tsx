import { Button } from '@hola/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CourtCard } from '../../components/court/CourtCard.tsx'
import { AppTeaserSection } from '../../components/home/AppTeaserSection.tsx'
import { CtaBanner } from '../../components/home/CtaBanner.tsx'
import { DevelopmentNoticeDialog } from '../../components/home/DevelopmentNoticeDialog.tsx'
import { FeaturesSection } from '../../components/home/FeaturesSection.tsx'
import { HeroSection } from '../../components/home/HeroSection.tsx'
import { HowItWorksSection } from '../../components/home/HowItWorksSection.tsx'
import { fetchCourts, fetchSports } from '../../lib/server-api.ts'

export default async function HomePage(): Promise<ReactNode> {
  const [sportsResult, courtsResult] = await Promise.all([fetchSports(), fetchCourts()])
  const featured = courtsResult.status === 'ok' ? courtsResult.items.slice(0, 3) : []

  return (
    <main>
      <DevelopmentNoticeDialog />

      <HeroSection
        courtCount={courtsResult.status === 'ok' ? courtsResult.items.length : 0}
        sportCount={sportsResult.status === 'ok' ? sportsResult.items.length : 0}
      />

      <FeaturesSection />

      <section className="mx-auto max-w-6xl px-4 pb-16">
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

      <HowItWorksSection />

      <AppTeaserSection />

      <CtaBanner />
    </main>
  )
}
