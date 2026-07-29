/** J-30 system.backupDatabase — dump PostgreSQL tervalidasi ke object storage. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({}).strict()

async function pingDeadMansSwitch(url: string | undefined): Promise<void> {
  if (!url) return
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error('Ping dead-man’s switch backup gagal.')
}

export const backupDatabaseJob = {
  name: JOB.SYSTEM_BACKUP_DATABASE,
  handler: (async (ctx, job) => {
    if (!payloadSchema.safeParse(job.data).success)
      throw new UnrecoverableError('Payload J-30 tidak valid')
    if (!ctx.env.BACKUP_ENABLED) {
      ctx.logger.info({ job_name: job.name }, 'backup database dilewati: BACKUP_ENABLED=false')
      return
    }

    const backup = await ctx.backup.createBackup({
      databaseUrl: ctx.env.DATABASE_URL,
      bucket: ctx.env.S3_BUCKET_BACKUP,
      endpoint: ctx.env.S3_ENDPOINT,
      region: ctx.env.S3_REGION,
      accessKeyId: ctx.env.S3_ACCESS_KEY_ID,
      secretAccessKey: ctx.env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: ctx.env.S3_FORCE_PATH_STYLE,
      localDirectory: '/backups',
      localRetentionDays: ctx.env.BACKUP_LOCAL_RETENTION_DAYS,
      now: ctx.now,
    })
    const remote = await ctx.storage.headObject({
      bucket: ctx.env.S3_BUCKET_BACKUP,
      objectKey: backup.objectKey,
    })
    if (!remote?.sizeBytes || remote.sizeBytes <= 0) {
      throw new Error('Objek backup tidak ditemukan atau kosong setelah upload.')
    }
    await pingDeadMansSwitch(ctx.env.HEALTHCHECKS_BACKUP_PING_URL)
    ctx.logger.info(
      { job_name: job.name, backup_key: backup.objectKey, backup_size_bytes: remote.sizeBytes },
      'backup database berhasil diverifikasi',
    )
  }) satisfies JobHandler,
} as const
