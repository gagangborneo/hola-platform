'use client'

import { QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { ReactNode } from 'react'

interface BookingQrProps {
  bookingCode: string
  /** QR hanya berlaku saat booking benar-benar bisa dipakai main. */
  isActive: boolean
  inactiveReason: string
}

/**
 * QR memuat kode booking apa adanya — nilai yang sama yang dicari petugas di
 * back-office saat check-in, jadi tetap berguna walau dibaca manusia dari layar
 * atau kertas. Sengaja tidak memuat token atau tautan: kode booking bukan
 * rahasia, dan QR ini ikut tercetak di invoice.
 *
 * `fgColor` dikunci ke warna teks merek (bukan `currentColor`) supaya kontras
 * pemindaian tidak ikut berubah oleh tema induk.
 */
export function BookingQr({ bookingCode, isActive, inactiveReason }: BookingQrProps): ReactNode {
  if (!isActive) {
    return (
      <div className="flex size-40 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-4 text-center">
        <QrCode className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-xs leading-snug text-muted-foreground">{inactiveReason}</p>
      </div>
    )
  }

  return (
    <div className="shrink-0 rounded-xl border bg-white p-3">
      <QRCodeSVG
        value={bookingCode}
        size={136}
        level="M"
        marginSize={0}
        bgColor="#ffffff"
        fgColor="#0a1f5c"
        title={`Kode booking ${bookingCode}`}
      />
    </div>
  )
}
