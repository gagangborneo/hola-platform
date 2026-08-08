import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CheckoutForm } from '../../components/booking/CheckoutForm.tsx'
import { RequireSession } from '../../components/common/RequireSession.tsx'
import { fetchPublicConfig } from '../../lib/public-config.ts'
import { fetchCourtDetail } from '../../lib/server-api.ts'

export const dynamic = 'force-dynamic'

interface CheckoutPageProps {
  searchParams: Promise<{ court?: string; slots?: string }>
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps): Promise<ReactNode> {
  const { court: courtId, slots } = await searchParams
  if (!courtId || !slots) notFound()

  const [court, config] = await Promise.all([fetchCourtDetail(courtId), fetchPublicConfig()])
  if (!court) notFound()

  return (
    <RequireSession>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-foreground">Checkout</h1>
        <p className="mt-2 text-muted-foreground">{court.name}</p>
        <div className="mt-8">
          <CheckoutForm
            courtId={court.id}
            courtCode={court.code}
            startsAtList={slots.split(',')}
            limits={[
              {
                courtId: court.id,
                minSlots: court.min_slots_per_booking,
                maxSlots: court.max_slots_per_booking,
                slotDurationMinutes: court.slot_duration_minutes,
              },
            ]}
            requireContiguousSlots={config.require_contiguous_slots}
            cancellationPolicyText={config.cancellation_policy_text}
          />
        </div>
      </main>
    </RequireSession>
  )
}
