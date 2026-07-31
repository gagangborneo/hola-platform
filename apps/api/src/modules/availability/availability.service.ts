/** Delapan langkah pembacaan availability; cache tidak pernah menentukan klaim. */
import { AVAILABILITY_MAX_RANGE_DAYS, toWitaParts, witaToInstant } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import { buildSlotGrid, isPast, witaDateYmd } from '../../lib/time.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { computeQuote } from '../pricing/pricing.service.ts'
import {
  findAvailabilityCourt,
  findAvailabilityHours,
  findAvailabilitySpecialDate,
  findBlockingAvailabilityClaims,
  findBookingHorizonDays,
} from './availability.repository.ts'
import {
  type AvailabilityData,
  type AvailabilityRedisClient,
  type AvailabilityWarning,
  availabilityDataSchema,
  readAvailabilityCache,
  writeAvailabilityCache,
} from './availability-cache.ts'

export interface AvailabilityServiceContext {
  db: CoreDependencies['db']
  redis: AvailabilityRedisClient
  redisKeys: CoreDependencies['redisKeys']
  safeRedis: CoreDependencies['safeRedis']
  now: Date
}

export interface AvailabilityResult {
  data: AvailabilityData
  generatedAt: string
  cache: 'HIT' | 'MISS'
  warnings: AvailabilityWarning[]
}

export interface AvailabilityRangeResult {
  data: { court_id: string; days: AvailabilityData[] }
  generatedAt: string
  cache: 'HIT' | 'MISS'
  warnings: AvailabilityWarning[]
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

function slotDateDaysAfter(date: string, now: Date): number {
  return Math.floor(
    (witaToInstant(date, 0).getTime() - witaToInstant(witaDateYmd(now), 0).getTime()) / 86_400_000,
  )
}

function calendarDayType(
  date: string,
  specialDate: Awaited<ReturnType<typeof findAvailabilitySpecialDate>>,
): 'weekday' | 'weekend' | 'holiday' | 'specific_date' {
  if (specialDate?.dayTypeOverride) return specialDate.dayTypeOverride
  const weekday = toWitaParts(witaToInstant(date, 0)).weekday
  return weekday === 0 || weekday === 6 ? 'weekend' : 'weekday'
}

/**
 * Harga diproses oleh pricing saja. Chunk 8 menjaga batas pipeline quote tanpa
 * membuat kalkulator harga kedua untuk availability.
 */
async function pricesForGrid(
  ctx: AvailabilityServiceContext,
  input: { courtId: string; startsAtList: readonly Date[] },
): Promise<Map<string, { priceAmount: number; rateClass: 'peak' | 'offpeak' | 'special' }>> {
  const result = new Map<
    string,
    { priceAmount: number; rateClass: 'peak' | 'offpeak' | 'special' }
  >()
  for (let index = 0; index < input.startsAtList.length; index += 8) {
    const startsAtList = input.startsAtList.slice(index, index + 8)
    const quote = await computeQuote(
      { db: ctx.db },
      {
        kind: 'booking',
        at: ctx.now.toISOString(),
        actor: { role: 'customer' },
        booking: {
          items: startsAtList.map((startsAt) => ({
            court_id: input.courtId,
            starts_at: startsAt.toISOString(),
          })),
          addons: [],
        },
      },
    )
    for (const line of quote.lines) {
      if (line.type !== 'slot' || !line.starts_at || !line.rate_class) continue
      result.set(line.starts_at, {
        priceAmount: line.line_total_amount,
        rateClass: line.rate_class,
      })
    }
  }
  return result
}

export async function getCourtAvailability(
  ctx: AvailabilityServiceContext,
  input: { courtId: string; date: string },
): Promise<AvailabilityResult> {
  const cached = await readAvailabilityCache(ctx, input)
  if (cached) {
    return {
      data: cached.data,
      generatedAt: cached.generatedAt,
      cache: 'HIT',
      warnings: cached.warnings,
    }
  }

  const court = await findAvailabilityCourt(ctx.db, input.courtId)
  if (!court) throw err.notFound('Lapangan tidak ditemukan.')
  const dayOfWeek = toWitaParts(witaToInstant(input.date, 0)).weekday
  const [hours, specialDate, horizonValue] = await Promise.all([
    findAvailabilityHours(ctx.db, { courtId: input.courtId, dayOfWeek }),
    findAvailabilitySpecialDate(ctx.db, input.date),
    findBookingHorizonDays(ctx.db),
  ])
  const generatedAt = ctx.now.toISOString()
  const beyondHorizon = slotDateDaysAfter(input.date, ctx.now) > positiveInteger(horizonValue, 60)
  const warnings = beyondHorizon
    ? [{ code: 'BEYOND_BOOKING_HORIZON' as const, message: 'Tanggal melampaui horizon booking.' }]
    : []
  const grid =
    hours && !specialDate?.isClosed && court.status === 'active'
      ? buildSlotGrid(input.date, { ...hours, slotDurationMinutes: court.slotDurationMinutes })
      : []
  const [claims, prices] = await Promise.all([
    findBlockingAvailabilityClaims(ctx.db, {
      courtId: input.courtId,
      slotDate: input.date,
      now: ctx.now,
    }),
    beyondHorizon
      ? Promise.resolve(
          new Map<string, { priceAmount: number; rateClass: 'peak' | 'offpeak' | 'special' }>(),
        )
      : pricesForGrid(ctx, {
          courtId: input.courtId,
          startsAtList: grid.map((slot) => slot.startsAt),
        }),
  ])
  const claimsByStart = new Map(
    claims.map((claim) => [claim.startsAt.toISOString(), claim.claimType]),
  )
  const data = availabilityDataSchema.parse({
    court_id: court.id,
    court_code: court.code,
    date: input.date,
    slot_duration_minutes: court.slotDurationMinutes,
    day_type: calendarDayType(input.date, specialDate),
    slots: grid.map((slot) => {
      const startsAt = slot.startsAt.toISOString()
      const price = prices.get(startsAt)
      const claimType = claimsByStart.get(startsAt)
      const unavailableReason = isPast(slot.startsAt, ctx.now)
        ? 'past'
        : (claimType ?? (beyondHorizon ? 'beyond_horizon' : null))
      return {
        starts_at: startsAt,
        ends_at: slot.endsAt.toISOString(),
        is_available: unavailableReason === null,
        unavailable_reason: unavailableReason,
        rate_class: price?.rateClass ?? null,
        price_amount: price?.priceAmount ?? null,
      }
    }),
  })
  await writeAvailabilityCache(ctx, { data, generatedAt, warnings })
  return { data, generatedAt, cache: 'MISS', warnings }
}

export function assertAvailabilityRange(dateFrom: string, dateTo: string): void {
  const days = Math.floor(
    (witaToInstant(dateTo, 0).getTime() - witaToInstant(dateFrom, 0).getTime()) / 86_400_000,
  )
  if (days < 0 || days + 1 > AVAILABILITY_MAX_RANGE_DAYS) {
    throw err.validation({ field: 'date_range', max_days: AVAILABILITY_MAX_RANGE_DAYS })
  }
}

function datesInRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = []
  const last = witaToInstant(dateTo, 0).getTime()
  for (
    let timestamp = witaToInstant(dateFrom, 0).getTime();
    timestamp <= last;
    timestamp += 86_400_000
  ) {
    dates.push(witaDateYmd(new Date(timestamp)))
  }
  return dates
}

/**
 * Cache tetap per hari (BR-B-41); range hanya menggabungkan pembacaan harian
 * sehingga invalidasi satu court/tanggal tidak pernah membiarkan data gabungan basi.
 */
export async function getCourtAvailabilityRange(
  ctx: AvailabilityServiceContext,
  input: { courtId: string; dateFrom: string; dateTo: string },
): Promise<AvailabilityRangeResult> {
  assertAvailabilityRange(input.dateFrom, input.dateTo)
  const results = await Promise.all(
    datesInRange(input.dateFrom, input.dateTo).map((date) =>
      getCourtAvailability(ctx, { courtId: input.courtId, date }),
    ),
  )
  const first = results[0]
  if (!first) throw err.validation({ field: 'date_range' })
  const warnings = results
    .flatMap((result) => result.warnings)
    .filter(
      (warning, index, all) =>
        all.findIndex((candidate) => candidate.code === warning.code) === index,
    )
  return {
    data: { court_id: input.courtId, days: results.map((result) => result.data) },
    generatedAt:
      results
        .map((result) => result.generatedAt)
        .sort()
        .at(-1) ?? ctx.now.toISOString(),
    cache: results.every((result) => result.cache === 'HIT') ? 'HIT' : 'MISS',
    warnings,
  }
}
