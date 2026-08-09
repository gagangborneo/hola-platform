/**
 * Palet visualisasi data.
 *
 * Urutan slot kategorikal ini TETAP dan tidak boleh diputar: warna mengikuti
 * entitas, bukan peringkatnya, supaya memfilter satu seri tidak mengecat ulang
 * seri yang tersisa. Empat slot pertama sudah divalidasi terhadap permukaan
 * kartu `#ffffff` — pasangan bersebelahan terburuk ΔE 9,1 (protan) dan 22,9
 * (penglihatan normal), keduanya di atas ambang. Menambah slot ke-5 berarti
 * memvalidasi ulang, bukan menebak.
 *
 * `aqua` dan `yellow` berada di bawah kontras 3:1 terhadap permukaan putih, jadi
 * seri yang memakainya wajib punya label langsung atau tampilan tabel — bukan
 * warna sebagai satu-satunya penanda.
 */
export const SERIES_COLORS = {
  aqua: '#1baf7a',
  blue: '#2a78d6',
  orange: '#eb6834',
  yellow: '#eda100',
} as const

/** Ramp ordinal satu warna untuk tahapan berurutan (funnel, tier). Terang → gelap. */
export const ORDINAL_BLUE = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'] as const

/**
 * Warna status dipesan untuk arti baik/buruk dan tidak pernah dipakai sebagai
 * "seri ke-5". Di permukaan terang `warning` dan `serious` di bawah 3:1 — itu
 * disengaja, dan mitigasinya label teks yang selalu menyertainya.
 */
export const STATUS_COLORS = {
  critical: '#d03b3b',
  good: '#0ca30c',
  serious: '#ec835a',
  warning: '#fab219',
} as const

/** Tinta bagan: garis bantu, sumbu, dan label sengaja mundur di belakang data. */
export const CHART_INK = {
  axis: '#c3c2b7',
  grid: '#e1e0d9',
  muted: '#898781',
  surface: '#ffffff',
} as const
