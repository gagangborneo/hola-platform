/**
 * Pembulatan uang ke kelipatan Rp 100.
 *
 * Sumber kebenaran: docs/07-MODULE-PAYMENT.md § 3.3 P10.
 *
 *   | Satuan  | kelipatan Rp 100                              |
 *   | Metode  | half up — `roundTo100(x) = Math.round(x / 100) * 100` |
 *   | Kapan   | HANYA di P3 (harga per slot) dan P10 (total). Tidak di
 *   |         | langkah antara, agar galat pembulatan tidak menumpuk. |
 *
 * Rumusnya ditulis persis seperti dokumen. Jangan "memperbaiki"-nya menjadi
 * pembulatan menjauhi nol: nilai negatif memang muncul (`raw_total` sebelum
 * di-floor, dan `rounding_adjustment_amount`), dan mengubah perilakunya berarti
 * mengubah angka yang ditagihkan.
 *
 * Catatan `Math.round` untuk nilai negatif: ia membulatkan ke arah +∞ pada
 * tepat .5 — `Math.round(-2.5) === -2`. Jadi `roundTo100(-250) === -200`, bukan
 * −300. Perilaku ini dikunci oleh test.
 */
export function roundTo100(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`roundTo100 menerima nilai bukan angka berhingga: ${amount}`)
  }
  const rounded = Math.round(amount / 100) * 100
  // Normalisasi -0 → 0. Secara numerik keduanya sama (`-0 === 0`), tetapi -0
  // bocor ke `Object.is` dan ke pembanding test sebagai nilai berbeda. Nilai
  // uang tidak pernah perlu membedakan nol negatif.
  return rounded === 0 ? 0 : rounded
}
