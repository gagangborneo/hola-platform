import { Button } from '@hola/ui'
import * as Sentry from '@sentry/nextjs'
import { ArrowLeft, CalendarRange, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatClock, formatDayName } from '../../../lib/format.ts'
import { fetchPublicConfig, type PublicConfig } from '../../../lib/public-config.ts'
import { type CourtDetail, fetchCourtDetail, fetchCourts } from '../../../lib/server-api.ts'

export const metadata: Metadata = {
  title: 'Jam operasional, lokasi & kontak',
  description: 'Jam buka, lokasi, kontak, dan kebijakan pembatalan Hola Sports Center.',
}

/**
 * `fetchPublicConfig` melempar untuk kegagalan apa pun (lihat dokumentasi di
 * `public-config.ts`). Kebijakan pembatalan bukan satu-satunya isi halaman
 * ini — outage di config publik tidak boleh merobohkan bagian jam operasional
 * yang tetap bisa dimuat. Degradasi ke `null` di sini, dengan pelaporan
 * eksplisit ke Sentry karena `catch` di bawah mencegah error ini mencapai
 * hook `onRequestError` (sama seperti alasan `reportFetchFailure` ada di
 * `server-api.ts`).
 */
async function loadPublicConfig(): Promise<PublicConfig | null> {
  try {
    return await fetchPublicConfig()
  } catch (error) {
    Sentry.captureException(error, { extra: { endpoint: '/api/v1/config/public' } })
    return null
  }
}

export default async function InfoPage(): Promise<ReactNode> {
  const [courtsResult, config] = await Promise.all([fetchCourts(), loadPublicConfig()])

  // `fetchCourtDetail` mengembalikan `null` hanya untuk 404 (court terhapus di
  // antara fetch daftar dan detail) — kegagalan lain dilempar apa adanya dan
  // dibiarkan mencapai `global-error.tsx`, konsisten dengan
  // `lapangan/[kode]/page.tsx` yang juga tidak menangkapnya.
  const courtDetails: CourtDetail[] =
    courtsResult.status === 'ok'
      ? (await Promise.all(courtsResult.items.map((court) => fetchCourtDetail(court.id)))).filter(
          (detail): detail is CourtDetail => detail !== null,
        )
      : []

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
            Jadwal & Kontak
          </p>
          <h1 className="mb-3 font-display text-5xl font-bold text-white md:text-6xl">
            Jam Operasional
          </h1>
          <p className="max-w-xl text-blue-200">
            Jam buka tiap lapangan, kebijakan pembatalan, serta lokasi dan kontak Hola Sports Center
            di Balikpapan.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <section className="relative mb-12 min-h-85 overflow-hidden rounded-3xl">
          <Image
            src="/images/hero-court-wide.jpg"
            alt="Lapangan Hola Sports Center"
            fill
            sizes="(min-width: 1152px) 1088px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-primary via-primary/85 to-primary/45" />
          <div className="relative z-10 flex min-h-85 flex-col justify-end p-8 md:p-10">
            <span className="mb-4 w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              Hola Sports Center
            </span>
            <h2 className="mb-2 font-display text-3xl font-bold text-white md:text-4xl">
              Balikpapan, Kalimantan Timur
            </h2>
            <p className="mb-4 max-w-xl text-sm text-blue-100">
              Semua lapangan bisa dipesan online. Slot yang tampil adalah slot yang benar-benar
              masih kosong.
            </p>
            <div className="flex flex-wrap gap-5 text-sm text-blue-200">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden />
                Balikpapan, Kalimantan Timur
              </span>
              {config ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <CalendarRange size={14} aria-hidden />
                    Booking hingga {config.booking_horizon_days} hari ke depan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-accent" aria-hidden />
                    <span className="font-bold text-accent">Zona waktu {config.timezone}</span>
                  </span>
                </>
              ) : null}
            </div>
            <div className="mt-6">
              <Button
                asChild
                variant="accent"
                className="w-fit bg-linear-to-r from-[#aaff00] to-[#39d353] shadow-lg shadow-green-400/30"
              >
                <Link href="/lapangan">Lihat lapangan</Link>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Jadwal</p>
          <h2 className="mb-8 font-display text-3xl font-bold text-foreground md:text-4xl">
            JAM <span className="text-primary">OPERASIONAL</span>
          </h2>

          {courtsResult.status === 'failed' ? (
            <p className="text-muted-foreground">
              Jam operasional gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
            </p>
          ) : courtDetails.length === 0 ? (
            <p className="text-muted-foreground">Belum ada lapangan yang terdaftar.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courtDetails.map((detail) => (
                <div
                  key={detail.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center gap-3 bg-linear-to-r from-secondary to-accent/25 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                      <Clock size={18} className="text-primary-foreground" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold leading-snug text-foreground">
                        {detail.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{detail.code}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    {detail.operating_hours.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Jam operasional belum diatur.</p>
                    ) : (
                      <ul className="grid gap-1.5 text-sm">
                        {detail.operating_hours.map((hour) => (
                          <li key={hour.day_of_week} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              {formatDayName(hour.day_of_week)}
                            </span>
                            <span className="font-semibold text-foreground">
                              {formatClock(hour.opens_time)}–{formatClock(hour.closes_time)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-8">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-secondary to-accent/30">
              <ShieldCheck size={22} className="text-primary" aria-hidden />
            </span>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground">
              Kebijakan pembatalan
            </h2>
            {config === null ? (
              <p className="text-muted-foreground">
                Kebijakan pembatalan gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
              </p>
            ) : (
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {config.cancellation_policy_text ?? 'Kebijakan pembatalan sedang disiapkan.'}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-8">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-secondary to-accent/30">
              <Phone size={22} className="text-primary" aria-hidden />
            </span>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground">
              Lokasi & kontak
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Hola Sports Center berlokasi di Balikpapan, Kalimantan Timur.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Alamat lengkap, peta, dan nomor kontak akan ditambahkan setelah data resmi tersedia.
            </p>
          </section>
        </div>

        <section className="mt-16 flex flex-col items-center justify-between gap-6 rounded-2xl bg-primary p-8 md:flex-row">
          <div>
            <h2 className="mb-1 font-display text-2xl font-bold text-white">
              Jam bukanya cocok? Langsung pesan.
            </h2>
            <p className="text-sm text-blue-200">
              Pilih lapangan, kunci slotnya, dan bayar online tanpa perlu menelepon.
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
              <Link href="/akun/booking">Booking saya</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
