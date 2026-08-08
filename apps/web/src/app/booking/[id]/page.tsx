import type { ReactNode } from 'react'
import { BookingHoldPanel } from '../../../components/booking/BookingHoldPanel.tsx'
import { RequireSession } from '../../../components/common/RequireSession.tsx'
import { fetchPublicConfig } from '../../../lib/public-config.ts'

export const dynamic = 'force-dynamic'

interface BookingPageProps {
  params: Promise<{ id: string }>
}

export default async function BookingPage({ params }: BookingPageProps): Promise<ReactNode> {
  const { id } = await params
  const config = await fetchPublicConfig()

  return (
    <RequireSession>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BookingHoldPanel
          bookingId={id}
          serverTime={config.server_time}
          midtransClientKey={config.midtrans_client_key}
        />
      </main>
    </RequireSession>
  )
}
