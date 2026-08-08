import type { ReactNode } from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Pilih Lapangan',
    description: 'Telusuri lapangan berdasarkan cabang olahraga, tipe, dan harga yang sesuai.',
  },
  {
    step: '02',
    title: 'Pilih Waktu',
    description: 'Tentukan tanggal dan jam bermain. Slot yang masih kosong tampil real-time.',
  },
  {
    step: '03',
    title: 'Bayar & Main!',
    description:
      'Slot dikunci 10 menit sementara kamu membayar. Bukti pemesanan masuk ke Booking Saya.',
  },
]

/** Bagian "BOOKING DALAM 3 LANGKAH" mengikuti referensi desain di `references/web`. */
export function HowItWorksSection(): ReactNode {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-14 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Cara Kerja</p>
        <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
          BOOKING DALAM <span className="text-primary">3 LANGKAH</span>
        </h2>
      </div>

      <div className="relative grid gap-8 md:grid-cols-3">
        <div
          aria-hidden
          className="absolute left-1/4 right-1/4 top-8 hidden h-px bg-linear-to-r from-primary/20 via-accent to-primary/20 md:block"
        />
        {STEPS.map((item) => (
          <div key={item.step} className="relative text-center">
            <p className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-2xl font-semibold text-primary-foreground ring-4 ring-accent/50">
              {item.step}
            </p>
            <h3 className="mb-3 font-display text-2xl font-bold text-foreground">{item.title}</h3>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
