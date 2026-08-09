import { Button } from '@hola/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/** Banner penutup "SIAP MAIN PADEL?" mengikuti referensi desain di `references/web`. */
export function CtaBanner(): ReactNode {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16">
      <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-linear-to-r from-[#aaff00] to-[#39d353] p-10 md:flex-row">
        <div>
          <h2 className="mb-2 font-display text-4xl font-bold text-foreground md:text-5xl">
            SIAP MAIN PADEL?
          </h2>
          <p className="font-medium text-foreground/70">
            Pilih lapangan, kunci slotnya, dan bayar online. Tanpa telepon, tanpa antre.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 px-10 shadow-lg">
          <Link href="/lapangan">
            Booking sekarang <ChevronRight size={18} aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}
