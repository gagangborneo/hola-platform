import type { ReactNode } from 'react'
import { BookingDetail } from '../../../../components/account/BookingDetail.tsx'
import { RequireSession } from '../../../../components/common/RequireSession.tsx'
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
    <RequireSession>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BookingDetail bookingId={id} cancellationPolicyText={config.cancellation_policy_text} />
      </main>
    </RequireSession>
  )
}
