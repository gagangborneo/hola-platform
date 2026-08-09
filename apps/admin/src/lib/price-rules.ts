import { isRecord } from './api-response.ts'

export type DayTypeValue = 'weekday' | 'weekend' | 'holiday' | 'specific_date'
export type RateClassValue = 'peak' | 'offpeak' | 'special'

export interface PriceRule {
  activeFrom: string | null
  activeTo: string | null
  courtId: string | null
  dayType: DayTypeValue
  endsTime: string
  id: string
  isActive: boolean
  pricePerHourAmount: number
  priority: number
  rateClass: RateClassValue
  specificDate: string | null
  sportId: string | null
  startsTime: string
}

interface PriceRuleResponse {
  active_from: string | null
  active_to: string | null
  court_id: string | null
  day_type: DayTypeValue
  ends_time: string
  id: string
  is_active: boolean
  price_per_hour_amount: number
  priority: number
  rate_class: RateClassValue
  specific_date: string | null
  sport_id: string | null
  starts_time: string
}

const DAY_TYPES: readonly string[] = ['weekday', 'weekend', 'holiday', 'specific_date']
const RATE_CLASSES: readonly string[] = ['peak', 'offpeak', 'special']

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

export function isPriceRuleResponse(value: unknown): value is PriceRuleResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.starts_time === 'string' &&
    typeof value.ends_time === 'string' &&
    typeof value.price_per_hour_amount === 'number' &&
    typeof value.priority === 'number' &&
    typeof value.is_active === 'boolean' &&
    typeof value.day_type === 'string' &&
    DAY_TYPES.includes(value.day_type) &&
    typeof value.rate_class === 'string' &&
    RATE_CLASSES.includes(value.rate_class) &&
    isNullableString(value.court_id) &&
    isNullableString(value.sport_id) &&
    isNullableString(value.specific_date) &&
    isNullableString(value.active_from) &&
    isNullableString(value.active_to)
  )
}

export function normalizePriceRule(value: PriceRuleResponse): PriceRule {
  return {
    id: value.id,
    courtId: value.court_id,
    sportId: value.sport_id,
    dayType: value.day_type,
    specificDate: value.specific_date,
    startsTime: value.starts_time,
    endsTime: value.ends_time,
    rateClass: value.rate_class,
    pricePerHourAmount: value.price_per_hour_amount,
    priority: value.priority,
    activeFrom: value.active_from,
    activeTo: value.active_to,
    isActive: value.is_active,
  }
}

export const PRICE_RULES_QUERY_KEY = ['price-rules'] as const
