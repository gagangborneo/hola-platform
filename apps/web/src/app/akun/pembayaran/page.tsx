import { MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PaymentHistory } from '../../../components/account/PaymentHistory.tsx'
import { RefundList } from '../../../components/account/RefundList.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { fetchPublicConfig } from '../../../lib/public-config.ts'

export const metadata: Metadata = { title: 'Pembayaran & refund' }

// `fetchPublicConfig` membaca `cache: 'no-store'` — halaman ini tidak boleh
// dirender statis saat build karena teks kebijakan pembatalan dapat berubah
// dari dashboard admin tanpa redeploy.
export const dynamic = 'force-dynamic'

export default async function PaymentsPage(): Promise<ReactNode> {
  const config = await fetchPublicConfig()

  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Pembayaran &amp; Refund
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Tagihan yang belum dibayar, riwayat transaksi, dan status pengembalian dana — semua sisi
          uang dari pesananmu ada di halaman ini.
        </p>
      </header>

      <section className="grid gap-4">
        <h2 className="font-display text-xl font-bold text-foreground">Tagihan &amp; transaksi</h2>
        <PaymentHistory />
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-xl font-bold text-foreground">Pengembalian dana</h2>
        <RefundList cancellationPolicyText={config.cancellation_policy_text} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-5">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Sudah bayar tapi status belum berubah?</p>
            <p className="text-sm text-muted-foreground">
              Konfirmasi dari bank kadang telat masuk. Hubungi kami sambil menyebut kode booking.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/jam-operasional">Hubungi kami</Link>
        </Button>
      </div>
    </div>
  )
}
