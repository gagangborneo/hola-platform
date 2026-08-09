/**
 * Laporan membership & loyalty demo.
 *
 * Tier, poin, dan leaderboard mengikuti model gamification di docs/12: poin
 * lahir dari aktivitas terverifikasi, tier dari `lifetime_points`, dan
 * leaderboard punya periode yang ditutup — bukan angka bebas.
 */
import type { ResolvedPeriod } from './periods.ts'
import { MONTH_SERIES } from './periods.ts'

export interface MembershipReport {
  readonly activeMembers: number
  readonly avgVisitsPerMember: number
  readonly leaderboard: readonly {
    readonly name: string
    readonly points: number
    readonly rank: number
    readonly tier: string
    readonly visits: number
  }[]
  readonly newMembers: number
  readonly pointSources: readonly { key: string; label: string; value: number; detail: string }[]
  readonly pointsIssued: number
  readonly pointsRedeemed: number
  readonly repeatRate: number
  readonly tiers: readonly { key: string; label: string; value: number; detail: string }[]
}

/** Basis member sebelum jendela data demo dimulai. */
const MEMBER_BASE = 640

const TIER_SHARES: readonly { key: string; label: string; share: number; threshold: string }[] = [
  { key: 'bronze', label: 'Bronze', share: 0.58, threshold: '0–999 poin' },
  { key: 'silver', label: 'Silver', share: 0.26, threshold: '1.000–2.999 poin' },
  { key: 'gold', label: 'Gold', share: 0.12, threshold: '3.000–7.499 poin' },
  { key: 'platinum', label: 'Platinum', share: 0.04, threshold: '7.500+ poin' },
]

const POINT_SOURCE_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'booking', label: 'Booking selesai', share: 0.62 },
  { key: 'event', label: 'Ikut event', share: 0.16 },
  { key: 'tournament', label: 'Ikut turnamen', share: 0.12 },
  { key: 'streak', label: 'Streak mingguan', share: 0.07 },
  { key: 'referral', label: 'Referral', share: 0.03 },
]

/** Papan peringkat peraga; nama fiktif. */
const LEADERBOARD_NAMES: readonly string[] = [
  'Rizky Ananda',
  'Putri Maharani',
  'Bagus Setiawan',
  'Nadia Salsabila',
  'Fajar Ramadhan',
  'Intan Permata',
  'Yoga Pratama',
  'Aulia Rahman',
  'Dimas Aryo',
  'Kirana Dewi',
]

export function buildMembershipReport(period: ResolvedPeriod): MembershipReport {
  const { comparisonTotals: previous, totals } = period

  const cumulativeNew = MONTH_SERIES.reduce((carry, month) => carry + month.totals.newMembers, 0)
  const activeMembers = MEMBER_BASE + cumulativeNew

  // 1 poin per Rp 10.000 pendapatan booking — nilai tukar peraga (docs/12 § 9).
  const pointsIssued = Math.round(totals.revenue / 10_000)
  const pointsRedeemed = Math.round(pointsIssued * 0.18)

  const bookingMembers = Math.round(totals.confirmedBookings * 0.71)
  const repeatRate = previous.confirmedBookings === 0 ? 0 : (bookingMembers / activeMembers) * 100

  const tiers = TIER_SHARES.map((tier) => ({
    detail: tier.threshold,
    key: tier.key,
    label: tier.label,
    value: Math.round(activeMembers * tier.share),
  }))

  const leaderboard = LEADERBOARD_NAMES.map((name, index) => {
    const points = Math.round((pointsIssued / 26) * (1 - index * 0.072))
    return {
      name,
      points,
      rank: index + 1,
      tier: index < 1 ? 'Platinum' : index < 4 ? 'Gold' : index < 8 ? 'Silver' : 'Bronze',
      visits: Math.round(points / 34),
    }
  })

  return {
    activeMembers,
    avgVisitsPerMember: activeMembers === 0 ? 0 : totals.confirmedBookings / activeMembers,
    leaderboard,
    newMembers: totals.newMembers,
    pointSources: POINT_SOURCE_SHARES.map((entry) => ({
      detail: `${Math.round(entry.share * 100)}% dari poin terbit`,
      key: entry.key,
      label: entry.label,
      value: Math.round(pointsIssued * entry.share),
    })),
    pointsIssued,
    pointsRedeemed,
    repeatRate,
    tiers,
  }
}
