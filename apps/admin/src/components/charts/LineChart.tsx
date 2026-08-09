'use client'

import { type PointerEvent, type ReactNode, useId, useRef, useState } from 'react'
import { CHART_INK } from './palette.ts'
import { niceMax, ticksFor } from './scale.ts'

export interface ChartSeries {
  readonly color: string
  readonly key: string
  readonly label: string
  /** Wash 10% di bawah garis. Hanya masuk akal untuk satu seri — dua area saling menutup. */
  readonly showArea?: boolean
  readonly values: readonly number[]
}

interface LineChartProps {
  /** Dibaca pembaca layar sebagai ringkasan bagan. */
  readonly description: string
  readonly formatValue: (value: number) => string
  readonly height?: number
  readonly labels: readonly string[]
  readonly series: readonly ChartSeries[]
  /** Tick sumbu-x dirapatkan/dijarangkan lewat ini; 31 label harian tidak muat semua. */
  readonly tickEvery?: number
}

const VIEW_WIDTH = 640
const PAD = { bottom: 30, right: 20, top: 14 } as const
const TICK_COUNT = 4

/**
 * Ruang sumbu-y dihitung dari label terpanjang, bukan dipatok.
 *
 * Padding tetap cukup untuk "1.200" tapi memotong "Rp 400,0 jt" — dan yang
 * terpotong adalah huruf pertama, sehingga label tetap terbaca seperti angka
 * yang benar. Lebar karakter didekati, bukan diukur: mengukur teks butuh DOM,
 * sementara nilai ini sudah harus ada saat render pertama di server.
 */
function axisWidthFor(ticks: readonly string[]): number {
  const longest = ticks.reduce((carry, tick) => Math.max(carry, tick.length), 0)
  return Math.max(36, Math.min(110, longest * 6.4 + 12))
}

export function LineChart({
  description,
  formatValue,
  height = 240,
  labels,
  series,
  tickEvery = 1,
}: LineChartProps): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const tableId = useId()

  const pointCount = labels.length
  const plotHeight = height - PAD.top - PAD.bottom
  const maxValue = niceMax(Math.max(...series.flatMap((entry) => [...entry.values])), TICK_COUNT)
  const ticks = ticksFor(maxValue, TICK_COUNT)
  const padLeft = axisWidthFor(ticks.map(formatValue))
  const plotWidth = VIEW_WIDTH - padLeft - PAD.right

  const xFor = (index: number): number =>
    pointCount <= 1 ? padLeft + plotWidth / 2 : padLeft + (index / (pointCount - 1)) * plotWidth
  const yFor = (value: number): number => PAD.top + plotHeight - (value / maxValue) * plotHeight

  const pathFor = (values: readonly number[]): string =>
    values
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${xFor(index)} ${yFor(value)}`)
      .join(' ')

  const areaPathFor = (values: readonly number[]): string =>
    `${pathFor(values)} L${xFor(values.length - 1)} ${PAD.top + plotHeight} L${xFor(0)} ${
      PAD.top + plotHeight
    } Z`

  // Koordinat pointer dipetakan lewat lebar terender, bukan lebar viewBox: SVG
  // ini melar mengikuti kartunya, jadi keduanya jarang sama.
  const indexFromPointer = (event: PointerEvent<SVGSVGElement>): number => {
    const bounds = svgRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return 0
    const viewX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH
    const ratio = (viewX - padLeft) / plotWidth
    return Math.min(pointCount - 1, Math.max(0, Math.round(ratio * (pointCount - 1))))
  }

  const tooltipAnchor = hovered === null ? 0 : (xFor(hovered) / VIEW_WIDTH) * 100

  return (
    <div className="chart">
      {series.length > 1 ? (
        <ul className="chart-legend">
          {series.map((entry) => (
            <li key={entry.key}>
              <i style={{ background: entry.color }} />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="chart-plot">
        {/*
          Bagannya tidak bisa difokus keyboard: tooltip di sini murni tambahan,
          dan setiap nilainya tetap terbaca lewat tabel data di bawah — yang
          sudah berupa kontrol native dan terhubung lewat `aria-describedby`.
          Jadi tidak ada angka yang hanya bisa diambil dengan mengarahkan mouse.
        */}
        <svg
          aria-describedby={tableId}
          height={height}
          onPointerLeave={() => setHovered(null)}
          onPointerMove={(event) => setHovered(indexFromPointer(event))}
          ref={svgRef}
          role="img"
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          width="100%"
        >
          <title>{description}</title>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke={CHART_INK.grid}
                strokeWidth="1"
                x1={padLeft}
                x2={VIEW_WIDTH - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
              />
              <text
                className="chart-tick"
                fill={CHART_INK.muted}
                textAnchor="end"
                x={padLeft - 8}
                y={yFor(tick) + 4}
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {labels.map((label, index) =>
            index % tickEvery === 0 || index === pointCount - 1 ? (
              <text
                className="chart-tick"
                fill={CHART_INK.muted}
                key={label}
                textAnchor="middle"
                x={xFor(index)}
                y={height - 10}
              >
                {label}
              </text>
            ) : null,
          )}

          {series.map((entry) =>
            entry.showArea === true ? (
              <path
                d={areaPathFor(entry.values)}
                fill={entry.color}
                key={entry.key}
                opacity="0.1"
              />
            ) : null,
          )}

          {hovered === null ? null : (
            <line
              stroke={CHART_INK.axis}
              strokeWidth="1"
              x1={xFor(hovered)}
              x2={xFor(hovered)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
            />
          )}

          {series.map((entry) => (
            <path
              d={pathFor(entry.values)}
              fill="none"
              key={entry.key}
              stroke={entry.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          ))}

          {series.map((entry) => {
            const index = hovered ?? entry.values.length - 1
            const value = entry.values[index]
            if (value === undefined) return null
            return (
              <circle
                cx={xFor(index)}
                cy={yFor(value)}
                fill={entry.color}
                key={entry.key}
                r="4"
                stroke={CHART_INK.surface}
                strokeWidth="2"
              />
            )
          })}

          <line
            stroke={CHART_INK.axis}
            strokeWidth="1"
            x1={padLeft}
            x2={VIEW_WIDTH - PAD.right}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
          />
        </svg>

        {hovered === null ? null : (
          <div
            className={
              tooltipAnchor > 62
                ? 'chart-tooltip chart-tooltip-left'
                : tooltipAnchor < 22
                  ? 'chart-tooltip chart-tooltip-right'
                  : 'chart-tooltip'
            }
            style={{ left: `${tooltipAnchor}%` }}
          >
            <strong>{labels[hovered]}</strong>
            {series.map((entry) => (
              <span key={entry.key}>
                <i style={{ background: entry.color }} />
                {entry.label}
                <b>{formatValue(entry.values[hovered] ?? 0)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <details className="chart-table" id={tableId}>
        <summary>Tabel data</summary>
        <div className="table-scroll">
          <table className="line-table">
            <thead>
              <tr>
                <th scope="col">Periode</th>
                {series.map((entry) => (
                  <th key={entry.key} scope="col">
                    {entry.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {series.map((entry) => (
                    <td className="numeric" key={entry.key}>
                      {formatValue(entry.values[index] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
