import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Receipt } from '../../../../../components/account/Receipt.tsx'

export const dynamic = 'force-dynamic'

interface ReceiptPageProps {
  params: Promise<{ id: string }>
}

export default async function ReceiptPage({ params }: ReceiptPageProps): Promise<ReactNode> {
  const { id } = await params

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
        <Receipt bookingId={id} />
      </div>
    </div>
  )
}
