import { Button } from '@hola/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CourtCard } from '../../../components/court/CourtCard.tsx'
import { fetchCourts, fetchSports } from '../../../lib/server-api.ts'

export const metadata: Metadata = {
  title: 'Daftar lapangan',
  description: 'Semua lapangan yang dapat dipesan di Hola Sports Center Balikpapan.',
}

interface CourtsPageProps {
  searchParams: Promise<{ olahraga?: string }>
}

export default async function CourtsPage({ searchParams }: CourtsPageProps): Promise<ReactNode> {
  const { olahraga } = await searchParams
  const [sportsResult, courtsResult] = await Promise.all([
    fetchSports(),
    fetchCourts(olahraga ? { sportId: olahraga } : {}),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-foreground">Lapangan</h1>
      <p className="mt-2 text-muted-foreground">
        Pilih lapangan untuk melihat slot yang masih kosong.
      </p>

      {sportsResult.status === 'failed' ? (
        <p className="mt-6 text-muted-foreground">
          Daftar olahraga gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant={olahraga ? 'ghost' : 'secondary'} size="sm">
            <Link href="/lapangan">Semua</Link>
          </Button>
          {sportsResult.items.map((sport) => (
            <Button
              asChild
              key={sport.id}
              variant={olahraga === sport.id ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Link href={`/lapangan?olahraga=${sport.id}`}>{sport.name}</Link>
            </Button>
          ))}
        </div>
      )}

      {courtsResult.status === 'failed' ? (
        <p className="mt-12 rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Daftar lapangan gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
        </p>
      ) : courtsResult.items.length === 0 ? (
        <p className="mt-12 rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Belum ada lapangan untuk pilihan ini.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {courtsResult.items.map((court) => (
            <CourtCard key={court.id} court={court} photoKey={null} />
          ))}
        </div>
      )}
    </main>
  )
}
