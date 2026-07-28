/** J-31 system.cleanupExpiredTokens. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { removeExpiredTokens } from '../../modules/notifications/notification.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({}).strict()

export const cleanupExpiredTokensJob = {
  name: JOB.SYSTEM_CLEANUP_EXPIRED_TOKENS,
  handler: (async (ctx, job) => {
    if (!payloadSchema.safeParse(job.data).success)
      throw new UnrecoverableError('Payload J-31 tidak valid')
    await removeExpiredTokens(ctx)
  }) satisfies JobHandler,
} as const
