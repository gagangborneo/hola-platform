'use client'

import { cn } from '@hola/ui'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface CourtGalleryProps {
  courtName: string
  /** Sudah berupa URL siap pakai; pemanggil yang memutuskan foto asli atau foto demo. */
  photos: string[]
  /** Ditempel di sudut foto utama, mis. "Indoor". */
  badge: ReactNode
  /**
   * `photos` berisi foto stok, bukan foto lapangan ini. Wajib diteruskan apa
   * adanya: foto stok yang dipakai semuanya lapangan outdoor, jadi tanpa
   * keterangan ini badge "Indoor" akan berdiri di atas foto yang jelas-jelas
   * beratapkan langit dan tampak seperti klaim tentang venue sungguhan.
   */
  isPlaceholder: boolean
}

/**
 * Foto utama + strip thumbnail. Thumbnail baru muncul saat ada lebih dari satu
 * foto: satu thumbnail tunggal di bawah foto besar hanya menambah kebisingan.
 */
export function CourtGallery({
  courtName,
  photos,
  badge,
  isPlaceholder,
}: CourtGalleryProps): ReactNode {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = photos[activeIndex] ?? photos[0]

  return (
    <div>
      <div className="relative aspect-16/10 overflow-hidden rounded-2xl bg-muted shadow-lg shadow-primary/10">
        {active ? (
          <Image
            src={active}
            alt={`Lapangan ${courtName}`}
            fill
            sizes="(min-width: 768px) 60vw, 100vw"
            className="object-cover"
            priority
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/45 to-transparent"
        />
        <div className="absolute left-4 top-4">{badge}</div>
      </div>

      {photos.length > 1 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: `photos` tidak pernah disusun ulang selama komponen hidup, dan URL-nya boleh berulang (foto demo berputar) sehingga tidak bisa jadi key
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Lihat foto ${index + 1} dari ${photos.length}`}
              aria-pressed={index === activeIndex}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                index === activeIndex
                  ? 'border-primary ring-2 ring-primary/25'
                  : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Image src={photo} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {isPlaceholder ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Foto ilustrasi — foto lapangan ini belum diunggah.
        </p>
      ) : null}
    </div>
  )
}
