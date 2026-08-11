'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hola/ui'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'hola:dev-notice:shown-at'

/** Satu sesi pemberitahuan = 1 jam per perangkat. */
export const NOTICE_INTERVAL_MS = 60 * 60 * 1000

export const NBT_PORTFOLIO_URL = 'https://nbt.web.id'

/**
 * Dipisah dari komponen supaya aturan "sekali per jam" bisa diuji tanpa
 * bergantung pada DOM maupun jam nyata.
 */
export function shouldShowNotice(lastShownAt: string | null, now: number): boolean {
  if (lastShownAt === null) return true

  const parsed = Number.parseInt(lastShownAt, 10)
  if (!Number.isFinite(parsed)) return true

  // Jam perangkat bisa mundur (ganti timezone, sinkronisasi NTP). Nilai yang
  // berada di masa depan dianggap kedaluwarsa, bukan menahan dialog berjam-jam.
  if (parsed > now) return true

  return now - parsed >= NOTICE_INTERVAL_MS
}

/**
 * Pemberitahuan bahwa Hola masih tahap pengembangan. Muncul paling sering
 * sekali per jam per perangkat; penanda waktunya disimpan di localStorage
 * sehingga tidak ikut hilang saat tab ditutup, tetapi tetap per perangkat.
 *
 * Keputusan tampil sengaja dilakukan di `useEffect`, bukan saat render pertama:
 * localStorage tidak ada di server, dan membacanya saat render akan membuat
 * markup server berbeda dari klien (hydration mismatch).
 */
export function DevelopmentNoticeDialog(): ReactNode {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let lastShownAt: string | null = null
    try {
      lastShownAt = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage diblokir (mode privat / kuota penuh). Biarkan dialog tampil —
      // lebih baik mengingatkan dua kali daripada tidak sama sekali.
    }

    const now = Date.now()
    if (!shouldShowNotice(lastShownAt, now)) return

    setOpen(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(now))
    } catch {
      // Tanpa storage jendela 1 jam tidak bisa dicatat; pemberitahuan akan
      // muncul lagi pada kunjungan berikutnya.
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sistem dalam tahap pengembangan</DialogTitle>
          <DialogDescription>
            Sistem Aplikasi Hola ini dikembangkan oleh tim{' '}
            <a
              href={NBT_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-4 hover:no-underline"
            >
              NBT
            </a>
            . Sebagian data yang Anda lihat masih berupa contoh, dan fitur dapat berubah
            sewaktu-waktu. Terima kasih sudah ikut mencoba.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Mengerti</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
