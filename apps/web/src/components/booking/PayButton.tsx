'use client'

import { Button } from '@hola/ui'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { env } from '../../lib/env.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { MIDTRANS_ORIGIN } from '../../lib/security-headers.ts'

interface SnapCallbacks {
  onSuccess: () => void
  onPending: () => void
  onError: () => void
  onClose: () => void
}

interface SnapGlobal {
  pay: (token: string, callbacks: SnapCallbacks) => void
}

interface PayButtonProps {
  bookingId: string
  midtransClientKey: string
}

/**
 * Origin dipilih dari variabel build yang sama dengan pembentuk CSP
 * (`createSecurityHeaders`, § 3.5 spek): kalau variabel ini berubah, script
 * yang dimuat di sini dan origin yang diizinkan `frame-src`/`script-src`
 * selalu bergerak bersama, tidak pernah bisa berbeda.
 */
const isProduction = env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
const snapOrigin = isProduction ? MIDTRANS_ORIGIN.production : MIDTRANS_ORIGIN.sandbox
const snapScriptUrl = `${snapOrigin}/snap/snap.js`

export function PayButton({ bookingId, midtransClientKey }: PayButtonProps): ReactNode {
  const router = useRouter()
  const [scriptFailed, setScriptFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPayment = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.payments.$post(
        { json: { booking_id: bookingId } },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      )
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun — `$post` di atas TIDAK PERNAH resolve dengan Response ber-
      // `.ok === false`, jadi kegagalan sudah ditangani lewat `onError` di
      // bawah (react-query menangkap promise yang reject).
      return response.json()
    },
    onSuccess: (body) => {
      const payment = body.data
      const statusPath = `/booking/${bookingId}/status?payment=${payment.id}`
      const snap = (globalThis as { snap?: SnapGlobal }).snap

      // Cadangan: kalau snap.js gagal dimuat (atau global `snap` belum ada,
      // atau server tidak mengembalikan token), alihkan ke halaman Snap penuh
      // — navigasi penuh-halaman tidak membutuhkan `frame-src` sama sekali.
      if (scriptFailed || !snap || !payment.snap_token) {
        if (payment.snap_redirect_url) {
          globalThis.location.href = payment.snap_redirect_url
          return
        }
        setError('Halaman pembayaran tidak dapat dibuka. Coba lagi.')
        return
      }

      snap.pay(payment.snap_token, {
        onSuccess: () => router.push(statusPath),
        onPending: () => router.push(statusPath),
        onError: () => router.push(statusPath),
        onClose: () => router.push(statusPath),
      })
    },
    // I3: `HolaApiError.message` sudah berbahasa Indonesia dan aman
    // ditampilkan — error lain (mis. jaringan putus, `TypeError: Failed to
    // fetch`) tidak boleh bocor ke UI dalam bahasa Inggris.
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Pembayaran gagal disiapkan. Coba lagi.')),
  })

  return (
    <>
      <Script
        src={snapScriptUrl}
        data-client-key={midtransClientKey}
        strategy="lazyOnload"
        onError={() => setScriptFailed(true)}
      />
      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
      ) : null}
      <Button
        className="mt-6 w-full"
        size="lg"
        variant="accent"
        disabled={createPayment.isPending}
        onClick={() => createPayment.mutate()}
      >
        {createPayment.isPending ? 'Menyiapkan pembayaran…' : 'Bayar sekarang'}
      </Button>
    </>
  )
}
