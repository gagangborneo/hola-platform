'use client'

import { Button, Input, NativeSelect } from '@hola/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { isoToWitaLocal, witaLocalToIso } from '../../lib/format.ts'
import { PROMOS_QUERY_KEY, type Promo, type PromoStatusValue } from '../../lib/promos.ts'
import { formErrorMessage } from '../common/form-error.ts'

/** BR-PR-01 — di atas ambang ini, batas nominal diskon menjadi wajib. */
const PERCENT_CAP_THRESHOLD = 25

type VoucherType = 'percent' | 'fixed'

interface Draft {
  code: string
  description: string
  maxDiscountAmount: string
  minTransactionAmount: string
  name: string
  quotaPerUser: string
  quotaTotal: string
  status: PromoStatusValue
  type: VoucherType
  validFrom: string
  validUntil: string
  valueAmount: string
  valuePercent: string
}

function emptyDraft(): Draft {
  return {
    code: '',
    name: '',
    description: '',
    type: 'percent',
    valuePercent: '',
    valueAmount: '',
    maxDiscountAmount: '',
    minTransactionAmount: '0',
    quotaTotal: '',
    quotaPerUser: '',
    validFrom: '',
    validUntil: '',
    status: 'draft',
  }
}

function draftFrom(promo: Promo): Draft {
  return {
    code: promo.code ?? '',
    name: promo.name,
    description: promo.description ?? '',
    type: promo.type === 'fixed' ? 'fixed' : 'percent',
    valuePercent: promo.valuePercent === null ? '' : String(promo.valuePercent),
    valueAmount: promo.valueAmount === null ? '' : String(promo.valueAmount),
    maxDiscountAmount: promo.maxDiscountAmount === null ? '' : String(promo.maxDiscountAmount),
    minTransactionAmount: String(promo.minTransactionAmount),
    quotaTotal: promo.quotaTotal === null ? '' : String(promo.quotaTotal),
    quotaPerUser: promo.quotaPerUser === null ? '' : String(promo.quotaPerUser),
    validFrom: isoToWitaLocal(promo.validFrom),
    validUntil: isoToWitaLocal(promo.validUntil),
    status: promo.status,
  }
}

function positiveIntOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function validate(draft: Draft): string | null {
  if (!/^[A-Z0-9-]{3,20}$/.test(draft.code.trim().toUpperCase())) {
    return 'Kode voucher harus 3–20 karakter berisi huruf besar, angka, atau tanda hubung.'
  }
  if (draft.name.trim().length === 0) return 'Nama voucher wajib diisi.'
  if (!draft.validFrom || !draft.validUntil) return 'Masa berlaku wajib diisi.'
  if (draft.validFrom >= draft.validUntil) return 'Berlaku sampai harus setelah berlaku dari.'

  if (draft.type === 'percent') {
    const percent = Number(draft.valuePercent)
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return 'Persentase diskon harus di atas 0 dan maksimal 100.'
    }
    if (percent > PERCENT_CAP_THRESHOLD && positiveIntOrNull(draft.maxDiscountAmount) === null) {
      // BR-PR-01: tanpa batas nominal, diskon persen besar bisa menghabiskan
      // seluruh nilai transaksi mahal.
      return `Batas nominal diskon wajib diisi untuk diskon di atas ${PERCENT_CAP_THRESHOLD}%.`
    }
  } else {
    const amount = Number(draft.valueAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
      return 'Nominal diskon harus bilangan bulat rupiah di atas nol.'
    }
  }

  const minTransaction = Number(draft.minTransactionAmount)
  if (!Number.isInteger(minTransaction) || minTransaction < 0) {
    return 'Minimal transaksi harus bilangan bulat rupiah, boleh nol.'
  }
  if (draft.quotaTotal.trim().length > 0 && positiveIntOrNull(draft.quotaTotal) === null) {
    return 'Kuota total harus bilangan bulat positif atau dikosongkan.'
  }
  if (draft.quotaPerUser.trim().length > 0 && positiveIntOrNull(draft.quotaPerUser) === null) {
    return 'Kuota per customer harus bilangan bulat positif atau dikosongkan.'
  }
  return null
}

interface VoucherFormProps {
  onDone: () => void
  promo?: Promo
}

export function VoucherForm({ onDone, promo }: VoucherFormProps): ReactNode {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() => (promo ? draftFrom(promo) : emptyDraft()))
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<Draft>): void => setDraft((current) => ({ ...current, ...patch }))

  const save = useMutation({
    mutationFn: async (input: Draft): Promise<void> => {
      const shared = {
        name: input.name.trim(),
        description: input.description.trim().length > 0 ? input.description.trim() : null,
        max_discount_amount: positiveIntOrNull(input.maxDiscountAmount),
        min_transaction_amount: Number(input.minTransactionAmount),
        quota_total: positiveIntOrNull(input.quotaTotal),
        quota_per_user: positiveIntOrNull(input.quotaPerUser),
        valid_from: witaLocalToIso(input.validFrom),
        valid_until: witaLocalToIso(input.validUntil),
        status: input.status,
      }
      const value =
        input.type === 'percent'
          ? { type: 'percent' as const, value_percent: Number(input.valuePercent) }
          : { type: 'fixed' as const, value_amount: Number(input.valueAmount) }

      if (promo) {
        await apiClient.api.v1.promos[':id'].$patch(
          { param: { id: promo.id }, json: { ...shared, ...value } },
          { headers: { 'If-Match': String(promo.version) } },
        )
        return
      }
      await apiClient.api.v1.promos.$post({
        json: {
          ...shared,
          ...value,
          code: input.code.trim().toUpperCase(),
          applies_to: 'booking',
          is_auto: false,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY })
      onDone()
    },
  })

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const message = validate(draft)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    try {
      await save.mutateAsync(draft)
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    }
  }

  const needsCap = draft.type === 'percent' && Number(draft.valuePercent) > PERCENT_CAP_THRESHOLD

  return (
    <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Kode voucher</span>
          <Input
            value={draft.code}
            onChange={(event) => update({ code: event.target.value.toUpperCase() })}
            disabled={promo !== undefined}
            placeholder="HOLA10"
            required
          />
          {promo ? <small>Kode tidak dapat diubah setelah voucher dibuat.</small> : null}
        </label>
        <label className="field">
          <span>Nama</span>
          <Input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Jenis diskon</span>
          <NativeSelect
            value={draft.type}
            onChange={(event) => update({ type: event.target.value as VoucherType })}
          >
            <option value="percent">Persen</option>
            <option value="fixed">Nominal tetap</option>
          </NativeSelect>
        </label>
        {draft.type === 'percent' ? (
          <label className="field">
            <span>Persentase diskon (%)</span>
            <Input
              type="number"
              min="1"
              max="100"
              value={draft.valuePercent}
              onChange={(event) => update({ valuePercent: event.target.value })}
              required
            />
          </label>
        ) : (
          <label className="field">
            <span>Nominal diskon (Rp)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={draft.valueAmount}
              onChange={(event) => update({ valueAmount: event.target.value })}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Batas nominal diskon (Rp)</span>
          <Input
            type="number"
            min="1"
            step="1"
            value={draft.maxDiscountAmount}
            onChange={(event) => update({ maxDiscountAmount: event.target.value })}
            required={needsCap}
          />
          <small>
            {needsCap
              ? `Wajib karena diskon melebihi ${PERCENT_CAP_THRESHOLD}%.`
              : 'Kosongkan bila tidak ada batas.'}
          </small>
        </label>
        <label className="field">
          <span>Minimal transaksi (Rp)</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={draft.minTransactionAmount}
            onChange={(event) => update({ minTransactionAmount: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Kuota total</span>
          <Input
            type="number"
            min="1"
            value={draft.quotaTotal}
            onChange={(event) => update({ quotaTotal: event.target.value })}
            placeholder="Tak terbatas"
          />
        </label>
        <label className="field">
          <span>Kuota per customer</span>
          <Input
            type="number"
            min="1"
            value={draft.quotaPerUser}
            onChange={(event) => update({ quotaPerUser: event.target.value })}
            placeholder="Tak terbatas"
          />
        </label>
        <label className="field">
          <span>Berlaku dari (WITA)</span>
          <Input
            type="datetime-local"
            value={draft.validFrom}
            onChange={(event) => update({ validFrom: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Berlaku sampai (WITA)</span>
          <Input
            type="datetime-local"
            value={draft.validUntil}
            onChange={(event) => update({ validUntil: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Status</span>
          <NativeSelect
            value={draft.status}
            onChange={(event) => update({ status: event.target.value as PromoStatusValue })}
          >
            <option value="draft">Draft — belum dapat dipakai</option>
            <option value="active">Aktif</option>
            <option value="paused">Dijeda</option>
          </NativeSelect>
        </label>
        <label className="field field-wide">
          <span>Deskripsi</span>
          <Input
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : promo ? 'Simpan perubahan' : 'Buat voucher'}
        </Button>
        <Button onClick={onDone} disabled={save.isPending} variant="secondary">
          Batal
        </Button>
      </div>
    </form>
  )
}
