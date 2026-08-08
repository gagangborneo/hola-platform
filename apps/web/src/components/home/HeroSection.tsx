import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '../ui/button.tsx'

interface HeroSectionProps {
  /** Dipakai untuk strip statistik; 0 berarti data gagal dimuat sehingga angka disembunyikan. */
  courtCount: number
  sportCount: number
}

/**
 * Hero landing mengikuti referensi desain di `references/web`.
 * Foto lapangan berasal dari Unsplash (lisensi: references/web/ATTRIBUTIONS.md) dan
 * disalin ke `public/images` agar tidak bergantung pada host eksternal.
 */
export function HeroSection({ courtCount, sportCount }: HeroSectionProps): ReactNode {
  const stats: Array<[string, string]> = []
  if (courtCount > 0) stats.push([String(courtCount), 'Lapangan'])
  if (sportCount > 0) stats.push([String(sportCount), 'Cabang olahraga'])
  stats.push(['10 menit', 'Slot terkunci'])

  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-primary">
      <Image
        src="/images/hero-court-wide.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className="object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-linear-to-r from-primary via-primary/80 to-primary/40" />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/20 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              Booking online Hola Sports Center
            </span>
          </div>

          <div className="mt-6 w-fit rounded-2xl bg-white px-5 py-3 shadow-lg shadow-black/10">
            <Image
              src="/logo/logo-hola-full.png"
              alt="HOLA!"
              width={1254}
              height={268}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>

          <h1 className="mt-6 font-display text-5xl font-semibold leading-tight text-white md:text-7xl">
            Pesan Lapangan
            <br />
            <span className="text-accent">Langsung Main</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-200">
            Lihat slot yang benar-benar kosong, kunci lewat pembayaran online, dan datang tanpa
            perlu menelepon lebih dulu.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              variant="accent"
              size="lg"
              className="bg-linear-to-r from-[#aaff00] to-[#39d353] shadow-lg shadow-green-400/30"
            >
              <Link href="/lapangan">
                Pesan lapangan <ChevronRight size={18} aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/info">Jam operasional</Link>
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-8">
            {stats.map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-semibold text-accent">{value}</dd>
                <p aria-hidden className="text-xs uppercase tracking-wider text-blue-200">
                  {label}
                </p>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden grid-cols-2 gap-4 md:grid">
          <div className="row-span-2 aspect-[3/4] overflow-hidden rounded-2xl bg-blue-900">
            <Image
              src="/images/hero-court-tall.jpg"
              alt="Lapangan padel indoor Hola Sports Center"
              width={800}
              height={1200}
              priority
              className="h-full w-full object-cover opacity-90"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-blue-900">
            <Image
              src="/images/hero-court-surface.jpg"
              alt="Permukaan lapangan padel"
              width={800}
              height={800}
              className="h-full w-full object-cover opacity-90"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-blue-900">
            <Image
              src="/images/hero-court-outdoor.jpg"
              alt="Lapangan padel outdoor"
              width={800}
              height={800}
              className="h-full w-full object-cover opacity-90"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
