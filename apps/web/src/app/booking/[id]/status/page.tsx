import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PaymentStatus } from '../../../../components/booking/PaymentStatus.tsx'
import { RequireSession } from '../../../../components/common/RequireSession.tsx'

export const dynamic = 'force-dynamic'

interface PaymentStatusPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

export default async function PaymentStatusPage({
  params,
  searchParams,
}: PaymentStatusPageProps): Promise<ReactNode> {
  const [{ id }, { payment }] = await Promise.all([params, searchParams])
  if (!payment) notFound()

  return (
    <RequireSession>
      <main className="mx-auto max-w-2xl px-4 py-16">
        <PaymentStatus paymentId={payment} bookingId={id} />
      </main>
    </RequireSession>
  )
}
