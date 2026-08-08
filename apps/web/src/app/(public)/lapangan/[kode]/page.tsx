import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CourtAvailabilitySection } from '../../../../components/booking/CourtAvailabilitySection.tsx'
import { Badge } from '../../../../components/ui/badge.tsx'
import { formatClock, formatDayName } from '../../../../lib/format.ts'
import { fetchPublicConfig } from '../../../../lib/public-config.ts'
import { findCourtByCode, mediaUrl } from '../../../../lib/server-api.ts'

interface CourtDetailPageProps {
  params: Promise<{ kode: string }>
}

// `fetchPublicConfig` memakai `cache: 'no-store'` (server_time berubah tiap
// permintaan) — halaman ini tidak lagi bisa ISR.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: CourtDetailPageProps): Promise<Metadata> {
  const { kode } = await params
  const court = await findCourtByCode(kode)
  if (!court) return { title: 'Lapangan tidak ditemukan' }
  return {
    title: court.name,
    description: court.description ?? `Ketersediaan dan harga slot ${court.name}.`,
  }
}

export default async function CourtDetailPage({
  params,
}: CourtDetailPageProps): Promise<ReactNode> {
  const { kode } = await params
  const [court, config] = await Promise.all([findCourtByCode(kode), fetchPublicConfig()])
  if (!court) notFound()

  const cover = court.photos[0]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
          {cover ? (
            <Image
              src={mediaUrl(cover.object_key)}
              alt={`Lapangan ${court.name}`}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
              priority
            />
          ) : null}
        </div>
        <div>
          <Badge variant={court.is_indoor ? 'default' : 'secondary'}>
            {court.is_indoor ? 'Indoor' : 'Outdoor'}
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground">{court.name}</h1>
          <p className="mt-1 text-muted-foreground">{court.code}</p>
          {court.description ? (
            <p className="mt-4 leading-relaxed text-muted-foreground">{court.description}</p>
          ) : null}
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">Durasi slot</dt>
              <dd className="font-semibold">{court.slot_duration_minutes} menit</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">Slot per booking</dt>
              <dd className="font-semibold">
                {court.min_slots_per_booking}–{court.max_slots_per_booking}
              </dd>
            </div>
            {court.surface ? (
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Permukaan</dt>
                <dd className="font-semibold">{court.surface.replace(/_/g, ' ')}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Jam operasional</h2>
        {court.operating_hours.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Jam operasional belum diatur.</p>
        ) : (
          <ul className="mt-4 grid gap-2 md:max-w-md">
            {court.operating_hours.map((hour) => (
              <li key={hour.day_of_week} className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{formatDayName(hour.day_of_week)}</span>
                <span className="font-semibold">
                  {formatClock(hour.opens_time)}–{formatClock(hour.closes_time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="ketersediaan" className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Ketersediaan</h2>
        <div className="mt-4">
          <CourtAvailabilitySection
            courtId={court.id}
            horizonDays={config.booking_horizon_days}
            serverTime={config.server_time}
          />
        </div>
      </section>
    </main>
  )
}
