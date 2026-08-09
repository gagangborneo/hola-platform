import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookingDetail } from '../../../../components/account/BookingDetail.tsx'
import { fetchPublicConfig } from '../../../../lib/public-config.ts'

export const dynamic = 'force-dynamic'

interface BookingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps): Promise<ReactNode> {
  const [{ id }, config] = await Promise.all([params, fetchPublicConfig()])

  return (
    <div>
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        href="/akun/booking"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Booking Saya
      </Link>
      <div className="mt-4 rounded-xl border bg-card p-5 sm:p-6">
        <BookingDetail bookingId={id} cancellationPolicyText={config.cancellation_policy_text} />
      </div>
    </div>
  )
}
