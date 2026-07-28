/**
 * UUID v7 — terurut waktu.
 *
 * docs/03-DATA-MODEL.md § 2 mewajibkan `id` dibuat **aplikasi** sebagai UUID v7,
 * bukan `gen_random_uuid()` (v4) di database. Alasannya bukan gaya: v7 berawalan
 * timestamp milidetik, jadi baris yang berdekatan waktunya juga berdekatan di
 * B-tree. Itu yang membuat range scan atas PK (`created_at DESC` de facto) dan
 * pagination cursor tetap murah saat tabel membesar. UUID v4 acak menyebarkan
 * insert ke seluruh index dan membuat halaman index terus terbelah.
 *
 * Ditulis sendiri, bukan menambah dependensi (docs/16 AI-3): implementasinya 12
 * baris dan RFC 9562 § 5.7 mendefinisikannya secara tuntas.
 *
 * Tata letak (RFC 9562):
 *   bit   0..47  unix_ts_ms  (big-endian, 48 bit)
 *   bit  48..51  version     (0b0111)
 *   bit  52..63  rand_a      (12 bit acak)
 *   bit  64..65  variant     (0b10)
 *   bit  66..127 rand_b      (62 bit acak)
 */
import { randomFillSync } from 'node:crypto'

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

/**
 * @param now milidetik epoch. Disuntikkan agar dapat diuji deterministik
 *        (docs/16 BR-TS-10); pemanggil normal membiarkannya kosong.
 */
export function uuidv7(now: number = Date.now()): string {
  const b = new Uint8Array(16)
  randomFillSync(b)

  // 48 bit timestamp, big-endian.
  b[0] = (now / 2 ** 40) & 0xff
  b[1] = (now / 2 ** 32) & 0xff
  b[2] = (now / 2 ** 24) & 0xff
  b[3] = (now / 2 ** 16) & 0xff
  b[4] = (now / 2 ** 8) & 0xff
  b[5] = now & 0xff

  // Versi 7 pada 4 bit teratas oktet 6; varian RFC 4122 pada 2 bit teratas oktet 8.
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80

  const h = (i: number): string => HEX[b[i] ?? 0] ?? '00'
  return (
    `${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-${h(8)}${h(9)}-` +
    `${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`
  )
}

/** Milidetik epoch yang tertanam di sebuah UUID v7. Berguna untuk debugging. */
export function uuidv7Timestamp(uuid: string): number {
  return Number.parseInt(uuid.slice(0, 8) + uuid.slice(9, 13), 16)
}
