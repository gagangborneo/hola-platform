/** Registry worker. Satu-satunya lokasi nama job dihubungkan ke handler. */
import { JOB, JOB_QUEUE, type JobName, QUEUE, type QueueName } from '@hola/shared'
import type { RepeatOptions } from 'bullmq'
import { JOB_OPTIONS } from './job-options.ts'
import { retryStuckNotificationsJob } from './notification/retry-stuck-notifications.job.ts'
import { sendEmailJob } from './notification/send-email.job.ts'
import { backupDatabaseJob } from './system/backup-database.job.ts'
import { cleanupExpiredTokensJob } from './system/cleanup-expired-tokens.job.ts'
import { cleanupOrphanUploadsJob } from './system/cleanup-orphan-uploads.job.ts'
import type { JobHandler, RegisteredJob, WorkerRuntime } from './types.ts'

interface RegisteredJobDefinition {
  name: JobName
  queue: QueueName
  handler: JobHandler | undefined
}

const implementedHandlers = new Map<JobName, JobHandler>([
  [sendEmailJob.name, sendEmailJob.handler],
  [retryStuckNotificationsJob.name, retryStuckNotificationsJob.handler],
  [cleanupExpiredTokensJob.name, cleanupExpiredTokensJob.handler],
  [cleanupOrphanUploadsJob.name, cleanupOrphanUploadsJob.handler],
  [backupDatabaseJob.name, backupDatabaseJob.handler],
])

/**
 * Semua nama kanonik sengaja terdaftar sekarang. Handler domain yang belum
 * masuk fase implementasinya dilompati aman; scheduler hanya dipasang untuk
 * job yang sudah memiliki handler nyata di fase ini.
 */
export const registeredJobs: readonly RegisteredJobDefinition[] = Object.values(JOB).map(
  (name) => ({
    name,
    queue: JOB_QUEUE[name],
    handler: implementedHandlers.get(name),
  }),
)

export const registeredJobNames: readonly JobName[] = registeredJobs.map((job) => job.name)

export const scheduledJobs: readonly {
  id: string
  name: JobName
  queue: QueueName
  repeat: Omit<RepeatOptions, 'key' | 'prevMillis'>
}[] = [
  {
    id: 'scheduler:system.backupDatabase',
    name: JOB.SYSTEM_BACKUP_DATABASE,
    queue: QUEUE.SYSTEM,
    repeat: { pattern: '0 3 * * *', tz: 'Asia/Makassar' },
  },
  {
    id: 'scheduler:system.cleanupExpiredTokens',
    name: JOB.SYSTEM_CLEANUP_EXPIRED_TOKENS,
    queue: QUEUE.SYSTEM,
    repeat: { pattern: '0 4 * * *', tz: 'Asia/Makassar' },
  },
  {
    id: 'scheduler:notification.retryStuckNotifications',
    name: JOB.NOTIFICATION_RETRY_STUCK_NOTIFICATIONS,
    queue: QUEUE.NOTIFICATION,
    repeat: { pattern: '*/5 * * * *', tz: 'Asia/Makassar' },
  },
  {
    id: 'scheduler:system.cleanupOrphanUploads',
    name: JOB.SYSTEM_CLEANUP_ORPHAN_UPLOADS,
    queue: QUEUE.SYSTEM,
    repeat: { pattern: '0 5 * * 0', tz: 'Asia/Makassar' },
  },
]

export function jobsForQueue(queue: QueueName): readonly RegisteredJobDefinition[] {
  return registeredJobs.filter((job) => job.queue === queue)
}

export async function processRegisteredJob(ctx: WorkerRuntime, job: RegisteredJob): Promise<void> {
  const definition = registeredJobs.find((item) => item.name === job.name)
  if (!definition) throw new Error(`Job ${job.name} tidak terdaftar`)
  if (!definition.handler) {
    // Endpoint yang membuat job ini belum ada sebelum modul domain-nya hadir.
    // Tidak ada scheduler untuk placeholder, sehingga jalur ini hanya proteksi
    // saat ada enqueue yang salah dan tetap idempoten (tanpa side effect).
    ctx.logger.warn({ job_name: job.name, job_id: job.id }, 'job domain belum diimplementasikan')
    return
  }
  await definition.handler(ctx, job)
}

export { JOB_OPTIONS }
