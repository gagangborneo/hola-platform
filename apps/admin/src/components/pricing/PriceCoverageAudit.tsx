'use client'

import { buildSlotGrid } from '@hola/shared'
import { Button, Input, NativeSelect } from '@hola/ui'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Court, CourtDetail } from '../../lib/courts.ts'
import { dayOfWeekFor, formatRupiah, formatTimeWita, todayWita } from '../../lib/format.ts'
import * as labels from '../../lib/labels.ts'
import { priceSlots, type SlotPrice } from '../../lib/quote.ts'
import { formErrorMessage } from '../common/form-error.ts'
import { StatusChip } from '../common/StatusChip.tsx'

interface PriceCoverageAuditProps {
  courts: readonly Court[]
  loadCourtDetail: (courtId: string) => Promise<CourtDetail>
}

/**
 * Pratinjau harga sekaligus audit cakupan aturan.
 *
 * Menjalankan pipeline harga yang sama dengan checkout untuk SETIAP slot satu
 * hari penuh, lalu menandai slot yang tidak punya aturan cocok. Inilah cara
 * `PRICE_RULE_NOT_FOUND` (E-11) ditemukan sebelum customer yang menemukannya.
 */
export function PriceCoverageAudit({
  courts,
  loadCourtDetail,
}: PriceCoverageAuditProps): ReactNode {
  const [courtId, setCourtId] = useState('')
  const [dateKey, setDateKey] = useState(() => todayWita(new Date()))
  const [results, setResults] = useState<SlotPrice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const run = async (): Promise<void> => {
    if (!courtId) {
      setError('Pilih lapangan yang ingin diperiksa.')
      return
    }
    setError(null)
    setResults(null)
    setIsRunning(true)
    try {
      const detail = await loadCourtDetail(courtId)
      const hours = detail.operatingHours.find((hour) => hour.dayOfWeek === dayOfWeekFor(dateKey))
      if (!hours) {
        setError('Lapangan ini tidak punya jam operasional untuk hari tersebut.')
        return
      }
      const slots = buildSlotGrid(dateKey, {
        slotDurationMinutes: detail.slotDurationMinutes,
        opensTime: hours.opensTime.slice(0, 5),
        closesTime: hours.closesTime.slice(0, 5),
      })
      setResults(
        await priceSlots(
          slots.map((slot) => ({ court_id: courtId, starts_at: slot.startsAt.toISOString() })),
        ),
      )
    } catch (auditError) {
      setError(formErrorMessage(auditError))
    } finally {
      setIsRunning(false)
    }
  }

  const uncovered = results?.filter((slot) => slot.unitPriceAmount === null) ?? []

  return (
    <div className="stack">
      <p className="muted">
        Pemeriksaan ini memanggil kalkulator harga yang sama dengan halaman checkout, satu kali per
        slot sepanjang jam operasional. Slot tanpa aturan yang cocok akan menolak booking customer
        dengan galat harga — perbaiki sebelum lapangan dijual.
      </p>

      <div className="form-grid">
        <label className="field">
          <span>Lapangan</span>
          <NativeSelect value={courtId} onChange={(event) => setCourtId(event.target.value)}>
            <option value="">Pilih lapangan</option>
            {courts.map((court) => (
              <option value={court.id} key={court.id}>
                {court.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="field">
          <span>Tanggal</span>
          <Input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
        </label>
      </div>

      <div className="form-actions">
        <Button onClick={() => void run()} disabled={isRunning}>
          {isRunning ? 'Memeriksa…' : 'Periksa harga sehari penuh'}
        </Button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {results ? (
        <>
          {uncovered.length > 0 ? (
            <div className="notice notice-danger" role="alert">
              <strong>
                {uncovered.length} dari {results.length} slot belum punya harga.
              </strong>
              <ul>
                {uncovered.map((slot) => (
                  <li key={slot.startsAt}>
                    {formatTimeWita(slot.startsAt)} — {slot.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="notice notice-success">
              Seluruh {results.length} slot pada tanggal ini punya aturan harga yang cocok.
            </p>
          )}

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Jam</th>
                  <th scope="col">Kelas tarif</th>
                  <th scope="col">Harga slot</th>
                  <th scope="col">Aturan</th>
                </tr>
              </thead>
              <tbody>
                {results.map((slot) => (
                  <tr key={slot.startsAt}>
                    <td>{formatTimeWita(slot.startsAt)}</td>
                    <td>
                      {slot.rateClass ? (
                        <StatusChip {...labels.rateClass(slot.rateClass)} />
                      ) : (
                        <StatusChip label="Tidak ada" tone="danger" />
                      )}
                    </td>
                    <td className="numeric">
                      {slot.unitPriceAmount === null
                        ? (slot.error ?? '—')
                        : formatRupiah(slot.unitPriceAmount)}
                    </td>
                    <td>{slot.priceRuleId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
