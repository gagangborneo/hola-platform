/** Cache Redis tervalidasi dan invalidasi pattern untuk availability. */
import { AVAILABILITY_CACHE_TTL_SECONDS, type RedisKeys } from '@hola/shared'
import { z } from 'zod'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'

export interface AvailabilityRedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: ['EX', number]): Promise<'OK' | null>
  del(...keys: string[]): Promise<number>
  scan(cursor: string, ...args: ['MATCH', string, 'COUNT', number]): Promise<[string, string[]]>
}

export const availabilitySlotSchema = z.object({
  starts_at: z.string(),
  ends_at: z.string(),
  is_available: z.boolean(),
  unavailable_reason: z
    .enum(['booking', 'event', 'match', 'maintenance', 'past', 'closed'])
    .nullable(),
  rate_class: z.enum(['peak', 'offpeak', 'special']).nullable(),
  price_amount: z.number().int().nullable(),
})

export const availabilityDataSchema = z.object({
  court_id: z.string().uuid(),
  court_code: z.string(),
  date: z.string().date(),
  slot_duration_minutes: z.number().int().positive(),
  day_type: z.enum(['weekday', 'weekend', 'holiday', 'specific_date']).nullable(),
  slots: z.array(availabilitySlotSchema),
})

export type AvailabilityData = z.infer<typeof availabilityDataSchema>

export interface AvailabilityWarning {
  code: 'BEYOND_BOOKING_HORIZON'
  message: string
}

const availabilityCacheSchema = z.object({
  data: availabilityDataSchema,
  generated_at: z.string(),
  warnings: z.array(z.object({ code: z.literal('BEYOND_BOOKING_HORIZON'), message: z.string() })),
})

export interface AvailabilityCacheContext {
  redis: AvailabilityRedisClient
  redisKeys: RedisKeys
  safeRedis: CoreDependencies['safeRedis']
}

export async function readAvailabilityCache(
  ctx: AvailabilityCacheContext,
  input: { courtId: string; date: string },
): Promise<{
  data: AvailabilityData
  generatedAt: string
  warnings: AvailabilityWarning[]
} | null> {
  const key = ctx.redisKeys.availability(input.courtId, input.date)
  const raw = await ctx.safeRedis<string | null>(
    'availability_cache',
    () => ctx.redis.get(key),
    null,
  )
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = availabilityCacheSchema.safeParse(parsed)
    return result.success
      ? {
          data: result.data.data,
          generatedAt: result.data.generated_at,
          warnings: result.data.warnings,
        }
      : null
  } catch {
    return null
  }
}

export async function writeAvailabilityCache(
  ctx: AvailabilityCacheContext,
  input: { data: AvailabilityData; generatedAt: string; warnings: AvailabilityWarning[] },
): Promise<void> {
  const key = ctx.redisKeys.availability(input.data.court_id, input.data.date)
  await ctx.safeRedis(
    'availability_cache',
    () =>
      ctx.redis.set(
        key,
        JSON.stringify({
          data: input.data,
          generated_at: input.generatedAt,
          warnings: input.warnings,
        }),
        'EX',
        AVAILABILITY_CACHE_TTL_SECONDS,
      ),
    null,
  )
}

export async function invalidateAvailabilityKeys(
  ctx: AvailabilityCacheContext,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return
  await ctx.safeRedis('availability_invalidation', () => ctx.redis.del(...keys), 0)
}

/** I-7/I-8/I-9/I-10: SCAN, bukan KEYS, agar Redis produksi tidak terblokir. */
export async function invalidateAvailabilityPattern(
  ctx: AvailabilityCacheContext,
  pattern: string,
): Promise<void> {
  await ctx.safeRedis(
    'availability_invalidation',
    async () => {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await ctx.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200)
        await invalidateAvailabilityKeys(ctx, keys)
        cursor = nextCursor
      } while (cursor !== '0')
    },
    undefined,
  )
}

export function availabilityPattern(redisKeys: RedisKeys, suffix: string): string {
  return `${redisKeys.prefix()}avail:${suffix}`
}
