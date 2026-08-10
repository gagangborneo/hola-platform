/**
 * FOTO DEMO — bukan foto lapangan sungguhan.
 *
 * Foto lapangan yang benar datang dari `court.photos[]` (media yang diunggah
 * admin). Selama venue belum mengunggahnya, kartu dan halaman detail lapangan
 * tampil sebagai kotak abu-abu kosong sehingga tata letaknya tidak bisa dinilai
 * secara visual. Modul ini mengisi kekosongan itu dengan foto stok yang sudah
 * ada di `public/images` supaya tampilan bisa dipresentasikan.
 *
 * Begitu admin mengunggah foto asli, foto asli itu yang dipakai — pemanggil
 * hanya jatuh ke sini saat `photos[]` kosong. Jangan pakai modul ini untuk
 * apa pun selain penempatan gambar.
 */

const DEMO_PHOTOS = [
  '/images/hero-court-wide.jpg',
  '/images/hero-court-surface.jpg',
  '/images/hero-court-tall.jpg',
  '/images/hero-court-outdoor.jpg',
  '/images/app-court-card.jpg',
] as const

/**
 * Hash stabil dari kode lapangan. Tujuannya cuma satu: `PDL-01` selalu
 * mendapat foto yang sama di daftar maupun di halaman detail, dan dua lapangan
 * bersebelahan tidak mendapat foto kembar. Bukan hash kriptografis.
 */
function codeHash(code: string): number {
  let hash = 0
  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) % 100_000
  }
  return hash
}

/**
 * `count` foto demo untuk satu lapangan, selalu berurutan dari titik awal yang
 * sama untuk kode yang sama. `count` boleh melebihi jumlah stok — daftarnya
 * berputar, dan itu disengaja: lebih baik satu foto terulang di galeri daripada
 * galeri berlubang saat presentasi.
 */
export function demoCourtPhotos(code: string, count = 1): string[] {
  const offset = codeHash(code) % DEMO_PHOTOS.length
  return Array.from(
    { length: count },
    (_, index) => DEMO_PHOTOS[(offset + index) % DEMO_PHOTOS.length] as string,
  )
}
