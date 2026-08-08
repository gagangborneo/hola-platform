import { CalendarClock, ShieldCheck, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

interface Feature {
  icon: ReactNode
  title: string
  description: string
  /** Kartu utama memakai latar gradasi gelap sebagai penyeimbang dua kartu terang di sampingnya. */
  featured: boolean
  badge: string | null
}

const FEATURES: Feature[] = [
  {
    icon: <Zap size={26} className="text-accent-foreground" aria-hidden />,
    title: 'Booking Instan',
    description:
      'Pilih lapangan, pilih jam, bayar. Slot langsung terkunci dan konfirmasi masuk seketika — tanpa menelepon atau menunggu balasan chat.',
    featured: true,
    badge: 'Paling dipakai',
  },
  {
    icon: <ShieldCheck size={26} className="text-primary" aria-hidden />,
    title: 'Pembayaran Aman',
    description:
      'Transaksi diproses lewat payment gateway resmi. Tersedia transfer bank, e-wallet, dan QRIS.',
    featured: false,
    badge: null,
  },
  {
    icon: <CalendarClock size={26} className="text-primary" aria-hidden />,
    title: 'Jadwal Fleksibel',
    description:
      'Ketersediaan tampil real-time mengikuti jam operasional tiap lapangan, jadi kamu tahu persis kapan bisa main.',
    featured: false,
    badge: null,
  },
]

/**
 * Bagian "Kenapa HOLA?" — versi lebih berdimensi dari referensi desain:
 * latar gradasi lembut, blob warna, dan satu kartu sorotan supaya tidak monoton.
 */
export function FeaturesSection(): ReactNode {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-background via-secondary/60 to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
            Kenapa HOLA?
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            LAYANAN TERBAIK <span className="text-primary">UNTUKMU</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) =>
            feature.featured ? (
              <div
                key={feature.title}
                className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-[#12509c] to-[#0a1f5c] p-8 shadow-xl shadow-primary/25 transition-all hover:-translate-y-1"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/25 blur-2xl"
                />
                <div className="relative">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-[#aaff00] to-[#39d353] shadow-lg shadow-green-400/30">
                    {feature.icon}
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="font-display text-2xl font-bold text-white">{feature.title}</h3>
                    {feature.badge ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                        {feature.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-blue-100">{feature.description}</p>
                </div>
              </div>
            ) : (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-card/80 p-8 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-secondary to-accent/30">
                  {feature.icon}
                </div>
                <h3 className="mb-3 font-display text-2xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
