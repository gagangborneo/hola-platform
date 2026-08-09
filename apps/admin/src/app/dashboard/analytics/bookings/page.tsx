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
import { buildBookingsReport } from '../../../../lib/analytics/bookings-report.ts'
import {
  formatCompactRupiah,
  formatNumber,
  formatPercent,
  percentChange,
} from '../../../../lib/analytics/format.ts'
import type { PeriodKey } from '../../../../lib/analytics/periods.ts'
import { DEMO_UPDATED_AT, resolvePeriod } from '../../../../lib/analytics/periods.ts'
import { DAILY_SLOT_CAPACITY } from '../../../../lib/analytics/series.ts'

function BookingsDashboard(): ReactNode {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current')
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const report = useMemo(() => buildBookingsReport(period), [period])

  const { comparisonTotals: previous, days, totals } = period

  return (
    <div className="analytics-page">
      <AnalyticsHeader
        onPeriodChange={setPeriodKey}
        period={periodKey}
        subtitle={`Volume, status, dan sebaran waktu pemesanan · periode ${period.label}`}
        title="Dashboard Pemesanan"
        updatedAt={DEMO_UPDATED_AT}
      />

      <p className="demo-notice">
        <strong>Data demo</strong>
        Angka pada halaman ini dibangkitkan untuk peragaan bentuk laporan.
      </p>

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
          trend={days.map((point) => (point.slotsUsed / DAILY_SLOT_CAPACITY) * 100)}
          value={formatPercent(totals.occupancyRate)}
        />
        <KpiCard
          color={SERIES_COLORS.orange}
          delta={null}
          deltaCaption="dari total booking"
          isUpGood={false}
          label="Tingkat pembatalan"
          trend={days.map((point) => point.bookings - point.confirmedBookings)}
          value={formatPercent(report.cancellationRate)}
        />
        <KpiCard
          color={SERIES_COLORS.blue}
          delta={percentChange(totals.avgOrderValue, previous.avgOrderValue)}
          deltaCaption={period.comparisonLabel}
          label="Rata-rata nilai booking"
          trend={days.map((point) =>
            point.confirmedBookings === 0 ? 0 : point.revenue / point.confirmedBookings,
          )}
          value={formatCompactRupiah(totals.avgOrderValue)}
        />
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle={`${days.length} titik harian`} title="Tren pemesanan harian">
          <LineChart
            description={`Booking masuk, booking lunas, dan slot terpakai per hari selama ${period.label}`}
            formatValue={formatNumber}
            height={230}
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
        </Panel>

        <Panel subtitle="Seluruh booking periode ini" title="Status booking">
          <BarList formatValue={formatNumber} items={[...report.statuses]} />
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-3">
        <Panel subtitle="Booking lunas per kanal" title="Kanal pemesanan">
          <BarList formatValue={formatNumber} items={[...report.channels]} />
        </Panel>

        <Panel subtitle="Jarak antara pemesanan dan jadwal main" title="Lead time pemesanan">
          <BarList formatValue={formatNumber} items={[...report.leadTime]} ordinal />
        </Panel>

        <Panel subtitle="Total booking per hari dalam seminggu" title="Sebaran hari">
          <BarList formatValue={formatNumber} items={[...report.weekdays]} />
        </Panel>
      </div>

      <div className="analytics-grid analytics-grid-split">
        <Panel subtitle="Slot terpakai per jam mulai · 07.00–21.00" title="Jam sibuk">
          <BarList formatValue={formatNumber} items={[...report.peakHours]} />
        </Panel>

        <Panel subtitle="Ringkasan operasional periode ini" title="Ringkasan">
          <dl className="finance-rows">
            <FinanceRow label="Total booking" value={formatNumber(totals.bookings)} />
            <FinanceRow label="Booking lunas" value={formatNumber(totals.confirmedBookings)} />
            <FinanceRow
              label="Konversi booking → lunas"
              value={formatPercent((totals.confirmedBookings / totals.bookings) * 100)}
            />
            <FinanceRow
              label="Rata-rata slot per booking"
              value={report.slotsPerBooking.toFixed(2).replace('.', ',')}
            />
            <FinanceRow label="Kapasitas slot periode" value={formatNumber(totals.slotCapacity)} />
            <FinanceRow label="Slot terpakai" value={formatNumber(totals.slotsUsed)} />
            <FinanceRow
              emphasis
              label="Okupansi lapangan"
              total
              value={formatPercent(totals.occupancyRate)}
            />
          </dl>
        </Panel>
      </div>
    </div>
  )
}

export default function BookingsDashboardPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <BookingsDashboard />
    </RoleRouteGuard>
  )
}
