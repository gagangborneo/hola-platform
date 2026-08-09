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
import { buildExecutiveReport } from '../../../../lib/analytics/executive.ts'
import { buildFinanceExtras } from '../../../../lib/analytics/finance-report.ts'
import {
  formatCompactRupiah,
  formatFullRupiah,
  formatPercent,
  percentChange,
} from '../../../../lib/analytics/format.ts'
import type { PeriodKey } from '../../../../lib/analytics/periods.ts'
import { DEMO_UPDATED_AT, MONTH_SERIES, resolvePeriod } from '../../../../lib/analytics/periods.ts'
import { shortMonthLabel } from '../../../../lib/analytics/series.ts'

const TENANT_RECEIVABLE = 38_500_000

function FinanceDashboard(): ReactNode {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current')
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const report = useMemo(() => buildExecutiveReport(period), [period])
  const extras = useMemo(() => buildFinanceExtras(report, TENANT_RECEIVABLE), [report])

  const { comparisonTotals: previous, days, totals } = period
  const discounts = Math.abs(report.profitLoss.find((row) => row.key === 'discount')?.current ?? 0)

  return (
    <div className="analytics-page">
      <AnalyticsHeader
        onPeriodChange={setPeriodKey}
        period={periodKey}
        subtitle={`Pendapatan, laba rugi, arus kas, dan posisi keuangan · periode ${period.label}`}
        title="Dashboard Keuangan"
        updatedAt={DEMO_UPDATED_AT}
      />

      <p className="demo-notice">
        <strong>Data demo</strong>
        Angka pada halaman ini dibangkitkan untuk peragaan bentuk laporan. Struktur akunnya
        mengikuti bagan akun minimal pada dokumen modul jurnal keuangan.
      </p>

      <div className="kpi-grid">
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={percentChange(totals.revenue, previous.revenue)}
          deltaCaption={period.comparisonLabel}
          label="Total pendapatan"
          trend={days.map((point) => point.revenue)}
          value={formatCompactRupiah(report.summary.totalRevenue)}
        />
        <KpiCard
          color={SERIES_COLORS.aqua}
          delta={percentChange(totals.revenue, previous.revenue)}
          deltaCaption={period.comparisonLabel}
          label="Laba kotor"
          trend={days.map((point) => point.revenue)}
          value={formatCompactRupiah(report.summary.grossProfit)}
        />
        <KpiCard
          color={SERIES_COLORS.orange}
          delta={percentChange(totals.revenue, previous.revenue)}
          deltaCaption={period.comparisonLabel}
          label="Laba bersih"
          trend={days.map((point) => point.revenue)}
          value={formatCompactRupiah(report.summary.netProfit)}
        />
        <KpiCard
          color={SERIES_COLORS.yellow}
          delta={null}
          deltaCaption="posisi akhir periode"
          label="Kas & bank"
          trend={MONTH_SERIES.map((month) => month.totals.revenue)}
          value={formatCompactRupiah(report.summary.cashAndBank)}
        />
        <KpiCard
          color={SERIES_COLORS.orange}
          delta={null}
          deltaCaption="tagihan tenant belum tertagih"
          isUpGood={false}
          label="Piutang tenant"
          trend={MONTH_SERIES.map((month) => month.totals.revenue)}
          value={formatCompactRupiah(TENANT_RECEIVABLE)}
        />
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={null}
          deltaCaption="contra-revenue periode ini"
          isUpGood={false}
          label="Diskon & voucher"
          trend={days.map((point) => Math.round(point.revenue * 0.045))}
          value={formatCompactRupiah(discounts)}
        />
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle="Pendapatan booking lapangan per hari" title="Tren pendapatan">
          <LineChart
            description={`Pendapatan booking lapangan per hari selama ${period.label}`}
            formatValue={formatCompactRupiah}
            height={210}
            labels={period.labels}
            series={[
              {
                color: SERIES_COLORS.blue,
                key: 'revenue',
                label: 'Pendapatan harian',
                showArea: true,
                values: days.map((point) => point.revenue),
              },
            ]}
            tickEvery={period.tickEvery}
          />
          <p className="panel-sub" style={{ marginTop: '0.9rem' }}>
            Pendapatan bulanan · 6 bulan terakhir
          </p>
          <LineChart
            description="Pendapatan bulanan booking lapangan selama enam bulan terakhir"
            formatValue={formatCompactRupiah}
            height={150}
            labels={MONTH_SERIES.map((month) => shortMonthLabel(month.month, month.year))}
            series={[
              {
                color: SERIES_COLORS.aqua,
                key: 'monthly-revenue',
                label: 'Pendapatan bulanan',
                showArea: true,
                values: MONTH_SERIES.map((month) => month.totals.revenue),
              },
            ]}
          />
        </Panel>

        <Panel subtitle={`${period.label} dibandingkan periode sebelumnya`} title="Laba rugi">
          <div className="table-scroll">
            <table className="pl-table">
              <thead>
                <tr>
                  <th scope="col">Keterangan</th>
                  <th scope="col">Nilai</th>
                  <th scope="col">Periode lalu</th>
                </tr>
              </thead>
              <tbody>
                {report.profitLoss.map((row) => (
                  <tr className={row.emphasis === true ? 'pl-row-strong' : undefined} key={row.key}>
                    <th scope="row" style={{ fontWeight: row.emphasis === true ? 800 : 400 }}>
                      {row.label}
                    </th>
                    <td>{formatFullRupiah(row.current)}</td>
                    <td>{formatFullRupiah(row.previous)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="finance-rows" style={{ marginTop: '0.6rem' }}>
            <FinanceRow
              label="Margin laba kotor"
              value={formatPercent(report.summary.grossMargin)}
            />
            <FinanceRow
              label="Margin laba bersih"
              value={formatPercent(report.summary.netMargin)}
            />
          </dl>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-3">
        <Panel subtitle="Nilai transaksi per metode" title="Metode pembayaran">
          <BarList formatValue={formatCompactRupiah} items={[...extras.paymentMethods]} />
        </Panel>

        <Panel subtitle="Pendapatan periode ini per sumber" title="Lini bisnis">
          <BarList formatValue={formatCompactRupiah} items={[...report.businessLines]} />
        </Panel>

        <Panel subtitle="Contra-revenue periode ini" title="Rekap diskon">
          <BarList formatValue={formatCompactRupiah} items={[...extras.discountRecap]} />
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-3">
        <Panel subtitle={`Periode ${period.label}`} title="Arus kas">
          <p className="finance-section">Kas masuk</p>
          <dl className="finance-rows">
            {report.cashFlow.inflow.map((row) => (
              <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
            ))}
            <FinanceRow
              emphasis
              label="Total kas masuk"
              total
              value={formatFullRupiah(report.cashFlow.totalInflow)}
            />
          </dl>
          <p className="finance-section">Kas keluar</p>
          <dl className="finance-rows">
            {report.cashFlow.outflow.map((row) => (
              <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
            ))}
            <FinanceRow
              emphasis
              label="Total kas keluar"
              total
              value={formatFullRupiah(report.cashFlow.totalOutflow)}
            />
          </dl>
          <dl className="finance-rows">
            <FinanceRow
              emphasis
              label="Arus kas bersih"
              total
              value={formatFullRupiah(report.cashFlow.net)}
            />
          </dl>
        </Panel>

        <Panel subtitle={`Per akhir ${period.label}`} title="Posisi keuangan">
          <p className="finance-section">Aset</p>
          <dl className="finance-rows">
            {[...report.balanceSheet.currentAssets, ...report.balanceSheet.fixedAssets].map(
              (row) => (
                <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
              ),
            )}
            <FinanceRow
              emphasis
              label="Total aset"
              total
              value={formatFullRupiah(report.balanceSheet.totalAssets)}
            />
          </dl>
          <p className="finance-section">Liabilitas & ekuitas</p>
          <dl className="finance-rows">
            {[
              ...report.balanceSheet.shortTermLiabilities,
              ...report.balanceSheet.longTermLiabilities,
              ...report.balanceSheet.equity,
            ].map((row) => (
              <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
            ))}
            <FinanceRow
              emphasis
              label="Total liabilitas & ekuitas"
              total
              value={formatFullRupiah(
                report.balanceSheet.totalLiabilities + report.balanceSheet.totalEquity,
              )}
            />
          </dl>
        </Panel>

        <Panel subtitle="Tagihan sewa tenant cafe" title="Aging piutang tenant">
          <BarList formatValue={formatCompactRupiah} items={[...extras.tenantAging]} ordinal />
          <dl className="finance-rows" style={{ marginTop: '1rem' }}>
            <FinanceRow
              emphasis
              label="Total piutang tenant"
              total
              value={formatFullRupiah(TENANT_RECEIVABLE)}
            />
          </dl>
        </Panel>
      </div>
    </div>
  )
}

export default function FinanceDashboardPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <FinanceDashboard />
    </RoleRouteGuard>
  )
}
