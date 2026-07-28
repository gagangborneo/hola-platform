/**
 * SATU-SATUNYA tempat error menjadi response (BR-SV-04).
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 5.
 *
 * Route tidak pernah `try/catch` error bisnis. Kalau pemetaan error tersebar,
 * dua endpoint akan mengembalikan bentuk berbeda untuk kegagalan yang sama —
 * dan client yang bercabang berdasarkan `code` menjadi tidak dapat dipercaya.
 */
import { ERROR_CODE } from '@hola/shared'
import type { Context, ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { logger } from '../config/logger.ts'
import { incrementMetric } from '../config/metrics.ts'
import { captureUnexpectedError } from '../config/sentry.ts'
import { AppError, UniqueViolationError } from '../lib/errors.ts'

interface ErrorBody {
  code: string
  message: string
  details?: unknown
  request_id: string
}

function send(c: Context, status: number, body: ErrorBody): Response {
  return c.json({ error: body }, status as 400)
}

/** Bentuk `details` untuk kegagalan zod: satu entri per field (docs/04 § 5). */
function zodDetails(error: ZodError): Array<{ path: string; code: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }))
}

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = String(c.get('requestId') ?? '')
  const possibleUserId: unknown = c.get('userId')
  const sentryContext = {
    requestId,
    route: c.req.routePath ?? c.req.path,
    ...(typeof possibleUserId === 'string' ? { userId: possibleUserId } : {}),
  }

  // ── Error bisnis ──────────────────────────────────────────────────────────
  if (error instanceof AppError) {
    const body: ErrorBody = { code: error.code, message: error.message, request_id: requestId }
    if (error.details !== undefined) body.details = error.details

    if (error.isExpected) {
      // docs/02 § 9: error yang DIHARAPKAN tidak dikirim ke Sentry. Sentry yang
      // penuh 409 konflik slot membuat alert kehilangan artinya.
      logger.info({ request_id: requestId, code: error.code, status: error.status }, 'app error')
    } else {
      logger.error({ err: error, request_id: requestId, code: error.code }, 'app error 5xx')
      captureUnexpectedError(error, sentryContext)
    }
    return send(c, error.status, body)
  }

  // ── Validasi zod yang lolos sampai sini ───────────────────────────────────
  if (error instanceof ZodError) {
    logger.info({ request_id: requestId }, 'validation error')
    return send(c, 422, {
      code: ERROR_CODE.VALIDATION_ERROR,
      message: 'Data yang dikirim tidak valid.',
      details: zodDetails(error),
      request_id: requestId,
    })
  }

  // ── Unique violation yang tidak diterjemahkan service ─────────────────────
  if (error instanceof UniqueViolationError) {
    // Ini menandakan celah: repository menerjemahkan constraint-nya, tetapi
    // tidak ada service yang memetakannya ke error bisnis. Dicatat sebagai
    // error supaya terlihat, bukan disamarkan menjadi 409 generik yang senyap.
    logger.error(
      { err: error, request_id: requestId, constraint: error.constraintName },
      'unique violation tidak dipetakan ke error bisnis',
    )
    return send(c, 409, {
      code: ERROR_CODE.CONFLICT,
      message: 'Data yang Anda kirim bertentangan dengan data yang sudah ada.',
      request_id: requestId,
    })
  }

  // ── HTTPException bawaan Hono (mis. body bukan JSON) ──────────────────────
  if (error instanceof HTTPException) {
    const code = error.status === 400 ? ERROR_CODE.MALFORMED_REQUEST : ERROR_CODE.INTERNAL_ERROR
    if (error.status >= 500) {
      logger.error(
        { err: error, request_id: requestId, status: error.status },
        'http exception 5xx',
      )
      captureUnexpectedError(error, sentryContext)
    } else {
      logger.info({ request_id: requestId, status: error.status }, 'http exception')
    }
    return send(c, error.status, {
      code,
      message:
        error.status === 400
          ? 'Format permintaan tidak dapat dibaca.'
          : 'Terjadi kesalahan pada sistem.',
      request_id: requestId,
    })
  }

  // ── Sisanya: bug ──────────────────────────────────────────────────────────
  incrementMetric('unhandled_errors_total')
  logger.error({ err: error, request_id: requestId }, 'unhandled error')
  captureUnexpectedError(error, sentryContext)
  return send(c, 500, {
    code: ERROR_CODE.INTERNAL_ERROR,
    // Detail internal TIDAK PERNAH bocor ke client.
    message: 'Terjadi kesalahan pada sistem. Tim kami sudah diberi tahu.',
    request_id: requestId,
  })
}

export const notFoundHandler: NotFoundHandler = (c) =>
  send(c, 404, {
    code: ERROR_CODE.NOT_FOUND,
    message: 'Endpoint tidak ditemukan.',
    request_id: String(c.get('requestId') ?? ''),
  })
