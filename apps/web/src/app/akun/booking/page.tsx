import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BookingList } from '../../../components/account/BookingList.tsx'
import { RequireSession } from '../../../components/common/RequireSession.tsx'

export const metadata: Metadata = { title: 'Booking saya' }

export default function MyBookingsPage(): ReactNode {
  return (
    <RequireSession>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-foreground">Booking saya</h1>
        <div className="mt-8">
          <Suspense fallback={null}>
            <BookingList />
          </Suspense>
        </div>
      </main>
    </RequireSession>
  )
}
