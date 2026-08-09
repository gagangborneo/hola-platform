'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AnalyticsHeader } from '../../../../components/analytics/AnalyticsHeader.tsx'
import { KpiCard } from '../../../../components/analytics/KpiCard.tsx'
import { FinanceRow, Panel, ToneBadge } from '../../../../components/analytics/Panel.tsx'
import { BarList } from '../../../../components/charts/BarList.tsx'
import { DonutGauge } from '../../../../components/charts/DonutGauge.tsx'
import { ConversionRates, FunnelChart } from '../../../../components/charts/FunnelChart.tsx'
import { LineChart } from '../../../../components/charts/LineChart.tsx'
import { SERIES_COLORS } from '../../../../components/charts/palette.ts'
import { Sparkline } from '../../../../components/charts/Sparkline.tsx'
import { RoleRouteGuard } from '../../../../components/shell/RoleRouteGuard.tsx'
import type { StatusCard as StatusCardData } from '../../../../lib/analytics/executive.ts'
import { buildExecutiveReport } from '../../../../lib/analytics/executive.ts'
import {
  formatCompactRupiah,
  formatFullRupiah,
  formatNumber,
  formatPercent,
  percentChange,
} from '../../../../lib/analytics/format.ts'
import type { PeriodKey } from '../../../../lib/analytics/periods.ts'
import { DEMO_UPDATED_AT, resolvePeriod } from '../../../../lib/analytics/periods.ts'
import { DAILY_SLOT_CAPACITY } from '../../../../lib/analytics/series.ts'

function DemoNotice(): ReactNode {
  return (
    <p className="demo-notice">
      <strong>Data demo</strong>
      Angka pada halaman ini dibangkitkan untuk peragaan bentuk laporan. Sumbernya berpindah ke
      endpoint laporan begitu modul terkait aktif.
    </p>
  )
}

function StatusCard({ card }: { card: StatusCardData }): ReactNode {
  return (
    <div className="status-card">
      <div className="status-card-head">
        <span className={`status-card-mark status-card-mark-${card.tone}`}>
          <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="20"
          >
            {card.tone === 'good' ? (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
              </>
            ) : (
              <>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </>
            )}
          </svg>
        </span>
        <div className="status-card-figure">
          <b>{formatNumber(card.count)} booking</b>
          <span>{formatFullRupiah(card.amount)}</span>
        </div>
      </div>
      <p className="panel-sub">{card.title}</p>
      <dl className="status-card-rows">
        {card.breakdown.map((row) => (
          <div className="status-card-row" key={row.label}>
            <span>{row.label}</span>
            <b>
              {formatNumber(row.count)} · {formatCompactRupiah(row.value)}
            </b>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ExecutiveDashboard(): ReactNode {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current')
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const report = useMemo(() => buildExecutiveReport(period), [period])

  const { comparisonTotals: previous, days, totals } = period
  const dailyOccupancy = days.map((point) => (point.slotsUsed / DAILY_SLOT_CAPACITY) * 100)

  return (
    <div className="analytics-page">
      <AnalyticsHeader
        onPeriodChange={setPeriodKey}
        period={periodKey}
        subtitle={`Ringkasan kinerja bisnis · seluruh lini pendapatan · periode ${period.label}`}
        title="Dashboard Eksekutif"
        updatedAt={DEMO_UPDATED_AT}
      />

      <DemoNotice />

      <div className="kpi-grid">
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={percentChange(totals.bookings, previous.bookings)}
          deltaCaption={period.comparisonLabel}
          label="Total booking"
          trend={days.map((point) => point.bookings)}
          value={formatNumber(totals.bookings)}
        />
        <KpiCard
          color={SERIES_COLORS.aqua}
          delta={percentChange(totals.confirmedBookings, previous.confirmedBookings)}
          deltaCaption={period.comparisonLabel}
          label="Booking lunas"
          trend={days.map((point) => point.confirmedBookings)}
          value={formatNumber(totals.confirmedBookings)}
        />
        <KpiCard
          color={SERIES_COLORS.orange}
          delta={percentChange(totals.slotsUsed, previous.slotsUsed)}
          deltaCaption={period.comparisonLabel}
          label="Slot terpakai"
          trend={days.map((point) => point.slotsUsed)}
          value={formatNumber(totals.slotsUsed)}
        />
        <KpiCard
          color={SERIES_COLORS.yellow}
          delta={percentChange(totals.occupancyRate, previous.occupancyRate)}
          deltaCaption={period.comparisonLabel}
          label="Okupansi lapangan"
          trend={dailyOccupancy}
          value={formatPercent(totals.occupancyRate)}
        />
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={percentChange(totals.revenue, previous.revenue)}
          deltaCaption={period.comparisonLabel}
          label="Pendapatan"
          trend={days.map((point) => point.revenue)}
          value={formatCompactRupiah(report.summary.totalRevenue)}
        />
        <KpiCard
          color={SERIES_COLORS.aqua}
          delta={percentChange(totals.avgOrderValue, previous.avgOrderValue)}
          deltaCaption={period.comparisonLabel}
          label="Rata-rata nilai booking"
          trend={days.map((point) =>
            point.confirmedBookings === 0 ? 0 : point.revenue / point.confirmedBookings,
          )}
          value={formatCompactRupiah(totals.avgOrderValue)}
        />
      </div>

      <div className="analytics-grid analytics-grid-wide">
        <Panel
          subtitle={`${days.length} titik harian · ${period.label}`}
          title="Tren kinerja utama"
        >
          {/*
            Volume dan rupiah dipisah ke dua bagan dengan sumbunya masing-masing.
            Menumpuknya pada satu plot bersumbu ganda akan menyelaraskan dua skala
            yang tidak berhubungan dan memunculkan korelasi yang tidak ada di data.
          */}
          <LineChart
            description={`Booking masuk, booking lunas, dan slot terpakai per hari selama ${period.label}`}
            formatValue={formatNumber}
            height={200}
            labels={period.labels}
            series={[
              {
                color: SERIES_COLORS.blue,
                key: 'bookings',
                label: 'Booking masuk',
                values: days.map((point) => point.bookings),
              },
              {
                color: SERIES_COLORS.orange,
                key: 'confirmed',
                label: 'Booking lunas',
                values: days.map((point) => point.confirmedBookings),
              },
              {
                color: SERIES_COLORS.aqua,
                key: 'slots',
                label: 'Slot terpakai',
                values: days.map((point) => point.slotsUsed),
              },
            ]}
            tickEvery={period.tickEvery}
          />
          <p className="panel-sub" style={{ marginTop: '0.9rem' }}>
            Pendapatan harian (rupiah)
          </p>
          <LineChart
            description={`Pendapatan booking lapangan per hari selama ${period.label}`}
            formatValue={formatCompactRupiah}
            height={150}
            labels={period.labels}
            series={[
              {
                color: SERIES_COLORS.blue,
                key: 'revenue',
                label: 'Pendapatan',
                showArea: true,
                values: days.map((point) => point.revenue),
              },
            ]}
            tickEvery={period.tickEvery}
          />
        </Panel>

        <Panel subtitle="Dari melihat jadwal sampai pembayaran lunas" title="Corong konversi">
          <FunnelChart formatValue={formatNumber} stages={report.funnel} />
          <ConversionRates steps={report.conversionSteps} />
        </Panel>

        <Panel subtitle={`Ringkasan periode ${period.label}`} title="Booking & pendapatan">
          <dl className="finance-rows">
            <FinanceRow label="Booking lunas" value={formatNumber(totals.confirmedBookings)} />
            <FinanceRow label="Pendapatan lapangan" value={formatCompactRupiah(totals.revenue)} />
            <FinanceRow
              label="Pendapatan seluruh lini"
              value={formatCompactRupiah(report.summary.totalRevenue)}
            />
            <FinanceRow
              label="Konversi booking → lunas"
              value={formatPercent((totals.confirmedBookings / totals.bookings) * 100)}
            />
            <FinanceRow
              label="Rata-rata slot per booking"
              value={(totals.slotsUsed / totals.confirmedBookings).toFixed(2).replace('.', ',')}
            />
            <FinanceRow
              emphasis
              label="Laba bersih"
              total
              value={formatCompactRupiah(report.summary.netProfit)}
            />
          </dl>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-wide">
        <Panel subtitle="Diurutkan berdasarkan pendapatan periode ini" title="Performa lapangan">
          <div className="table-scroll">
            <table className="pl-table">
              <thead>
                <tr>
                  <th scope="col">Lapangan</th>
                  <th scope="col">Cabang</th>
                  <th scope="col">Booking</th>
                  <th scope="col">Slot</th>
                  <th scope="col">Okupansi</th>
                  <th scope="col">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {report.courts.map((court) => (
                  <tr key={court.code}>
                    <th scope="row">{court.code}</th>
                    <td style={{ textAlign: 'left' }}>{court.sport}</td>
                    <td>{formatNumber(court.bookings)}</td>
                    <td>{formatNumber(court.slots)}</td>
                    <td>{formatPercent(court.occupancyRate)}</td>
                    <td>{formatCompactRupiah(court.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel subtitle="Distribusi booking lunas per kanal" title="Kanal pemesanan">
          <BarList formatValue={formatNumber} items={[...report.channels]} />
        </Panel>

        <Panel subtitle="Pendapatan periode ini per sumber" title="Lini bisnis">
          <BarList formatValue={formatCompactRupiah} items={[...report.businessLines]} />
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-2">
        <Panel subtitle="Berdasarkan jurnal keuangan" title="Ringkasan keuangan">
          <dl className="finance-rows">
            <FinanceRow
              emphasis
              label="Total pendapatan"
              value={formatCompactRupiah(report.summary.totalRevenue)}
            />
            <FinanceRow
              label={`Laba kotor · margin ${formatPercent(report.summary.grossMargin)}`}
              value={formatCompactRupiah(report.summary.grossProfit)}
            />
            <FinanceRow
              label={`Laba bersih · margin ${formatPercent(report.summary.netMargin)}`}
              value={formatCompactRupiah(report.summary.netProfit)}
            />
            <FinanceRow
              label="Kas & bank"
              value={formatCompactRupiah(report.summary.cashAndBank)}
            />
          </dl>
          <p className="panel-sub" style={{ marginTop: '0.8rem' }}>
            Pendapatan lapangan · 6 bulan terakhir
          </p>
          <LineChart
            description="Pendapatan bulanan booking lapangan selama enam bulan terakhir"
            formatValue={formatCompactRupiah}
            height={150}
            labels={[...report.financeTrend.labels]}
            series={[
              {
                color: SERIES_COLORS.aqua,
                key: 'monthly-revenue',
                label: 'Pendapatan bulanan',
                showArea: true,
                values: [...report.financeTrend.cash],
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
                  <th scope="col">Δ</th>
                </tr>
              </thead>
              <tbody>
                {report.profitLoss.map((row) => {
                  // Baris beban dan contra-revenue disimpan negatif. Deltanya dihitung
                  // atas besarannya — kalau tidak, beban yang naik 12% akan terbaca
                  // turun 212% hanya karena tandanya. Arah "baik" lalu dibalik untuk
                  // baris itu: beban naik bukan kabar bagus.
                  const isCost = row.current < 0
                  const change = percentChange(Math.abs(row.current), Math.abs(row.previous))
                  const isUp = change !== null && change > 0
                  // Nol bukan kabar baik maupun buruk; mewarnainya merah pada baris
                  // beban membuat pos yang tidak bergerak terlihat memburuk.
                  const isNeutral = change === null || change === 0
                  const isGood = isCost ? !isUp : isUp
                  return (
                    <tr
                      className={row.emphasis === true ? 'pl-row-strong' : undefined}
                      key={row.key}
                    >
                      <th scope="row" style={{ fontWeight: row.emphasis === true ? 800 : 400 }}>
                        {row.label}
                      </th>
                      <td>{formatCompactRupiah(row.current)}</td>
                      <td
                        className={isNeutral ? undefined : isGood ? 'pl-delta-up' : 'pl-delta-down'}
                      >
                        {change === null
                          ? '—'
                          : `${isUp ? '+' : ''}${change.toFixed(1).replace('.', ',')}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-2">
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
          <p className="finance-section">Liabilitas</p>
          <dl className="finance-rows">
            {[
              ...report.balanceSheet.shortTermLiabilities,
              ...report.balanceSheet.longTermLiabilities,
            ].map((row) => (
              <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
            ))}
            <FinanceRow
              emphasis
              label="Total liabilitas"
              total
              value={formatFullRupiah(report.balanceSheet.totalLiabilities)}
            />
          </dl>
          <p className="finance-section">Ekuitas</p>
          <dl className="finance-rows">
            {report.balanceSheet.equity.map((row) => (
              <FinanceRow key={row.label} label={row.label} value={formatFullRupiah(row.value)} />
            ))}
            <FinanceRow
              emphasis
              label="Total ekuitas"
              total
              value={formatFullRupiah(report.balanceSheet.totalEquity)}
            />
          </dl>
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle="Rasio kinerja & keuangan periode ini" title="Indikator kesehatan bisnis">
          <div className="health-grid">
            {report.health.map((indicator) => (
              <div className="health-card" key={indicator.key}>
                <p>{indicator.label}</p>
                <strong>{indicator.value}</strong>
                <ToneBadge label={indicator.toneLabel} tone={indicator.tone} />
                {indicator.trend === undefined ? null : (
                  <Sparkline
                    color={SERIES_COLORS.blue}
                    description={`Tren bulanan ${indicator.label}`}
                    values={indicator.trend}
                  />
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel subtitle="Realisasi Maret–Agustus 2026" title="Target tahun 2026">
          <div className="gauge-grid">
            {report.targets.map((target) => (
              <DonutGauge
                caption={target.caption}
                key={target.label}
                label={target.label}
                percent={target.percent}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        subtitle="Rincian per kategori klaim slot · booking reguler, event, dan turnamen"
        title="Status booking"
      >
        <div className="status-cards">
          {report.statusCards.map((card) => (
            <StatusCard card={card} key={card.key} />
          ))}
        </div>
      </Panel>
    </div>
  )
}

export default function ExecutiveDashboardPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <ExecutiveDashboard />
    </RoleRouteGuard>
  )
}
