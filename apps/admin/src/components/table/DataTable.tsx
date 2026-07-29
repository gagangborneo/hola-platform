'use client'

import type { ReactNode } from 'react'

export interface TablePagination {
  page: number
  perPage: number
  totalCount: number | null
  totalPages: number | null
}

export interface TableQuery {
  filters: Record<string, string>
  page: number
  perPage: number
  q: string
  sort: string
}

export interface TableColumn<Row> {
  header: string
  key: string
  render: (row: Row) => ReactNode
  sortable?: boolean
}

export interface TableFilter {
  key: string
  label: string
  options?: ReadonlyArray<{ label: string; value: string }>
  placeholder?: string
}

interface DataTableProps<Row> {
  columns: ReadonlyArray<TableColumn<Row>>
  data: ReadonlyArray<Row>
  emptyMessage: string
  error: Error | null
  filters?: ReadonlyArray<TableFilter>
  getRowKey: (row: Row) => string
  isLoading: boolean
  onQueryChange: (next: TableQuery) => void
  onRetry: () => void
  pagination: TablePagination | undefined
  query: TableQuery
  searchPlaceholder?: string
}

function nextSort(currentSort: string, key: string): string {
  if (currentSort === key) return `-${key}`
  if (currentSort === `-${key}`) return key
  return key
}

/**
 * Tabel back-office generik: q, filter, sort, offset pagination, serta state
 * loading/kosong/error berada pada satu komponen supaya modul tidak drift.
 */
export function DataTable<Row>({
  columns,
  data,
  emptyMessage,
  error,
  filters,
  getRowKey,
  isLoading,
  onQueryChange,
  onRetry,
  pagination,
  query,
  searchPlaceholder,
}: DataTableProps<Row>): ReactNode {
  const update = (patch: Partial<TableQuery>, resetPage = true): void => {
    onQueryChange({ ...query, ...patch, page: resetPage ? 1 : (patch.page ?? query.page) })
  }

  const totalLabel =
    pagination?.totalCount === null || pagination?.totalCount === undefined
      ? `Halaman ${query.page}`
      : `${pagination.totalCount} hasil`

  return (
    <section className="data-table-shell" aria-label="Tabel data">
      <div className="table-controls">
        {searchPlaceholder ? (
          <label className="table-search">
            <span className="sr-only">Pencarian</span>
            <input
              value={query.q}
              placeholder={searchPlaceholder}
              onChange={(event) => update({ q: event.target.value })}
            />
          </label>
        ) : null}
        {filters?.map((filter) => {
          const value = query.filters[filter.key] ?? ''
          const controlId = `table-filter-${filter.key}`
          return (
            <label className="table-filter" htmlFor={controlId} key={filter.key}>
              <span>{filter.label}</span>
              {filter.options ? (
                <select
                  id={controlId}
                  value={value}
                  onChange={(event) =>
                    update({
                      filters: { ...query.filters, [filter.key]: event.target.value },
                    })
                  }
                >
                  <option value="">Semua</option>
                  {filter.options.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={controlId}
                  value={value}
                  placeholder={filter.placeholder ?? filter.label}
                  onChange={(event) =>
                    update({
                      filters: { ...query.filters, [filter.key]: event.target.value },
                    })
                  }
                />
              )}
            </label>
          )
        })}
      </div>

      {error ? (
        <div className="table-state table-error" role="alert">
          <p>{error.message}</p>
          <button type="button" onClick={onRetry}>
            Coba lagi
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = query.sort === column.key || query.sort === `-${column.key}`
                  const direction = query.sort === `-${column.key}` ? 'menurun' : 'menaik'
                  return (
                    <th scope="col" key={column.key}>
                      {column.sortable ? (
                        <button
                          className="sort-button"
                          type="button"
                          onClick={() => update({ sort: nextSort(query.sort, column.key) })}
                        >
                          {column.header}
                          <span aria-hidden="true">
                            {active ? (direction === 'menurun' ? ' ↓' : ' ↑') : ' ↕'}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="table-state" colSpan={columns.length}>
                    Memuat data…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan={columns.length}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={getRowKey(row)}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer className="table-pagination">
        <span>{totalLabel}</span>
        <label>
          <span className="sr-only">Baris per halaman</span>
          <select
            value={query.perPage}
            onChange={(event) => update({ perPage: Number(event.target.value) })}
          >
            {[25, 50, 100].map((size) => (
              <option value={size} key={size}>
                {size}/halaman
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => update({ page: Math.max(1, query.page - 1) }, false)}
          disabled={isLoading || query.page <= 1}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => update({ page: query.page + 1 }, false)}
          disabled={
            isLoading ||
            (pagination?.totalPages !== null &&
              pagination?.totalPages !== undefined &&
              query.page >= pagination.totalPages)
          }
        >
          Berikutnya
        </button>
      </footer>
    </section>
  )
}
