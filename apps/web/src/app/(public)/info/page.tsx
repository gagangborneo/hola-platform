import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
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
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-foreground">Info</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Jam operasional</h2>
        {courtsResult.status === 'failed' ? (
          <p className="mt-4 text-muted-foreground">
            Jam operasional gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
          </p>
        ) : courtDetails.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Belum ada lapangan yang terdaftar.</p>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {courtDetails.map((detail) => (
              <div key={detail.id} className="rounded-xl border bg-card p-5">
                <p className="font-semibold text-foreground">{detail.name}</p>
                {detail.operating_hours.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Jam operasional belum diatur.
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {detail.operating_hours.map((hour) => (
                      <li key={hour.day_of_week} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {formatDayName(hour.day_of_week)}
                        </span>
                        <span className="font-semibold">
                          {formatClock(hour.opens_time)}–{formatClock(hour.closes_time)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Kebijakan pembatalan</h2>
        {config === null ? (
          <p className="mt-3 text-muted-foreground">
            Kebijakan pembatalan gagal dimuat. Muat ulang halaman ini beberapa saat lagi.
          </p>
        ) : (
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
            {config.cancellation_policy_text ?? 'Kebijakan pembatalan sedang disiapkan.'}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Lokasi & kontak</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Hola Sports Center berlokasi di Balikpapan, Kalimantan Timur.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Alamat lengkap, peta, dan nomor kontak akan ditambahkan setelah data resmi tersedia.
        </p>
      </section>
    </main>
  )
}
