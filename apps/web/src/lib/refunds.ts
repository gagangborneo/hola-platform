/**
 * Bentuk refund milik pelanggan untuk `/akun/pembayaran`.
 *
 * `serializeRefund` di API mengembalikan `Record<string, unknown>`, jadi tipe
 * respons klien Hono TIDAK menjamin bentuk barisnya — berbeda dengan endpoint
 * lain yang serializernya mengembalikan objek bertipe. Karena itu baris
 * divalidasi di sini sebelum menyentuh UI.
 *
 * Baris yang tidak dikenali membuat seluruh permintaan gagal, bukan dibuang
 * diam-diam: daftar ini soal uang customer, dan menyembunyikan satu refund
 * lebih berbahaya daripada menampilkan "gagal dimuat" dengan tombol coba lagi.
 */
export interface CustomerRefund {
  id: string
  refundCode: string
  amount: number
  status: string
  channel: string
  reason: string
  policyApplied: string | null
  approvedAt: string | null
  completedAt: string | null
  failureReason: string | null
  createdAt: string
}

interface RefundResponse {
  id: string
  refund_code: string
  amount: number
  status: string
  channel: string
  reason: string
  policy_applied: string | null
  approved_at: string | null
  completed_at: string | null
  failure_reason: string | null
  created_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isRefundResponse(value: unknown): value is RefundResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.refund_code === 'string' &&
    typeof value.amount === 'number' &&
    typeof value.status === 'string' &&
    typeof value.channel === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.created_at === 'string' &&
    isNullableString(value.policy_applied) &&
    isNullableString(value.approved_at) &&
    isNullableString(value.completed_at) &&
    isNullableString(value.failure_reason)
  )
}

/** Melempar — bukan mengembalikan daftar sebagian — saat envelope tidak dikenali. */
export function parseRefundList(payload: unknown): CustomerRefund[] {
  if (!isRecord(payload) || !Array.isArray(payload.data) || !payload.data.every(isRefundResponse)) {
    throw new Error('Respons daftar refund dari API tidak dapat diproses.')
  }
  return payload.data.map((row) => ({
    id: row.id,
    refundCode: row.refund_code,
    amount: row.amount,
    status: row.status,
    channel: row.channel,
    reason: row.reason,
    policyApplied: row.policy_applied,
    approvedAt: row.approved_at,
    completedAt: row.completed_at,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  }))
}

const REFUND_CHANNEL_LABEL: Record<string, string> = {
  manual_transfer: 'Transfer bank',
  cash: 'Tunai di lokasi',
  gateway: 'Kembali ke metode pembayaran',
}

export function refundChannelLabel(channel: string): string {
  return REFUND_CHANNEL_LABEL[channel] ?? 'Kanal lain'
}
