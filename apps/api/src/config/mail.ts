/** Mail adapter dibangun sekali saat boot dan digunakan kembali antar request. */
import { env } from '../env.ts'
import { createMailAdapter } from '../providers/mail.ts'
import { logger } from './logger.ts'

export const mail = createMailAdapter(env, logger)
