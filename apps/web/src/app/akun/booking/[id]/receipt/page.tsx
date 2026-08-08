import type { ReactNode } from 'react'
import { Receipt } from '../../../../../components/account/Receipt.tsx'
import { RequireSession } from '../../../../../components/common/RequireSession.tsx'

export const dynamic = 'force-dynamic'

interface ReceiptPageProps {
  params: Promise<{ id: string }>
}

export default async function ReceiptPage({ params }: ReceiptPageProps): Promise<ReactNode> {
  const { id } = await params

  return (
    <RequireSession>
      <main className="mx-auto max-w-2xl px-4 py-12 print:max-w-none print:py-0">
        <Receipt bookingId={id} />
      </main>
    </RequireSession>
  )
}
