import {
  Activity,
  Bell,
  Calendar,
  Gift,
  PlayCircle,
  Smartphone,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface Feature {
  icon: ReactNode
  background: string
  title: string
  description: string
  badge: string | null
}

const FEATURES: Feature[] = [
  {
    icon: <Calendar size={22} className="text-primary" aria-hidden />,
    background: 'bg-linear-to-br from-[#aaff00] to-[#39d353]',
    title: 'Booking Instan',
    description:
      'Pesan lapangan padel, futsal, atau badminton dalam hitungan detik. Pilih slot, bayar, selesai.',
    badge: null,
  },
  {
    icon: <PlayCircle size={22} className="text-white" aria-hidden />,
    background: 'bg-primary',
    title: 'Tutorial & Coaching',
    description:
      'Video teknik dari pelatih bersertifikat, dari forehand dasar hingga smash tingkat lanjut.',
    badge: 'Baru',
  },
  {
    icon: <Activity size={22} className="text-white" aria-hidden />,
    background: 'bg-[#2563eb]',
    title: 'Manajemen Performa',
    description: 'Lacak statistik match, jam bermain, dan perkembangan skill tiap minggu.',
    badge: null,
  },
  {
    icon: <Trophy size={22} className="text-primary" aria-hidden />,
    background: 'bg-linear-to-br from-[#aaff00] to-[#39d353]',
    title: 'Gamification & Reward',
    description:
      'Kumpulkan XP, naiki leaderboard, buka badge eksklusif, dan tukar poin jadi diskon booking.',
    badge: 'Hot',
  },
  {
    icon: <Users size={22} className="text-white" aria-hidden />,
    background: 'bg-[#1e3a8a]',
    title: 'Komunitas & Turnamen',
    description:
      'Bergabung dengan komunitas olahraga Balikpapan, ikuti turnamen, dan cari sparring partner.',
    badge: null,
  },
  {
    icon: <Target size={22} className="text-white" aria-hidden />,
    background: 'bg-[#0f3460]',
    title: 'Program Latihan',
    description: 'Jadwal latihan terstruktur mingguan sesuai level dan target bermainmu.',
    badge: null,
  },
]

const QUICK_ACTIONS = [
  { icon: <Calendar size={12} className="text-white" aria-hidden />, label: 'Booking' },
  { icon: <PlayCircle size={12} className="text-white" aria-hidden />, label: 'Tutorial' },
  { icon: <Activity size={12} className="text-white" aria-hidden />, label: 'Stats' },
  { icon: <Gift size={12} className="text-white" aria-hidden />, label: 'Reward' },
]

const LEADERBOARD = [
  { rank: '🥇', name: 'Rafi A.', points: '520 pts' },
  { rank: '🥈', name: 'Siti M.', points: '480 pts' },
  { rank: '🥉', name: 'Kamu', points: '410 pts' },
]

const STORES = [
  { availability: 'Segera di', name: 'App Store' },
  { availability: 'Segera di', name: 'Google Play' },
]

/**
 * Teaser aplikasi mobile ("HOLA! App — Segera Hadir") mengikuti referensi desain.
 * Isi layar ponsel adalah mockup ilustratif, bukan data pengguna sungguhan.
 */
export function AppTeaserSection(): ReactNode {
  return (
    <section className="relative overflow-hidden bg-primary py-24">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-4 py-1.5">
            <Smartphone size={14} className="text-accent" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              HOLA! App — Segera Hadir
            </span>
          </div>
          <h2 className="mb-4 font-display text-5xl font-bold leading-tight text-white md:text-6xl">
            Lebih dari Sekadar
            <br />
            <span className="text-accent">Booking Lapangan</span>
          </h2>
          <p className="mx-auto max-w-xl leading-relaxed text-blue-200">
            Kelola olahraga harianmu, pelajari teknik baru, bersaing dengan teman, dan raih reward —
            semua dalam satu aplikasi.
          </p>
        </div>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Mockup ponsel */}
          <div className="relative flex justify-center">
            <div aria-hidden className="absolute inset-0 flex items-center justify-center">
              <div className="h-72 w-72 rounded-full bg-linear-to-br from-accent/20 to-primary blur-2xl" />
            </div>

            <div aria-hidden className="relative z-10 w-64">
              <div className="overflow-hidden rounded-[2.5rem] border-4 border-white/20 bg-[#0a1f5c] shadow-2xl">
                <div className="flex items-center justify-between bg-[#0a1f5c] px-5 pb-1 pt-3">
                  <span className="text-[10px] font-bold text-white/60">9:41</span>
                  <div className="flex gap-1">
                    <div className="h-1.5 w-3 rounded-sm bg-white/60" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Image
                      src="/logo/icon-logo-hola.png"
                      alt=""
                      width={230}
                      height={230}
                      className="h-5 w-5 rounded-md object-contain"
                    />
                    <span className="font-display text-sm font-semibold text-white">HOLA!</span>
                  </span>
                  <Bell size={14} className="text-white/60" />
                </div>

                <div className="relative mx-3 mb-3 h-[100px] overflow-hidden rounded-2xl">
                  <Image
                    src="/images/app-court-card.jpg"
                    alt=""
                    width={800}
                    height={400}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end bg-linear-to-t from-primary/80 to-transparent p-3">
                    <div>
                      <p className="text-[9px] font-bold text-white">Court A — Klandasan</p>
                      <p className="text-[8px] text-accent">Rp 120.000/jam · Tersedia</p>
                    </div>
                  </div>
                </div>

                <div className="mx-3 mb-3 rounded-xl bg-white/10 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Trophy size={10} className="text-accent" />
                      <span className="text-[9px] font-bold text-white">Level 12 — Padel Pro</span>
                    </span>
                    <span className="text-[8px] font-bold text-accent">2.340 XP</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[68%] rounded-full bg-linear-to-r from-[#aaff00] to-[#39d353]" />
                  </div>
                </div>

                <div className="mx-3 mb-3 grid grid-cols-4 gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <div
                      key={action.label}
                      className="flex flex-col items-center gap-1 rounded-xl bg-white/10 p-2"
                    >
                      {action.icon}
                      <span className="text-[7px] text-white/70">{action.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mx-3 rounded-xl bg-white/10 p-2.5">
                  <p className="mb-1.5 text-[8px] font-bold uppercase tracking-wider text-white/60">
                    Top pemain minggu ini
                  </p>
                  {LEADERBOARD.map((row) => (
                    <div key={row.name} className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[9px]">{row.rank}</span>
                        <span
                          className={`text-[8px] font-semibold ${row.name === 'Kamu' ? 'text-accent' : 'text-white/80'}`}
                        >
                          {row.name}
                        </span>
                      </span>
                      <span className="text-[8px] text-white/50">{row.points}</span>
                    </div>
                  ))}
                </div>

                <div className="mx-2 mb-2 mt-3 flex justify-around rounded-2xl bg-white/10 px-4 py-2">
                  {[Calendar, Activity, Trophy, Users].map((Icon, index) => (
                    <div
                      key={Icon.displayName ?? index}
                      className={`flex flex-col items-center gap-0.5 ${index === 0 ? 'opacity-100' : 'opacity-40'}`}
                    >
                      <Icon size={12} className={index === 0 ? 'text-accent' : 'text-white'} />
                      {index === 0 ? <div className="h-1 w-1 rounded-full bg-accent" /> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -right-10 top-12 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-[#aaff00] to-[#39d353]">
                  <Trophy size={12} className="text-accent-foreground" />
                </div>
                <div>
                  <p className="text-[9px] font-bold leading-none text-foreground">+150 XP</p>
                  <p className="text-[8px] text-muted-foreground">Match selesai!</p>
                </div>
              </div>
              <div className="absolute -left-12 bottom-24 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-xl">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
                  <Bell size={11} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold leading-none text-foreground">Booking OK!</p>
                  <p className="text-[8px] text-muted-foreground">Court A · 08:00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daftar fitur */}
          <div className="flex flex-col gap-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${feature.background}`}
                >
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">{feature.title}</h3>
                    {feature.badge ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                        {feature.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-blue-200">{feature.description}</p>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 pt-4">
              {STORES.map((store) => (
                <div
                  key={store.name}
                  className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-5 py-3"
                >
                  <Smartphone size={20} className="shrink-0 text-white/70" aria-hidden />
                  <div className="text-left">
                    <p className="text-[10px] leading-none text-blue-200">{store.availability}</p>
                    <p className="text-sm font-bold leading-tight text-white">{store.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-blue-300">
              <Bell size={12} aria-hidden />
              <span>
                Belum rilis.{' '}
                <Link href="/daftar" className="font-semibold text-accent hover:underline">
                  Buat akun sekarang
                </Link>{' '}
                supaya jadi yang pertama tahu saat aplikasinya hadir.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
