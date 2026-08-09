'use client'

import { Button, Input } from '@hola/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { isRecord, parseData } from '../../lib/api-response.ts'
import type { BookingDetail } from '../../lib/bookings.ts'
import { formatRupiah } from '../../lib/format.ts'
import { formErrorMessage } from '../common/form-error.ts'

interface BookingActionsProps {
  booking: BookingDetail
}

function isCancelResult(value: unknown): value is { refund_estimate_amount: number } {
  return isRecord(value) && typeof value.refund_estimate_amount === 'number'
}

/**
 * Check-in, no-show, dan pembatalan.
 *
 * Pembatalan menuntut alasan tertulis: alasan itu masuk ke audit log, ke email
 * customer, dan menjadi dasar refund — jadi tidak boleh ada tombol batal yang
 * bisa ditekan tanpa mengetiknya.
 */
export function BookingActions({ booking }: BookingActionsProps): ReactNode {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['booking-detail', booking.id] })
    await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
    await queryClient.invalidateQueries({ queryKey: ['booking-payments', booking.id] })
  }

  const checkIn = useMutation({
    mutationFn: async (force: boolean): Promise<void> => {
      await apiClient.api.v1.bookings[':id']['check-in'].$post({
        param: { id: booking.id },
        json: { force },
      })
    },
    onSuccess: invalidate,
  })

  const noShow = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.api.v1.bookings[':id']['no-show'].$post({ param: { id: booking.id } })
    },
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: async (cancelReason: string): Promise<number> => {
      const response = await apiClient.api.v1.bookings[':id'].cancel.$post({
        param: { id: booking.id },
        json: { reason: cancelReason },
      })
      const result = parseData(await response.json(), isCancelResult)
      return result.refund_estimate_amount
    },
    onSuccess: invalidate,
  })

  const run = async (action: () => Promise<void>, message: string): Promise<void> => {
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
    } catch (actionError) {
      setError(formErrorMessage(actionError))
    }
  }

  const onCancel = async (): Promise<void> => {
    if (reason.trim().length === 0) {
      setError('Alasan pembatalan wajib diisi.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      const refund = await cancel.mutateAsync(reason.trim())
      setIsCancelOpen(false)
      setReason('')
      setNotice(
        refund > 0
          ? `Booking dibatalkan. Perkiraan refund ${formatRupiah(refund)} diajukan untuk ditinjau.`
          : 'Booking dibatalkan tanpa refund sesuai kebijakan pembatalan.',
      )
    } catch (cancelError) {
      setError(formErrorMessage(cancelError))
    }
  }

  const isPending = checkIn.isPending || noShow.isPending || cancel.isPending
  const isClosed =
    booking.status === 'cancelled' || booking.status === 'expired' || booking.status === 'completed'

  /**
   * API melaporkan booking ini `is_cancellable`, tetapi `POST /cancel` menolak
   * booking terkonfirmasi tanpa pembayaran lunas dengan galat internal.
   * `pending_payment_no_refund` pada booking yang sudah `confirmed` adalah
   * penanda tepat kondisi itu — kebijakan tersebut hanya muncul ketika
   * pratinjau pembatalan tidak menemukan pembayaran sama sekali.
   */
  const isConfirmedWithoutPayment =
    booking.status === 'confirmed' && booking.policyApplied === 'pending_payment_no_refund'

  return (
    <div className="stack">
      <div className="row">
        <Button
          onClick={() => void run(() => checkIn.mutateAsync(false), 'Customer tercatat check-in.')}
          disabled={isPending || isClosed || booking.checkedInAt !== null}
        >
          Check-in
        </Button>
        <Button
          onClick={() =>
            void run(
              () => checkIn.mutateAsync(true),
              'Check-in dipaksa di luar jendela waktu normal.',
            )
          }
          disabled={isPending || isClosed || booking.checkedInAt !== null}
          title="Untuk customer yang datang di luar jendela check-in normal."
          variant="outline"
        >
          Check-in paksa
        </Button>
        <Button
          onClick={() => void run(() => noShow.mutateAsync(), 'Booking ditandai tidak hadir.')}
          disabled={isPending || isClosed || booking.status !== 'confirmed'}
          variant="secondary"
        >
          Tandai tidak hadir
        </Button>
        <Button
          onClick={() => {
            setIsCancelOpen((current) => !current)
            setError(null)
            setNotice(null)
          }}
          disabled={isPending || !booking.isCancellable || isConfirmedWithoutPayment}
          variant="destructive"
        >
          {isCancelOpen ? 'Tutup pembatalan' : 'Batalkan booking'}
        </Button>
      </div>

      {!booking.isCancellable && !isClosed ? (
        <p className="muted">Booking ini sudah tidak dapat dibatalkan menurut kebijakan aktif.</p>
      ) : null}

      {isConfirmedWithoutPayment ? (
        <p className="notice notice-warning">
          Booking ini terkonfirmasi tanpa catatan pembayaran, biasanya karena dibuat lewat kanal
          walk-in. API belum dapat membatalkan booking seperti ini dan akan menjawab dengan galat
          sistem, jadi tombol batal dimatikan. Bebaskan slotnya lewat blokir lapangan bila memang
          harus dikosongkan.
        </p>
      ) : null}

      {isCancelOpen ? (
        <div className="stack">
          {booking.refundEstimateAmount > 0 ? (
            <p className="notice notice-warning">
              Perkiraan refund {formatRupiah(booking.refundEstimateAmount)}
              {booking.policyApplied ? ` (kebijakan ${booking.policyApplied})` : ''}. Refund tetap
              perlu disetujui di halaman pembayaran.
            </p>
          ) : (
            <p className="notice notice-info">
              Pembatalan ini tidak menghasilkan refund menurut kebijakan aktif.
            </p>
          )}
          <label className="field">
            <span>Alasan pembatalan</span>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Diminta customer, lapangan tergenang, …"
              required
            />
            <small>Masuk ke audit log dan email pemberitahuan customer.</small>
          </label>
          <div className="form-actions">
            <Button onClick={() => void onCancel()} disabled={isPending} variant="destructive">
              {cancel.isPending ? 'Membatalkan…' : 'Konfirmasi pembatalan'}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="notice notice-success">{notice}</p> : null}
    </div>
  )
}
