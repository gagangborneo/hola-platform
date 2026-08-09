/**
 * Kunci idempotensi untuk aksi yang memindahkan uang atau slot.
 *
 * Kunci dibuat SEKALI per niat operator dan dipakai ulang pada setiap percobaan
 * kirim. Membuat kunci baru di dalam `mutationFn` akan menghapus perlindungannya
 * — percobaan kedua setelah timeout jaringan akan tampak sebagai transaksi baru
 * bagi API dan menghasilkan booking atau pembayaran ganda.
 */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID()
}
