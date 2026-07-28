/**
 * Daftar password umum untuk kebijakan password server.
 *
 * Sumber paket adalah kamus statis `passwords-common` dari zxcvbn-ts. Kita
 * sengaja mengambil 10.000 entri pertama (berdasarkan urutan frekuensi dari
 * kamus) agar memenuhi aturan docs/05 § 8 tanpa memanggil layanan eksternal
 * atau menyimpan password pengguna.
 */
import { dictionary } from '@zxcvbn-ts/language-common'

const TOP_10K = 10_000
const commonPasswords = dictionary['passwords-common']

if (commonPasswords.length < TOP_10K) {
  throw new Error('Kamus password umum tidak memuat 10.000 entri.')
}

/** Read-only agar konsumen tidak dapat mengubah kebijakan global saat runtime. */
export const WEAK_PASSWORDS: ReadonlySet<string> = new Set(
  commonPasswords.slice(0, TOP_10K).map((password) => password.toLowerCase()),
)

export const WEAK_PASSWORD_COUNT = TOP_10K
