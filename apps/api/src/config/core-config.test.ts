import { RATE_LIMIT, RATE_LIMIT_BUCKET } from '@hola/shared'
import { pino } from 'pino'
import { describe, expect, it } from 'vitest'
import { AppError, err } from '../lib/errors.ts'
import { redactPaths, SENSITIVE_LOG_KEYS } from './logger.ts'
import { incrementMetric, renderMetrics, resetMetrics } from './metrics.ts'
import { shouldCaptureInSentry } from './sentry.ts'

describe('logger, metrics, dan Sentry', () => {
  it('F0-34: redaction mencakup tepat 11 kunci sensitif wajib', () => {
    expect(SENSITIVE_LOG_KEYS).toHaveLength(11)
    for (const key of SENSITIVE_LOG_KEYS) {
      expect(redactPaths()).toContain(key)
      expect(redactPaths()).toContain(`*.${key}`)
    }
  })

  it('F0-34: pino benar-benar menyensor nilai sensitif', () => {
    let output = ''
    const stream = { write: (chunk: string) => (output += chunk) }
    const testLogger = pino({ redact: { paths: redactPaths(), censor: '[REDACTED]' } }, stream)
    testLogger.info({ password: 'rahasia', req: { headers: { authorization: 'Bearer x' } } })
    expect(output).not.toContain('rahasia')
    expect(output).not.toContain('Bearer x')
    expect(output).toContain('[REDACTED]')
  })

  it('F0-34: expected error tidak dikirim ke Sentry', () => {
    expect(shouldCaptureInSentry(err.validation())).toBe(false)
    expect(shouldCaptureInSentry(err.conflict())).toBe(false)
    expect(shouldCaptureInSentry(err.internal())).toBe(true)
    expect(shouldCaptureInSentry(new Error('bug'))).toBe(true)
    expect(shouldCaptureInSentry(new AppError('NOT_FOUND'))).toBe(false)
  })

  it('F0-41: metrik dirender dalam format teks Prometheus', () => {
    resetMetrics()
    incrementMetric('redis_degraded_total', { feature: 'test' })
    expect(renderMetrics()).toContain('redis_degraded_total{feature="test"} 1')
  })

  it('F0-39: katalog middleware mencakup tepat 12 bucket rate limit', () => {
    expect(Object.keys(RATE_LIMIT_BUCKET)).toHaveLength(12)
    expect(Object.keys(RATE_LIMIT)).toHaveLength(12)
    expect(new Set(Object.values(RATE_LIMIT_BUCKET))).toEqual(new Set(Object.keys(RATE_LIMIT)))
  })
})
