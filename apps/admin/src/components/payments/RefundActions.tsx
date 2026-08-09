'use client'

import { MEDIA_KIND } from '@hola/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChangeEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { uploadMedia } from '../../lib/media-upload.ts'
import type { Refund } from '../../lib/payments.ts'
import { formErrorMessage } from '../common/form-error.ts'

interface RefundActionsProps {
  isAdmin: boolean
  refund: Refund
}

type OpenPanel = 'approve' | 'reject' | null

/**
 * Persetujuan, penolakan, dan penyelesaian refund.
 *
 * `approve` dan `reject` khusus admin — API menegakkannya, dan tombolnya juga
 * disembunyikan supaya staff tidak menekan tombol yang pasti gagal. Bukti
 * transfer diunggah lewat presigned URL yang sama dengan foto lapangan, tapi ke
 * bucket privat.
 */
export function RefundActions({ isAdmin, refund }: RefundActionsProps): ReactNode {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<OpenPanel>(null)
  const [bankName, setBankName] = useState(refund.destinationBankName ?? '')
  const [accountNumber, setAccountNumber] = useState(refund.destinationAccountNumber ?? '')
  const [accountName, setAccountName] = useState(refund.destinationAccountName ?? '')
  const [rejectReason, setRejectReason] = useState('')
  const [proofMediaId, setProofMediaId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] })
  }

  const approve = useMutation({
    mutationFn: async (): Promise<void> => {
      const hasDestination =
        bankName.trim().length > 0 &&
        accountNumber.trim().length > 0 &&
        accountName.trim().length > 0
      await apiClient.api.v1.refunds[':id'].approve.$post({
        param: { id: refund.id },
        json: hasDestination
          ? {
              destination_bank_name: bankName.trim(),
              destination_account_number: accountNumber.trim(),
              destination_account_name: accountName.trim(),
            }
          : {},
      })
    },
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: async (reason: string): Promise<void> => {
      await apiClient.api.v1.refunds[':id'].reject.$post({
        param: { id: refund.id },
        json: { reason },
      })
    },
    onSuccess: invalidate,
  })

  const complete = useMutation({
    mutationFn: async (mediaId: string | null): Promise<void> => {
      await apiClient.api.v1.refunds[':id']['mark-completed'].$post({
        param: { id: refund.id },
        json: mediaId ? { proof_media_id: mediaId } : {},
      })
    },
    onSuccess: invalidate,
  })

  const onUploadProof = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      // Bukti transfer disimpan apa adanya (termasuk PDF), tidak dikompresi
      // seperti foto lapangan — mengubah pikselnya melemahkan nilainya sebagai
      // bukti.
      const media = await uploadMedia(MEDIA_KIND.PAYMENT_PROOF, file)
      setProofMediaId(media.id)
      setNotice('Bukti transfer terunggah. Tandai selesai untuk menyimpannya.')
    } catch (uploadError) {
      setError(formErrorMessage(uploadError))
    } finally {
      setIsUploading(false)
    }
  }

  const run = async (action: () => Promise<void>, message: string): Promise<void> => {
    setError(null)
    setNotice(null)
    try {
      await action()
      setPanel(null)
      setNotice(message)
    } catch (actionError) {
      setError(formErrorMessage(actionError))
    }
  }

  const onReject = async (): Promise<void> => {
    if (rejectReason.trim().length === 0) {
      setError('Alasan penolakan wajib diisi.')
      return
    }
    await run(() => reject.mutateAsync(rejectReason.trim()), 'Pengajuan refund ditolak.')
  }

  const isPending = approve.isPending || reject.isPending || complete.isPending
  const canDecide = isAdmin && refund.status === 'requested'
  const canComplete = refund.status === 'approved' || refund.status === 'processing'

  return (
    <div className="stack-tight">
      <div className="row">
        {canDecide ? (
          <>
            <button
              className="button-small"
              type="button"
              onClick={() => setPanel(panel === 'approve' ? null : 'approve')}
              disabled={isPending}
            >
              Setujui
            </button>
            <button
              className="button-danger button-small"
              type="button"
              onClick={() => setPanel(panel === 'reject' ? null : 'reject')}
              disabled={isPending}
            >
              Tolak
            </button>
          </>
        ) : null}
        {canComplete ? (
          <button
            className="button-secondary button-small"
            type="button"
            onClick={() =>
              void run(
                () => complete.mutateAsync(proofMediaId),
                'Refund ditandai selesai dibayarkan.',
              )
            }
            disabled={isPending || isUploading}
          >
            Tandai selesai
          </button>
        ) : null}
        {!canDecide && !canComplete ? <span className="muted">Tidak ada tindakan.</span> : null}
      </div>

      {panel === 'approve' ? (
        <div className="stack-tight">
          <p className="muted">
            Rekening tujuan opsional; kosongkan bila sudah benar atau refund dibayar tunai. Kalau
            diisi, ketiga kolom wajib lengkap.
          </p>
          <div className="form-grid">
            <label className="field">
              <span>Bank tujuan</span>
              <input value={bankName} onChange={(event) => setBankName(event.target.value)} />
            </label>
            <label className="field">
              <span>Nomor rekening</span>
              <input
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Nama pemilik rekening</span>
              <input value={accountName} onChange={(event) => setAccountName(event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="button-small"
              type="button"
              onClick={() => void run(() => approve.mutateAsync(), 'Refund disetujui.')}
              disabled={isPending}
            >
              Konfirmasi persetujuan
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'reject' ? (
        <div className="stack-tight">
          <label className="field">
            <span>Alasan penolakan</span>
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              required
            />
          </label>
          <div className="form-actions">
            <button
              className="button-danger button-small"
              type="button"
              onClick={() => void onReject()}
              disabled={isPending}
            >
              Konfirmasi penolakan
            </button>
          </div>
        </div>
      ) : null}

      {canComplete ? (
        <label className="field">
          <span>Bukti transfer</span>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => void onUploadProof(event)}
            disabled={isUploading}
          />
          <small>
            {isUploading
              ? 'Mengunggah…'
              : proofMediaId
                ? 'Bukti siap dilampirkan saat ditandai selesai.'
                : 'JPEG, PNG, atau PDF. Opsional.'}
          </small>
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="notice notice-success">{notice}</p> : null}
    </div>
  )
}
