/**
 * Pengambilan seluruh halaman untuk agregasi.
 *
 * Tabel cukup memuat satu halaman, tetapi grafik tidak: menjumlahkan 100 baris
 * pertama lalu menyebutnya "total periode" akan salah tanpa terlihat salah.
 * Karena `per_page` dibatasi 100 oleh kontrak API, halaman diambil berurutan
 * sampai habis — dengan batas atas supaya rentang yang keliru lebar tidak
 * berubah jadi ratusan request.
 */
import type { OffsetListResponse } from './api-response.ts'

/** 20 halaman × 100 baris. Di atas ini rentangnya terlalu lebar untuk satu layar. */
const MAX_PAGES = 20

export interface PagedResult<Item> {
  readonly items: Item[]
  /**
   * `true` bila batas halaman tercapai sebelum data habis. Pemanggil WAJIB
   * menampilkannya — angka yang tidak lengkap harus terbaca tidak lengkap.
   */
  readonly isTruncated: boolean
  readonly totalCount: number | null
}

export async function fetchAllPages<Item>(
  fetchPage: (page: number) => Promise<OffsetListResponse<Item>>,
  maxPages: number = MAX_PAGES,
): Promise<PagedResult<Item>> {
  const items: Item[] = []
  let totalCount: number | null = null
  let page = 1

  while (page <= maxPages) {
    const result = await fetchPage(page)
    items.push(...result.data)
    totalCount = result.pagination.totalCount

    const { totalPages, perPage } = result.pagination
    const isLastPage = result.data.length < perPage || (totalPages !== null && page >= totalPages)
    if (isLastPage) return { isTruncated: false, items, totalCount }
    page += 1
  }

  return { isTruncated: true, items, totalCount }
}
