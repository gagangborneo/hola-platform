/**
 * Logger pino.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 9 "Logging".
 *
 * Redaction bukan kenyamanan — ia mencegah password, token, dan
 * `signature_key` webhook mendarat permanen di agregator log. Sekali bocor ke
 * log, rahasianya harus dirotasi.
 */
import { pino } from 'pino'
import { env } from '../env.ts'

/**
 * 11 kunci yang WAJIB diredaksi (docs/02 § 9). Setiap entri diperluas ke
 * beberapa jalur karena kunci yang sama muncul di tempat berbeda (header,
 * body, payload job).
 */
export const SENSITIVE_LOG_KEYS = [
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'authorization',
  'cookie',
  'card',
  'cvv',
  'MIDTRANS_SERVER_KEY',
  'signature_key',
  'signatureKey',
] as const

/** Bangun jalur redaction untuk kedalaman yang realistis di log kita. */
export function redactPaths(): string[] {
  const containers = ['', 'req.headers.', 'req.body.', 'res.headers.', 'payload.', 'body.', 'data.']
  const paths = new Set<string>()
  for (const key of SENSITIVE_LOG_KEYS) {
    for (const c of containers) paths.add(`${c}${key}`)
    paths.add(`*.${key}`)
  }
  return [...paths]
}

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths(), censor: '[REDACTED]' },
  base: { app: 'hola-api', env: env.APP_ENV },
  // pino-pretty HANYA di development. Di produksi, JSON satu baris.
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: true } } }
    : {}),
})

export type Logger = typeof logger

/** Field wajib tiap log request (docs/02 § 9). */
export interface RequestLogFields {
  request_id: string
  method: string
  path: string
  status: number
  duration_ms: number
  user_id?: string
  role?: string
  ip?: string
}

/** Field wajib tiap log job (docs/02 § 9, BR-BQ-14). */
export interface JobLogFields {
  job_name: string
  job_id: string
  attempt: number
  duration_ms: number
  outcome: 'success' | 'failed'
}

/**
 * Log transisi state bisnis. WAJIB untuk booking, payment, refund, event,
 * match, dan invoice (docs/02 § 9). Bentuknya dikunci di satu helper agar
 * seragam dan bisa di-query di agregator log.
 */
export function logStateTransition(
  log: Logger,
  params: { event: string; entityId: string; from: string; to: string; actor?: string },
): void {
  log.info(
    {
      event: params.event,
      entity_id: params.entityId,
      from: params.from,
      to: params.to,
      actor: params.actor,
    },
    `${params.event}: ${params.from} → ${params.to}`,
  )
}
