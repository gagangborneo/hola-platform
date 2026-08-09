import type { ReactNode } from 'react'
import { readableInkOn } from './ink.ts'
import { ORDINAL_BLUE } from './palette.ts'

export interface FunnelStage {
  readonly key: string
  readonly label: string
  readonly value: number
}

interface FunnelChartProps {
  readonly formatValue: (value: number) => string
  readonly stages: readonly FunnelStage[]
}

/**
 * Corong konversi.
 *
 * Tahapan punya urutan alami, jadi warnanya ramp ordinal satu hue (gelap di
 * tahap teratas, memudar ke bawah) — bukan warna kategorikal, yang akan
 * menyiratkan tahapan ini identitas yang saling lepas. Lebar batang mengikuti
 * nilainya terhadap tahap pertama, jadi penyempitannya adalah datanya sendiri.
 */
export function FunnelChart({ formatValue, stages }: FunnelChartProps): ReactNode {
  const top = stages[0]?.value ?? 0

  return (
    <div className="funnel">
      {stages.map((stage, index) => {
        const share = top === 0 ? 0 : stage.value / top
        // Ramp dibalik: tahap teratas bernilai terbesar, jadi ia yang paling gelap.
        const step = ORDINAL_BLUE.length - 1 - Math.min(index, ORDINAL_BLUE.length - 1)
        const fill = ORDINAL_BLUE[step] ?? ORDINAL_BLUE[0]

        /*
          Batang sempit tidak dipaksa melebar supaya teksnya muat — itu akan
          membuat tahap 14% terlihat sebesar tahap 26%, dan penyempitan corong
          justru datanya. Yang berpindah adalah labelnya: keluar ke samping
          batang, bukan dijejalkan ke dalam lalu terpotong.
        */
        const isLabelInside = share >= 0.34
        const caption = `${stage.label} · ${(share * 100).toFixed(1).replace('.', ',')}%`

        return (
          <div className="funnel-row" key={stage.key}>
            <div
              className={isLabelInside ? 'funnel-bar' : 'funnel-bar funnel-bar-narrow'}
              style={{
                background: fill,
                color: isLabelInside ? readableInkOn(fill) : undefined,
                width: `${Math.max(share * 100, 4)}%`,
              }}
            >
              {isLabelInside ? (
                <>
                  <strong>{formatValue(stage.value)}</strong>
                  <span>{caption}</span>
                </>
              ) : null}
            </div>
            {isLabelInside ? null : (
              <p className="funnel-aside">
                <strong>{formatValue(stage.value)}</strong>
                <span>{caption}</span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export interface ConversionStep {
  readonly key: string
  readonly label: string
  readonly rate: number
}

/** Laju antar-tahap dibaca sebagai daftar angka, bukan bagan — nilainya sedikit. */
export function ConversionRates({ steps }: { steps: readonly ConversionStep[] }): ReactNode {
  return (
    <dl className="conversion-list">
      {steps.map((step) => (
        <div key={step.key}>
          <dt>{step.label}</dt>
          <dd>{step.rate.toFixed(1).replace('.', ',')}%</dd>
        </div>
      ))}
    </dl>
  )
}
