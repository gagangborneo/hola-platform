import { formatRupiah } from '../../lib/format.ts'

/**
 * Bentuk promo yang dipakai kartu voucher. Sengaja struktural, bukan tipe
 * respons klien: yang dibutuhkan hanya field untuk merangkai kalimat nilainya.
 */
export interface PromoValue {
  type: string
  value_percent: number | null
  value_amount: number | null
  free_slot_count: number | null
  max_discount_amount: number | null
}

/**
 * Nilai promo dalam satu kalimat. Angka datang jadi dari API dan hanya
 * diformat di sini — tidak ada persentase yang dihitung ulang di klien
 * (BR-B-12).
 *
 * `null` berarti kombinasi `type` dan nilainya tidak masuk akal (mis. promo
 * persen tanpa `value_percent`). Pemanggil menyembunyikan barisnya, karena
 * menampilkan "—" pada kartu promo membuat customer mengira diskonnya nol.
 */
export function promoValueLabel(promo: PromoValue): string | null {
  if (promo.type === 'percent' && promo.value_percent !== null) {
    const cap =
      promo.max_discount_amount === null ? '' : ` (maks ${formatRupiah(promo.max_discount_amount)})`
    return `Diskon ${promo.value_percent}%${cap}`
  }
  if (promo.type === 'fixed' && promo.value_amount !== null) {
    return `Potongan ${formatRupiah(promo.value_amount)}`
  }
  if (promo.type === 'free_slot' && promo.free_slot_count !== null) {
    return `${promo.free_slot_count} slot gratis`
  }
  return null
}

const APPLIES_TO_LABEL: Record<string, string> = {
  booking: 'Booking lapangan',
  event: 'Pendaftaran event',
  tournament: 'Pendaftaran turnamen',
  all: 'Semua transaksi',
}

export function promoAppliesToLabel(appliesTo: string): string {
  return APPLIES_TO_LABEL[appliesTo] ?? 'Transaksi tertentu'
}

/**
 * Sisa kuota promo. `quota_total: null` berarti tak terbatas — pembagian atau
 * pengurangan apa pun terhadapnya menghasilkan angka palsu, jadi kasus itu
 * dijawab lebih dulu.
 */
export function promoQuotaLabel(quotaTotal: number | null, quotaUsed: number): string | null {
  if (quotaTotal === null) return null
  const remaining = quotaTotal - quotaUsed
  if (remaining <= 0) return 'Kuota habis'
  return `Sisa ${remaining} kuota`
}
