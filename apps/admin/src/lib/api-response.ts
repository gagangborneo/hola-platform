import type { TablePagination } from '../components/table/DataTable.tsx'

export interface OffsetListResponse<Item> {
  data: Item[]
  pagination: TablePagination
}

interface OffsetPaginationResponse {
  mode: 'offset'
  page: number
  per_page: number
  total_count: number | null
  total_pages: number | null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOffsetPagination(value: unknown): value is OffsetPaginationResponse {
  return (
    isRecord(value) &&
    value.mode === 'offset' &&
    typeof value.page === 'number' &&
    typeof value.per_page === 'number' &&
    (typeof value.total_count === 'number' || value.total_count === null) &&
    (typeof value.total_pages === 'number' || value.total_pages === null)
  )
}

/** Memvalidasi envelope sebelum data dari API dipakai oleh tabel generik. */
export function parseOffsetList<Item>(
  value: unknown,
  isItem: (item: unknown) => item is Item,
): OffsetListResponse<Item> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !value.data.every(isItem) ||
    !isRecord(value.meta) ||
    !isOffsetPagination(value.meta.pagination)
  ) {
    throw new Error('Respons daftar dari API tidak dapat diproses.')
  }
  return {
    data: value.data,
    pagination: {
      page: value.meta.pagination.page,
      perPage: value.meta.pagination.per_page,
      totalCount: value.meta.pagination.total_count,
      totalPages: value.meta.pagination.total_pages,
    },
  }
}

export function parseDataArray<Item>(
  value: unknown,
  isItem: (item: unknown) => item is Item,
): Item[] {
  if (!isRecord(value) || !Array.isArray(value.data) || !value.data.every(isItem)) {
    throw new Error('Respons daftar dari API tidak dapat diproses.')
  }
  return value.data
}

export function parseData<Item>(value: unknown, isItem: (item: unknown) => item is Item): Item {
  if (!isRecord(value) || !isItem(value.data)) {
    throw new Error('Respons dari API tidak dapat diproses.')
  }
  return value.data
}
