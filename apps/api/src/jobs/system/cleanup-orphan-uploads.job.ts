/** J-32 system.cleanupOrphanUploads. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { cleanupOrphanUploads } from '../../modules/media/media.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({}).strict()

export const cleanupOrphanUploadsJob = {
  name: JOB.SYSTEM_CLEANUP_ORPHAN_UPLOADS,
  handler: (async (ctx, job) => {
    if (!payloadSchema.safeParse(job.data).success)
      throw new UnrecoverableError('Payload J-32 tidak valid')
    await cleanupOrphanUploads(ctx)
  }) satisfies JobHandler,
} as const
