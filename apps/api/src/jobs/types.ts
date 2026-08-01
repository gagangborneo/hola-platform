/** Tipe runtime bersama untuk seluruh handler job. */
import type { Job } from 'bullmq'
import type { CoreDependencies } from '../middleware/core-dependencies.ts'
import type { BackupAdapter } from '../providers/backup.ts'

export type WorkerRuntime = Pick<
  CoreDependencies,
  'db' | 'env' | 'logger' | 'mail' | 'queues' | 'redis' | 'redisKeys' | 'safeRedis' | 'storage'
> & { backup: BackupAdapter; now: Date }

export type RegisteredJob = Job<Record<string, unknown>, unknown, string>
export type JobHandler = (ctx: WorkerRuntime, job: RegisteredJob) => Promise<void>
