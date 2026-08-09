import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Receipt } from '../../../../../components/account/Receipt.tsx'
import { courtSummaryMap } from '../../../../../lib/court-summary.ts'
import { fetchCourts } from '../../../../../lib/server-api.ts'

export const dynamic = 'force-dynamic'

interface ReceiptPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReceiptPage({
  params,
  searchParams,
}: ReceiptPageProps): Promise<ReactNode> {
  const [{ id }, query, courtsResult] = await Promise.all([params, searchParams, fetchCourts()])

  return (
    <div className="mx-auto max-w-2xl print:max-w-none">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline print:hidden"
        href={`/akun/booking/${id}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke detail booking
      </Link>
      <div className="mt-4 print:mt-0">
        <Receipt
          bookingId={id}
          autoPrint={query.print === '1'}
          courts={courtSummaryMap(courtsResult)}
        />
      </div>
    </div>
  )
}
