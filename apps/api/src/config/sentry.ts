/**
 * Sentry untuk proses API/worker.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 9.
 *
 * Error yang diharapkan tidak pernah dikirim. Filter ini hidup di adapter
 * Sentry (bukan hanya di error-handler), supaya pemanggil baru tidak dapat
 * memenuhi dashboard dengan validasi, 401, 403, 404, atau konflik 409.
 */
import * as Sentry from '@sentry/node'
import { env } from '../env.ts'
import { AppError } from '../lib/errors.ts'

Sentry.init({
  dsn: env.SENTRY_DSN || undefined,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.APP_ENV,
  release: env.SENTRY_RELEASE || undefined,
  tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  sendDefaultPii: false,
  includeLocalVariables: false,
})

export interface SentryErrorContext {
  requestId?: string
  userId?: string
  route?: string
  jobName?: string
}

/** Pure dan diekspor agar kebijakan "expected error" dapat diuji langsung. */
export function shouldCaptureInSentry(error: unknown): boolean {
  return !(error instanceof AppError && error.isExpected)
}

export function captureUnexpectedError(error: unknown, context: SentryErrorContext = {}): void {
  if (!shouldCaptureInSentry(error) || !env.SENTRY_DSN) return

  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag('request_id', context.requestId)
    if (context.userId) scope.setUser({ id: context.userId })
    if (context.route) scope.setTag('route', context.route)
    if (context.jobName) scope.setTag('job_name', context.jobName)
    Sentry.captureException(error)
  })
}

/** Beri event yang sudah di-buffer kesempatan terkirim saat graceful shutdown. */
export async function closeSentry(timeoutMs = 2_000): Promise<boolean> {
  if (!env.SENTRY_DSN) return true
  return Sentry.flush(timeoutMs)
}
