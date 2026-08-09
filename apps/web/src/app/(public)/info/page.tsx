import { Button } from '@hola/ui'
import { ArrowLeft, CalendarDays, MapPin, Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CATEGORY_CLASS,
  DEMO_EVENTS,
  EVENT_CATEGORIES,
  type EventCategory,
} from '../../../lib/demo-events.ts'

export const metadata: Metadata = {
  title: 'Info & event',
  description:
    'Turnamen, klinik coaching, liga mingguan, dan event komunitas olahraga di Balikpapan.',
}

interface InfoPageProps {
  searchParams: Promise<{ kategori?: string }>
}

function parseCategory(value: string | undefined): EventCategory | null {
  return EVENT_CATEGORIES.find((category) => category === value) ?? null
}

function categoryHref(category: EventCategory | null): string {
  return category ? `/info?kategori=${encodeURIComponent(category)}` : '/info'
}

export default async function InfoPage({ searchParams }: InfoPageProps): Promise<ReactNode> {
  const { kategori } = await searchParams
  // Nilai `kategori` yang tidak dikenal diperlakukan sebagai "Semua", bukan
  // hasil kosong — URL yang diketik manual tidak boleh terlihat seperti
  // halaman rusak.
  const activeCategory = parseCategory(kategori)

  const featured = DEMO_EVENTS.find((event) => event.featured) ?? null
  const listed = DEMO_EVENTS.filter(
    (event) => !event.featured && (activeCategory === null || event.category === activeCategory),
  )

  return (
    <main>
      <div className="bg-primary px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-blue-300 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden /> Kembali
          </Link>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-accent">
            Event & Berita
          </p>
          <h1 className="mb-3 font-display text-5xl font-bold text-white md:text-6xl">
            Informasi Olahraga
          </h1>
          <p className="max-w-xl text-blue-200">
            Turnamen, klinik coaching, liga mingguan, dan event komunitas olahraga di Balikpapan.
          </p>
          {/* Hapus baris ini begitu daftar event diambil dari API. */}
          <p className="mt-4 text-xs text-blue-300">
            Konten di halaman ini masih contoh — jadwal resmi menyusul.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {featured ? (
          <article className="relative mb-12 min-h-85 overflow-hidden rounded-3xl">
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              priority
              sizes="(min-width: 1152px) 1088px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary via-primary/85 to-primary/40" />
            <div className="relative z-10 flex min-h-85 flex-col justify-end p-8 md:p-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  ⭐ Sorotan
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary">
                  {featured.category}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${featured.tagClassName}`}
                >
                  {featured.tag}
                </span>
              </div>
              <h2 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">
                {featured.title}
              </h2>
              <p className="mb-4 max-w-xl text-sm leading-relaxed text-blue-100">
                {featured.description}
              </p>
              <div className="flex flex-wrap gap-5 text-sm text-blue-200">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} aria-hidden />
                  {featured.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden />
                  {featured.location}
                </span>
                {featured.prize ? (
                  <span className="flex items-center gap-1.5">
                    <Trophy size={14} className="text-accent" aria-hidden />
                    <span className="font-bold text-accent">Hadiah {featured.prize}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        <nav aria-label="Filter kategori" className="mb-8 flex flex-wrap gap-2">
          <Button asChild variant={activeCategory === null ? 'secondary' : 'ghost'} size="sm">
            <Link href={categoryHref(null)}>Semua</Link>
          </Button>
          {EVENT_CATEGORIES.map((category) => (
            <Button
              asChild
              key={category}
              variant={activeCategory === category ? 'secondary' : 'ghost'}
              size="sm"
            >
              <Link href={categoryHref(category)}>{category}</Link>
            </Button>
          ))}
        </nav>

        {listed.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Belum ada agenda untuk kategori ini.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${CATEGORY_CLASS[event.category]}`}
                  >
                    {event.category}
                  </span>
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${event.tagClassName}`}
                  >
                    {event.tag}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="mb-2 font-display text-lg font-bold leading-snug text-foreground">
                    {event.title}
                  </h2>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={12} aria-hidden />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} aria-hidden />
                      {event.location}
                    </span>
                    {event.prize ? (
                      <span className="flex items-center gap-1.5">
                        <Trophy size={12} aria-hidden />
                        <span className="font-bold text-foreground">Hadiah {event.prize}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="mt-16 flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary p-8 md:flex-row">
          <div>
            <h2 className="mb-1 font-display text-2xl font-bold text-white">
              Mau latihan sebelum event berikutnya?
            </h2>
            <p className="text-sm text-blue-200">
              Cek jam buka tiap lapangan, lalu kunci slot latihanmu secara online.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-wrap gap-3 md:w-auto">
            <Button
              asChild
              variant="accent"
              className="bg-linear-to-r from-[#aaff00] to-[#39d353] shadow-lg shadow-green-400/30"
            >
              <Link href="/lapangan">Pesan lapangan</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/jam-operasional">Jam operasional</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
