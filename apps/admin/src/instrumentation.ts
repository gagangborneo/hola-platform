import * as Sentry from '@sentry/nextjs'

/** Memuat konfigurasi Sentry untuk runtime server/edge Next.js. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config.ts')
  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config.ts')
}

export const onRequestError = Sentry.captureRequestError
