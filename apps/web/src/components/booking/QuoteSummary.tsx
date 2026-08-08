import type { Quote } from '@hola/shared'
import type { ReactNode } from 'react'
import { formatRupiah } from '../../lib/format.ts'

interface QuoteSummaryProps {
  quote: Quote
}

/**
 * Hanya merender field `quote` apa adanya (BR-B-12) — tidak ada satu pun
 * operasi aritmetika pada angka rupiah di komponen ini. Setiap total sudah
 * dihitung peladen; perbandingan `> 0` di bawah adalah keputusan tampilan
 * (sembunyikan baris nol), bukan perhitungan harga.
 */
export function QuoteSummary({ quote }: QuoteSummaryProps): ReactNode {
  return (
    <dl className="grid gap-2">
      {quote.lines.map((line) => (
        <div key={`${line.type}-${line.ref_id}`} className="flex justify-between text-sm">
          <dt className="text-muted-foreground">
            {line.label}
            {line.quantity > 1 ? ` ×${line.quantity}` : ''}
          </dt>
          <dd className="font-semibold">{formatRupiah(line.line_total_amount)}</dd>
        </div>
      ))}

      <div className="mt-2 flex justify-between border-t pt-3 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-semibold">{formatRupiah(quote.subtotal_amount)}</dd>
      </div>
      {quote.addon_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Addon</dt>
          <dd className="font-semibold">{formatRupiah(quote.addon_amount)}</dd>
        </div>
      ) : null}
      {quote.discount_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">
            Diskon{quote.promo ? ` (${quote.promo.code})` : ''}
          </dt>
          <dd className="font-semibold text-primary">−{formatRupiah(quote.discount_amount)}</dd>
        </div>
      ) : null}
      {quote.tax_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Pajak</dt>
          <dd className="font-semibold">{formatRupiah(quote.tax_amount)}</dd>
        </div>
      ) : null}
      {quote.fee_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Biaya layanan</dt>
          <dd className="font-semibold">{formatRupiah(quote.fee_amount)}</dd>
        </div>
      ) : null}

      <div className="mt-2 flex justify-between border-t pt-3">
        <dt className="font-display font-bold">Total</dt>
        <dd className="font-display text-xl font-bold text-primary">
          {formatRupiah(quote.total_amount)}
        </dd>
      </div>
    </dl>
  )
}
