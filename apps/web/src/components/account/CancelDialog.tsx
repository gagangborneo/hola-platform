'use client'

import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { formatRupiah } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'

// BR-B-71 mewajibkan teks kebijakan venue selalu terlihat sebelum konfirmasi —
// `cancellation_policy_text` boleh null (K-08 belum dikirim klien), tapi slot
// ketiga ini tidak boleh kosong. Jangan blokir pembatalan (nominal refund di
// atas tetap berlaku dan tetap harus bisa dieksekusi), dan jangan mengarang
// isi kebijakan (tidak ada masa berlaku/persentase/kondisi di sini) — hanya
// nyatakan dengan jujur bahwa teksnya belum tersedia.
const NO_POLICY_TEXT_FALLBACK =
  'Venue belum mempublikasikan teks kebijakan pembatalan secara rinci. ' +
  'Nominal perkiraan pengembalian di atas tetap yang berlaku untuk pembatalan ini.'

const POLICY_LABEL: Record<string, string> = {
  option_a_no_refund: 'Tanpa pengembalian dana',
  option_b_100_percent_minus_gateway_fee: 'Pengembalian penuh dikurangi biaya gateway',
  option_b_50_percent: 'Pengembalian 50%',
  option_b_no_refund_under_24h: 'Kurang dari 24 jam sebelum main — tanpa pengembalian',
  option_c_wallet_credit: 'Dikembalikan sebagai kredit',
  pending_payment_no_refund: 'Belum dibayar — tidak ada dana yang dikembalikan',
}

interface CancelDialogProps {
  bookingId: string
  refundEstimateAmount: number
  policyApplied: string
  cancellationPolicyText: string | null
  onCancelled: () => void
}

export function CancelDialog({
  bookingId,
  refundEstimateAmount,
  policyApplied,
  cancellationPolicyText,
  onCancelled,
}: CancelDialogProps): ReactNode {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$post` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
  // jadi kegagalan sudah ditangani lewat `onError` (react-query menangkap
  // promise yang reject), bukan `if (!response.ok)`.
  const cancel = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].cancel.$post({
        param: { id: bookingId },
        json: { reason },
      })
      return response.json()
    },
    onSuccess: onCancelled,
    // I3: `HolaApiError.message` sudah berbahasa Indonesia dan aman
    // ditampilkan — error lain (mis. jaringan putus, `TypeError: Failed to
    // fetch`) tidak boleh bocor ke UI dalam bahasa Inggris.
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Pembatalan gagal. Coba lagi.')),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Batalkan booking</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan booking ini?</DialogTitle>
          <DialogDescription>
            Baca perkiraan pengembalian dana di bawah sebelum melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary p-4">
          <div className="flex justify-between">
            <span className="text-secondary-foreground">Perkiraan dikembalikan</span>
            <span className="font-display text-xl font-bold text-secondary-foreground">
              {formatRupiah(refundEstimateAmount)}
            </span>
          </div>
          <p className="mt-2 text-sm text-secondary-foreground">
            {POLICY_LABEL[policyApplied] ?? policyApplied}
          </p>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {cancellationPolicyText?.trim() ? cancellationPolicyText : NO_POLICY_TEXT_FALLBACK}
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="cancel-reason">Alasan pembatalan</Label>
          <Input
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Wajib diisi"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}

        <Button
          variant="destructive"
          disabled={reason.trim().length === 0 || cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? 'Membatalkan…' : 'Ya, batalkan booking'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
