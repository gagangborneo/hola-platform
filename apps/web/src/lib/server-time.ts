/**
 * Selisih jam peladen dengan jam klien (E-23). Sengaja tidak diletakkan di
 * `public-config.ts`: berkas itu mengimpor `serverApi` yang membaca `process.env`,
 * dan komponen klien yang mengimpornya akan menarik kode peladen ke bundle browser.
 */
export function serverTimeOffsetMs(serverTime: string, clientNow: number): number {
  return new Date(serverTime).getTime() - clientNow
}
