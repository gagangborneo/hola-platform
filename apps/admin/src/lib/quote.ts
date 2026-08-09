/**
 * Pratinjau harga back-office.
 *
 * Rencana semula menyebut `GET /pricing/preview`; endpoint itu tidak ada di
 * API Phase 1. `POST /bookings/quote` dipakai sebagai gantinya dan justru lebih
 * kuat: publik, stateless (`reserve_promo` mati), dan menjalankan pipeline
 * harga yang PERSIS sama dengan checkout — jadi angka yang dilihat operator
 * adalah angka yang akan ditagih, bukan perkiraan dari kalkulator kedua.
 */

import { HolaApiError } from '@hola/api-client'
import { ERROR_CODE, type Quote } from '@hola/shared'
import { apiClient } from './api-client.ts'
import { isRecord, parseData } from './api-response.ts'

/** Batas `items` pada `bookingQuoteSchema`. */
export const MAX_QUOTE_ITEMS = 8

export interface QuoteItemInput {
  court_id: string
  starts_at: string
}

function isQuote(value: unknown): value is Quote {
  return (
    isRecord(value) &&
    Array.isArray(value.lines) &&
    typeof value.total_amount === 'number' &&
    typeof value.subtotal_amount === 'number'
  )
}

export async function requestQuote(
  items: readonly QuoteItemInput[],
  promoCode?: string,
): Promise<Quote> {
  const response = await apiClient.api.v1.bookings.quote.$post({
    json: {
      items: [...items],
      addons: [],
      ...(promoCode ? { promo_code: promoCode } : {}),
    },
  })
  return parseData(await response.json(), isQuote)
}

/** `422 PRICE_RULE_NOT_FOUND` — slot yang tidak tercakup aturan harga mana pun (E-11). */
export function isPriceRuleMissing(error: unknown): boolean {
  return error instanceof HolaApiError && error.code === ERROR_CODE.PRICE_RULE_NOT_FOUND
}

export interface SlotPrice {
  courtId: string
  error: string | null
  priceRuleId: string | null
  rateClass: string | null
  startsAt: string
  unitPriceAmount: number | null
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function toSlotPrices(quote: Quote, requested: readonly QuoteItemInput[]): SlotPrice[] {
  const bySlot = new Map(
    quote.lines
      .filter((line) => line.type === 'slot' && line.starts_at)
      .map((line) => [new Date(line.starts_at ?? '').toISOString(), line]),
  )
  return requested.map((item) => {
    const line = bySlot.get(new Date(item.starts_at).toISOString())
    return {
      courtId: item.court_id,
      startsAt: item.starts_at,
      rateClass: line?.rate_class ?? null,
      unitPriceAmount: line?.unit_price_amount ?? null,
      priceRuleId: line?.price_rule_id ?? null,
      error: line ? null : 'Slot tidak muncul di rincian harga.',
    }
  })
}

function failedSlot(item: QuoteItemInput, error: unknown): SlotPrice {
  return {
    courtId: item.court_id,
    startsAt: item.starts_at,
    rateClass: null,
    unitPriceAmount: null,
    priceRuleId: null,
    error: isPriceRuleMissing(error)
      ? 'Tidak ada aturan harga yang cocok.'
      : error instanceof HolaApiError
        ? error.message
        : 'Gagal menghitung harga slot ini.',
  }
}

/**
 * Harga tiap slot sepanjang satu hari, sekaligus audit cakupan aturan harga.
 *
 * Dikirim per-8 slot karena satu slot tanpa aturan harga menggagalkan SELURUH
 * quote dengan `PRICE_RULE_NOT_FOUND` — tanpa memberi tahu slot mana. Batch
 * yang gagal karena itu diulang satu per satu supaya slot yang bermasalah bisa
 * ditunjuk dengan tepat; hari yang sehat tetap selesai dalam dua-tiga request.
 */
export async function priceSlots(items: readonly QuoteItemInput[]): Promise<SlotPrice[]> {
  const results: SlotPrice[] = []
  for (const batch of chunk(items, MAX_QUOTE_ITEMS)) {
    try {
      results.push(...toSlotPrices(await requestQuote(batch), batch))
    } catch (batchError) {
      if (!isPriceRuleMissing(batchError)) {
        results.push(...batch.map((item) => failedSlot(item, batchError)))
        continue
      }
      for (const item of batch) {
        try {
          results.push(...toSlotPrices(await requestQuote([item]), [item]))
        } catch (slotError) {
          results.push(failedSlot(item, slotError))
        }
      }
    }
  }
  return results
}
