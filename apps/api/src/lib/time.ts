/**
 * Waktu di sisi server.
 *
 * Primitif WITA-nya hidup di `@hola/shared` (dipakai bersama frontend); file ini
 * hanya menambahkan yang khusus server.
 *
 * Aturan yang tidak boleh dilanggar: fungsi bisnis menerima `now` sebagai
 * parameter, tidak memanggil `new Date()` sendiri (BR-TS-10, BR-SV-15). Satu-
 * satunya tempat yang boleh membaca jam adalah `serverNow()` di bawah, dipanggil
 * di batas request/job lalu diteruskan lewat `ctx.now`.
 */
export {
  areSlotsContiguous,
  buildSlotGrid,
  formatMinutesAsTime,
  isSlotAligned,
  parseDateYmd,
  parseTimeToMinutes,
  slotEndsAt,
  toWitaParts,
  WITA_OFFSET_MINUTES,
  witaDateYmd,
  witaToInstant,
} from '@hola/shared'

/**
 * Satu-satunya pembacaan jam yang sah di apps/api.
 *
 * Dipanggil di batas request (middleware) dan di awal handler job, lalu
 * nilainya diteruskan lewat `ctx.now`. Dengan begitu seluruh perhitungan dalam
 * satu request memakai instan yang SAMA — tanpa itu, sebuah booking bisa
 * dihargai pada satu detik dan divalidasi horizon-nya pada detik berikutnya.
 */
export function serverNow(): Date {
  return new Date()
}

/** Tambah menit ke sebuah instan. */
export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000)
}

/** Tambah detik ke sebuah instan. */
export function addSeconds(instant: Date, seconds: number): Date {
  return new Date(instant.getTime() + seconds * 1000)
}

/** Apakah `instant` sudah lewat relatif terhadap `now`? */
export function isPast(instant: Date, now: Date): boolean {
  return instant.getTime() < now.getTime()
}
