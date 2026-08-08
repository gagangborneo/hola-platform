import { ImageResponse } from 'next/og'

// Satori (mesin render `next/og`) tidak bisa memuat `next/font` — hanya
// berkas font ter-embed. Font sistem sudah cukup untuk gambar statis ini;
// jangan mencoba menarik Fredoka di sini.
export const alt = 'Hola Sports Center — pesan lapangan online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#1565c0',
        color: '#ffffff',
        padding: 80,
      }}
    >
      <div style={{ fontSize: 32, color: '#96f535', letterSpacing: 4 }}>HOLA SPORTS CENTER</div>
      <div style={{ fontSize: 88, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
        Pesan lapangan,
      </div>
      <div style={{ fontSize: 88, fontWeight: 700, color: '#96f535', lineHeight: 1.1 }}>
        langsung main.
      </div>
      <div style={{ fontSize: 30, marginTop: 32, color: 'rgba(255,255,255,0.8)' }}>
        Balikpapan · booking online
      </div>
    </div>,
    size,
  )
}
