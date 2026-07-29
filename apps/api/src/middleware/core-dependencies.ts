/**
 * Dependensi proses yang dibagikan ke service melalui Hono context.
 *
 * Service tetap menerima dependensi sebagai parameter pertama (BR-SV-10);
 * route tidak perlu mengimpor koneksi database/Redis secara langsung
 * (BR-SV-02).
 */
import type { HolaDb } from '@hola/db'
import type { RedisKeys } from '@hola/shared'
import type { MiddlewareHandler } from 'hono'
import type { Redis } from 'ioredis'
import { db } from '../config/db.ts'
import { type Logger, logger } from '../config/logger.ts'
import { mail } from '../config/mail.ts'
import { type QueueProducers, queues } from '../config/queues.ts'
import { keys, redis, safeRedis } from '../config/redis.ts'
import { storage } from '../config/storage.ts'
import { type Env, env } from '../env.ts'
import type { MailAdapter } from '../providers/mail.ts'
import type { StorageAdapter } from '../providers/storage.ts'

export interface CoreDependencies {
  db: HolaDb
  redis: Redis
  redisKeys: RedisKeys
  safeRedis: typeof safeRedis
  queues: QueueProducers
  mail: MailAdapter
  storage: StorageAdapter
  logger: Logger
  env: Env
}

export interface CoreDependencyVariables {
  core: CoreDependencies
}

const core: CoreDependencies = {
  db,
  redis,
  redisKeys: keys,
  safeRedis,
  queues,
  mail,
  storage,
  logger,
  env,
}

export const coreDependencies: MiddlewareHandler<{
  Variables: CoreDependencyVariables
}> = async (c, next) => {
  c.set('core', core)
  await next()
}
