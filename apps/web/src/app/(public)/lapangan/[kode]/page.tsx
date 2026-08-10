import { Badge, Button } from '@hola/ui'
import { ArrowLeft, Clock3 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CourtAvailabilitySection } from '../../../../components/booking/CourtAvailabilitySection.tsx'
import { CourtSpecGrid, VenueFacilityGrid } from '../../../../components/court/CourtFacilities.tsx'
import { CourtGallery } from '../../../../components/court/CourtGallery.tsx'
import { courtSpecs, VENUE_FACILITIES } from '../../../../lib/court-facilities.ts'
import { demoCourtPhotos } from '../../../../lib/court-photos.ts'
import { formatClock, formatDayName } from '../../../../lib/format.ts'
import { fetchPublicConfig } from '../../../../lib/public-config.ts'
import { findCourtByCode, mediaUrl } from '../../../../lib/server-api.ts'

interface CourtDetailPageProps {
  params: Promise<{ kode: string }>
  // I2: `diambil`/`tanggal` datang dari `CheckoutForm` saat `SLOT_ALREADY_CLAIMED` —
  // spek § 4.4 mewajibkan customer kembali ke grid ketersediaan pada tanggal yang
  // sama dengan pesan yang jelas, bukan ke daftar lapangan tanpa konteks.
  searchParams: Promise<{ diambil?: string; tanggal?: string }>
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
  searchParams,
}: CourtDetailPageProps): Promise<ReactNode> {
  const { kode } = await params
  const { diambil, tanggal } = await searchParams
  const [court, config] = await Promise.all([findCourtByCode(kode), fetchPublicConfig()])
  if (!court) notFound()

  // Foto asli (yang diunggah admin) selalu menang; `demoCourtPhotos` hanya
  // mengisi saat lapangan ini belum punya foto sama sekali.
  const hasRealPhotos = court.photos.length > 0
  const photos = hasRealPhotos
    ? court.photos.map((photo) => mediaUrl(photo.object_key))
    : demoCourtPhotos(court.code, 4)

  const specs = courtSpecs(court)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6">
        <Link href="/lapangan">
          <ArrowLeft size={16} /> Semua lapangan
        </Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
        <CourtGallery
          courtName={court.name}
          photos={photos}
          isPlaceholder={!hasRealPhotos}
          badge={
            <Badge variant={court.is_indoor ? 'default' : 'secondary'}>
              {court.is_indoor ? 'Indoor' : 'Outdoor'}
            </Badge>
          }
        />

        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">{court.name}</h1>
          <p className="mt-1 text-muted-foreground">{court.code}</p>
          {court.description ? (
            <p className="mt-4 leading-relaxed text-muted-foreground">{court.description}</p>
          ) : null}

          <div className="mt-6">
            <CourtSpecGrid facilities={specs} />
          </div>

          <Button asChild className="mt-6 w-full">
            <Link href="#ketersediaan">Lihat jadwal & harga</Link>
          </Button>
        </div>
      </div>

      <section className="mt-14">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Fasilitas</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
          Yang bisa kamu pakai di sini
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fasilitas venue yang tersedia untuk semua pemain, termasuk saat memesan lapangan ini.
        </p>
        <div className="mt-6">
          <VenueFacilityGrid facilities={VENUE_FACILITIES} />
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-2">
          <Clock3 size={20} className="text-primary" aria-hidden />
          <h2 className="font-display text-2xl font-bold text-foreground">Jam operasional</h2>
        </div>
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

      <section id="ketersediaan" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-bold text-foreground">Ketersediaan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih tanggal, lalu pilih slot jam yang masih kosong.
        </p>
        <div className="mt-6">
          <CourtAvailabilitySection
            courtId={court.id}
            horizonDays={config.booking_horizon_days}
            serverTime={config.server_time}
            minSlotsPerBooking={court.min_slots_per_booking}
            maxSlotsPerBooking={court.max_slots_per_booking}
            slotDurationMinutes={court.slot_duration_minutes}
            requireContiguousSlots={config.require_contiguous_slots}
            slotConflictNotice={diambil === '1'}
            {...(tanggal ? { initialDate: tanggal } : {})}
          />
        </div>
      </section>
    </main>
  )
}
