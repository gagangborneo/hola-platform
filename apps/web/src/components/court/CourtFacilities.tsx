import type { ReactNode } from 'react'
import type { CourtFacility } from '../../lib/court-facilities.ts'

interface FacilityGridProps {
  facilities: CourtFacility[]
}

/**
 * Kartu spesifikasi lapangan — isinya data court sungguhan, jadi gayanya lebih
 * tegas (aksen brand) daripada daftar fasilitas venue di bawahnya.
 */
export function CourtSpecGrid({ facilities }: FacilityGridProps): ReactNode {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {facilities.map((facility) => (
        <li
          key={facility.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-secondary to-accent/30">
            <facility.icon size={20} className="text-primary" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground">{facility.label}</span>
            {/* Tanpa `truncate`: kartu ini sempit di kolom kanan halaman detail, dan
                keterangan yang terpotong jadi "Batas pemesanan per …" tidak memberi
                tahu apa pun. Lebih baik membungkus ke baris kedua. */}
            {facility.detail ? (
              <span className="block text-xs leading-snug text-muted-foreground">
                {facility.detail}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Fasilitas venue: kartu kecil bergrid, ikon di atas label. */
export function VenueFacilityGrid({ facilities }: FacilityGridProps): ReactNode {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {facilities.map((facility) => (
        <li
          key={facility.id}
          className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
        >
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-[#0a1f5c] shadow-md shadow-primary/25">
            <facility.icon size={20} className="text-white" aria-hidden />
          </span>
          <span className="block font-semibold text-foreground">{facility.label}</span>
          {facility.detail ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {facility.detail}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
