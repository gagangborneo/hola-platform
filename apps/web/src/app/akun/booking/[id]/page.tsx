import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookingDetail } from '../../../../components/account/BookingDetail.tsx'
import { courtSummaryMap } from '../../../../lib/court-summary.ts'
import { fetchPublicConfig } from '../../../../lib/public-config.ts'
import { fetchCourts } from '../../../../lib/server-api.ts'

export const dynamic = 'force-dynamic'

interface BookingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps): Promise<ReactNode> {
  // Detail booking hanya membawa `court_id`; nama lapangannya datang dari
  // katalog publik yang sudah ber-ISR, jadi tidak menambah beban per request.
  const [{ id }, config, courtsResult] = await Promise.all([
    params,
    fetchPublicConfig(),
    fetchCourts(),
  ])

  return (
    <div>
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        href="/akun/booking"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Booking Saya
      </Link>
      <div className="mt-4">
        <BookingDetail
          bookingId={id}
          cancellationPolicyText={config.cancellation_policy_text}
          courts={courtSummaryMap(courtsResult)}
        />
      </div>
    </div>
  )
}
