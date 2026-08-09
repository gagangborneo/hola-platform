import { defineConfig } from 'vitest/config'

// Sengaja dijauhkan dari zona default mesin: host dev/CI repo ini memakai
// Asia/Makassar (WITA, UTC+8) — zona yang persis di-hardcode `formatDateWita`
// dan kawan-kawannya lewat opsi `timeZone`. Kalau opsi itu suatu saat hilang,
// `Intl.DateTimeFormat` diam-diam jatuh ke zona lingkungan dan, di runner
// UTC+8, menghasilkan keluaran yang sama dengan jalur kode yang benar —
// regresinya lolos tanpa terlihat. Menyetel TZ beberapa jam dari UTC+8 membuat
// kelas regresi itu gagal dengan keras.
const TZ = 'America/New_York'

export default defineConfig({
  test: {
    env: { TZ },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
})
