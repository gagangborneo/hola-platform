/**
 * Helper transaksi.
 * Sumber kebenaran: docs/16-CONVENTIONS.md BR-SV-13, BR-SV-14.
 *
 * Dua aturan yang ditegakkan bentuk API ini:
 *
 * 1. Transaksi dimulai & diakhiri di SERVICE, bukan repository. Repository
 *    menerima `tx` sebagai parameter sehingga bisa dikomposisi.
 *
 * 2. Enqueue job terjadi SETELAH commit. Enqueue di dalam transaksi adalah bug
 *    senyap yang mahal: worker bisa memungut job sebelum transaksinya commit,
 *    lalu membaca baris yang belum ada — atau lebih buruk, transaksinya
 *    rollback dan job tetap jalan atas data yang tidak pernah eksis.
 *    `afterCommit` membuat urutan yang benar menjadi jalur termudah.
 *
 * Untuk pekerjaan yang TIDAK BOLEH hilang, jangan pakai `afterCommit` — tulis
 * outbox di dalam transaksi (BR-BQ-20/21). `afterCommit` bersifat best-effort:
 * kalau proses mati tepat setelah commit, callback-nya hilang.
 */
import type { HolaDb } from '@hola/db'
import type { Logger } from '../config/logger.ts'

/** Transaksi Drizzle. Bentuknya sama dengan `db` untuk operasi query. */
export type Tx = Parameters<Parameters<HolaDb['transaction']>[0]>[0]

export interface TransactionScope {
  tx: Tx
  /**
   * Daftarkan efek samping yang berjalan SETELAH commit berhasil: enqueue job,
   * invalidasi cache, kirim notifikasi. Tidak pernah berjalan bila rollback.
   */
  afterCommit: (fn: () => Promise<void> | void) => void
}

export interface WithTransactionOptions {
  logger?: Logger
}

export async function withTransaction<T>(
  db: HolaDb,
  fn: (scope: TransactionScope) => Promise<T>,
  options: WithTransactionOptions = {},
): Promise<T> {
  const callbacks: Array<() => Promise<void> | void> = []

  const result = await db.transaction(async (tx) => {
    return fn({ tx, afterCommit: (cb) => callbacks.push(cb) })
  })

  // Di luar transaksi: commit sudah terjadi. Kegagalan di sini TIDAK boleh
  // membatalkan pekerjaan yang sudah commit — ia dicatat, bukan dilempar.
  for (const cb of callbacks) {
    try {
      await cb()
    } catch (error) {
      options.logger?.error({ err: error }, 'callback afterCommit gagal setelah commit')
    }
  }

  return result
}
