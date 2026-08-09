'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AnalyticsHeader } from '../../../../components/analytics/AnalyticsHeader.tsx'
import { KpiCard } from '../../../../components/analytics/KpiCard.tsx'
import { FinanceRow, Panel } from '../../../../components/analytics/Panel.tsx'
import { BarList } from '../../../../components/charts/BarList.tsx'
import { LineChart } from '../../../../components/charts/LineChart.tsx'
import { SERIES_COLORS } from '../../../../components/charts/palette.ts'
import { RoleRouteGuard } from '../../../../components/shell/RoleRouteGuard.tsx'
import { formatNumber, formatPercent, percentChange } from '../../../../lib/analytics/format.ts'
import { buildMembershipReport } from '../../../../lib/analytics/membership-report.ts'
import type { PeriodKey } from '../../../../lib/analytics/periods.ts'
import { DEMO_UPDATED_AT, MONTH_SERIES, resolvePeriod } from '../../../../lib/analytics/periods.ts'
import { shortMonthLabel } from '../../../../lib/analytics/series.ts'

function MembershipDashboard(): ReactNode {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current')
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const report = useMemo(() => buildMembershipReport(period), [period])

  const { comparisonTotals: previous, days, totals } = period

  return (
    <div className="analytics-page">
      <AnalyticsHeader
        onPeriodChange={setPeriodKey}
        period={periodKey}
        subtitle={`Pertumbuhan member, tier loyalitas, dan poin · periode ${period.label}`}
        title="Dashboard Membership"
        updatedAt={DEMO_UPDATED_AT}
      />

      <p className="demo-notice">
        <strong>Data demo</strong>
        Angka pada halaman ini dibangkitkan untuk peragaan bentuk laporan.
      </p>

      <div className="kpi-grid">
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={null}
          deltaCaption="akumulasi sejak Maret 2026"
          label="Member aktif"
          trend={MONTH_SERIES.map((month) => month.totals.newMembers)}
          value={formatNumber(report.activeMembers)}
        />
        <KpiCard
          color={SERIES_COLORS.aqua}
          delta={percentChange(totals.newMembers, previous.newMembers)}
          deltaCaption={period.comparisonLabel}
          label="Member baru"
          trend={days.map((point) => point.newMembers)}
          value={formatNumber(report.newMembers)}
        />
        <KpiCard
          color={SERIES_COLORS.orange}
          delta={null}
          deltaCaption="member yang booking periode ini"
          label="Tingkat keaktifan"
          trend={days.map((point) => point.confirmedBookings)}
          value={formatPercent(report.repeatRate)}
        />
        <KpiCard
          color={SERIES_COLORS.yellow}
          delta={percentChange(totals.confirmedBookings, previous.confirmedBookings)}
          deltaCaption={period.comparisonLabel}
          label="Kunjungan per member"
          trend={days.map((point) => point.confirmedBookings)}
          value={report.avgVisitsPerMember.toFixed(2).replace('.', ',')}
        />
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={percentChange(totals.revenue, previous.revenue)}
          deltaCaption={period.comparisonLabel}
          label="Poin diterbitkan"
          trend={days.map((point) => Math.round(point.revenue / 10_000))}
          value={formatNumber(report.pointsIssued)}
        />
        <KpiCard
          color={SERIES_COLORS.aqua}
          delta={null}
          deltaCaption="18% dari poin terbit"
          label="Poin ditukar"
          trend={days.map((point) => Math.round((point.revenue / 10_000) * 0.18))}
          value={formatNumber(report.pointsRedeemed)}
        />
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle="Member baru per hari" title="Tren pertumbuhan member">
          <LineChart
            description={`Member baru per hari selama ${period.label}`}
            formatValue={formatNumber}
            height={200}
            labels={period.labels}
            series={[
              {
                color: SERIES_COLORS.blue,
                key: 'new-members',
                label: 'Member baru',
                showArea: true,
                values: days.map((point) => point.newMembers),
              },
            ]}
            tickEvery={period.tickEvery}
          />
          <p className="panel-sub" style={{ marginTop: '0.9rem' }}>
            Member baru per bulan · 6 bulan terakhir
          </p>
          <LineChart
            description="Member baru per bulan selama enam bulan terakhir"
            formatValue={formatNumber}
            height={150}
            labels={MONTH_SERIES.map((month) => shortMonthLabel(month.month, month.year))}
            series={[
              {
                color: SERIES_COLORS.aqua,
                key: 'monthly-members',
                label: 'Member baru bulanan',
                showArea: true,
                values: MONTH_SERIES.map((month) => month.totals.newMembers),
              },
            ]}
          />
        </Panel>

        <Panel subtitle="Berdasarkan lifetime points" title="Sebaran tier loyalitas">
          <BarList formatValue={formatNumber} items={[...report.tiers]} ordinal />
          <dl className="finance-rows" style={{ marginTop: '1rem' }}>
            <FinanceRow label="Total member" value={formatNumber(report.activeMembers)} />
            <FinanceRow
              emphasis
              label="Member tier Gold ke atas"
              total
              value={formatNumber(
                report.tiers
                  .filter((tier) => tier.key === 'gold' || tier.key === 'platinum')
                  .reduce((carry, tier) => carry + tier.value, 0),
              )}
            />
          </dl>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle="Periode leaderboard berjalan" title="Papan peringkat member">
          <div className="table-scroll">
            <table className="pl-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Member</th>
                  <th scope="col">Tier</th>
                  <th scope="col">Kunjungan</th>
                  <th scope="col">Poin</th>
                </tr>
              </thead>
              <tbody>
                {report.leaderboard.map((entry) => (
                  <tr key={entry.name}>
                    <th scope="row">{entry.rank}</th>
                    <td style={{ textAlign: 'left' }}>{entry.name}</td>
                    <td style={{ textAlign: 'left' }}>{entry.tier}</td>
                    <td>{formatNumber(entry.visits)}</td>
                    <td>{formatNumber(entry.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel subtitle="Asal poin yang terbit periode ini" title="Sumber poin">
          <BarList formatValue={formatNumber} items={[...report.pointSources]} />
        </Panel>
      </div>
    </div>
  )
}

export default function MembershipDashboardPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <MembershipDashboard />
    </RoleRouteGuard>
  )
}
