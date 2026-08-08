import type { MetadataRoute } from 'next'
import { env } from '../lib/env.ts'
import { fetchCourts } from '../lib/server-api.ts'

/**
 * Rute terproteksi (`/checkout`, `/booking/*`, `/akun/*`) sengaja tidak masuk
 * sitemap — tidak ada nilai SEO untuk halaman yang mewajibkan sesi.
 *
 * Saat `fetchCourts` gagal (`{ status: 'failed' }`), sitemap TIDAK mengembalikan
 * array kosong: itu berarti "situs ini tidak punya apa-apa" ke crawler, klaim
 * yang salah selama outage sesaat. Sebaliknya, entri lapangan cukup di-skip
 * dan tiga rute statis tetap dikembalikan — sitemap yang lebih kecil dari
 * biasanya, bukan sitemap kosong yang menyesatkan. Kegagalannya sendiri sudah
 * dilaporkan ke Sentry di dalam `fetchCourts` (lihat `reportFetchFailure` di
 * `server-api.ts`), jadi outage tetap kelihatan di monitoring meski sitemap
 * ini tidak melempar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_WEB_BASE_URL.replace(/\/+$/, '')
  const courtsResult = await fetchCourts()

  const courtEntries: MetadataRoute.Sitemap =
    courtsResult.status === 'ok'
      ? courtsResult.items.map((court) => ({
          url: `${base}/lapangan/${encodeURIComponent(court.code)}`,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }))
      : []

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/lapangan`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/info`, changeFrequency: 'monthly', priority: 0.6 },
    ...courtEntries,
  ]
}
