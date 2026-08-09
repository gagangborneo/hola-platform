import type { ReactNode } from 'react'
import type { NavIconName } from './navigation.ts'

/**
 * Ikon modul sidebar sebagai SVG inline.
 *
 * Digambar sendiri, bukan lewat paket ikon: sidebar cuma butuh 14 bentuk, dan
 * menariknya dari dependensi berarti mengirim seluruh set ikon ke browser demi
 * belasan path. Semuanya stroke 1.6 pada grid 24 supaya seberat teks di sebelahnya.
 */
const PATHS: Record<NavIconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  crm: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  membership: (
    <>
      <path d="M11.6 3.3a.5.5 0 0 1 .88 0l2.9 5.6a1 1 0 0 0 1.5.3l4.3-3.7a.5.5 0 0 1 .8.52l-2.84 10.25a1 1 0 0 1-.96.73H5.8a1 1 0 0 1-.95-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.66a1 1 0 0 0 1.52-.29z" />
      <path d="M5.5 21h13" />
    </>
  ),
  event: (
    <>
      <path d="M2 9.2a3 3 0 0 1 0 5.6V17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2.2a3 3 0 0 1 0-5.6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M13.5 5.5v2" />
      <path d="M13.5 11v2" />
      <path d="M13.5 16.5v2" />
    </>
  ),
  coaching: (
    <>
      <path d="M21.4 10.9a1 1 0 0 0 0-1.84L12.83 5.2a2 2 0 0 0-1.66 0L2.6 9.06a1 1 0 0 0 0 1.84l8.57 3.9a2 2 0 0 0 1.66 0z" />
      <path d="M22 10.4V16" />
      <path d="M6 12.6V16a6 3 0 0 0 12 0v-3.4" />
    </>
  ),
  finance: (
    <>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3h-4a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M17 12h.01" />
    </>
  ),
  accounting: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
      <path d="M8 15h.01M12 15h.01" />
      <path d="M16 15v4" />
      <path d="M8 19h.01M12 19h.01" />
    </>
  ),
  purchasing: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.2l2.6 12.1a1.8 1.8 0 0 0 1.8 1.4h9.1a1.8 1.8 0 0 0 1.76-1.42L21 8H5.4" />
    </>
  ),
  hr: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="9" cy="10.5" r="2.2" />
      <path d="M5.8 16.2a3.6 3.6 0 0 1 6.4 0" />
      <path d="M15.5 9.5H19" />
      <path d="M15.5 13.5H19" />
    </>
  ),
  sales: (
    <>
      <path d="M6.5 2h11l3 4v14a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6z" />
      <path d="M3.5 6h17" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  maintenance: (
    <>
      <path d="M14.6 6.3a1 1 0 0 0 0 1.4l1.7 1.7a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
    </>
  ),
  tenant: (
    <>
      <path d="M3 9.5 5.4 4a2 2 0 0 1 1.8-1.2h9.6A2 2 0 0 1 18.6 4L21 9.5" />
      <path d="M4.5 9.5v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-10" />
      <path d="M9.5 21.5v-4.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v4.5" />
      <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </>
  ),
  report: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-4" />
    </>
  ),
  userManagement: (
    <>
      <path d="M20 12.5c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.66 0C7.5 20 4 17.5 4 12.5V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <circle cx="12" cy="10.5" r="2.4" />
      <path d="M8.2 17.3a4.4 4.4 0 0 1 7.6 0" />
    </>
  ),
  masterData: (
    <>
      <ellipse cx="12" cy="5" rx="8.5" ry="3" />
      <path d="M3.5 5v14c0 1.66 3.8 3 8.5 3s8.5-1.34 8.5-3V5" />
      <path d="M3.5 12c0 1.66 3.8 3 8.5 3s8.5-1.34 8.5-3" />
    </>
  ),
  settings: (
    <>
      <path d="M12.9 2.5h-1.8a1.6 1.6 0 0 0-1.6 1.6v.5a1.6 1.6 0 0 1-.9 1.4l-.5.3a1.6 1.6 0 0 1-1.6 0l-.4-.2a1.6 1.6 0 0 0-2.2.6l-.9 1.5a1.6 1.6 0 0 0 .6 2.2l.4.2a1.6 1.6 0 0 1 .8 1.4v.6a1.6 1.6 0 0 1-.8 1.4l-.4.2a1.6 1.6 0 0 0-.6 2.2l.9 1.5a1.6 1.6 0 0 0 2.2.6l.4-.2a1.6 1.6 0 0 1 1.6 0l.5.3a1.6 1.6 0 0 1 .9 1.4v.5a1.6 1.6 0 0 0 1.6 1.6h1.8a1.6 1.6 0 0 0 1.6-1.6v-.5a1.6 1.6 0 0 1 .9-1.4l.5-.3a1.6 1.6 0 0 1 1.6 0l.4.2a1.6 1.6 0 0 0 2.2-.6l.9-1.5a1.6 1.6 0 0 0-.6-2.2l-.4-.2a1.6 1.6 0 0 1-.8-1.4v-.6a1.6 1.6 0 0 1 .8-1.4l.4-.2a1.6 1.6 0 0 0 .6-2.2l-.9-1.5a1.6 1.6 0 0 0-2.2-.6l-.4.2a1.6 1.6 0 0 1-1.6 0l-.5-.3a1.6 1.6 0 0 1-.9-1.4v-.5a1.6 1.6 0 0 0-1.6-1.6z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

export function NavIcon({ name }: { name: NavIconName }): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      {PATHS[name]}
    </svg>
  )
}

export function MenuIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="menu-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

/** Penanda buka/tutup grup; berputar lewat CSS mengikuti `aria-expanded`. */
export function ChevronIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="nav-chevron"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
