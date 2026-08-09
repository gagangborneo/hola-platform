'use client'

import { Button, Input, SelectField } from '@hola/ui'
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
      <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
        {searchPlaceholder ? (
          <label className="min-w-64 flex-1">
            <span className="sr-only">Pencarian</span>
            <Input
              onChange={(event) => update({ q: event.target.value })}
              placeholder={searchPlaceholder}
              type="search"
              value={query.q}
            />
          </label>
        ) : null}
        {filters?.map((filter) => {
          const value = query.filters[filter.key] ?? ''
          const controlId = `table-filter-${filter.key}`
          const onFilterChange = (next: string): void =>
            update({ filters: { ...query.filters, [filter.key]: next } })

          return filter.options ? (
            <SelectField
              className="min-w-40"
              id={controlId}
              key={filter.key}
              label={filter.label}
              onChange={onFilterChange}
              options={[{ label: 'Semua', value: '' }, ...filter.options]}
              triggerClassName="h-10"
              value={value}
            />
          ) : (
            <div className="grid min-w-40 gap-1.5" key={filter.key}>
              <label className="text-sm font-semibold text-foreground" htmlFor={controlId}>
                {filter.label}
              </label>
              <Input
                id={controlId}
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder={filter.placeholder ?? filter.label}
                value={value}
              />
            </div>
          )
        })}
      </div>

      {error ? (
        <div className="table-state table-error" role="alert">
          <p>{error.message}</p>
          <Button onClick={onRetry} size="sm">
            Coba lagi
          </Button>
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

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border p-3">
        <span className="mr-auto text-sm text-muted-foreground">{totalLabel}</span>
        <SelectField
          className="w-36"
          label="Baris per halaman"
          labelHidden
          onChange={(next) => update({ perPage: Number(next) })}
          options={[25, 50, 100].map((size) => ({
            label: `${size}/halaman`,
            value: String(size),
          }))}
          size="sm"
          value={String(query.perPage)}
        />
        <Button
          disabled={isLoading || query.page <= 1}
          onClick={() => update({ page: Math.max(1, query.page - 1) }, false)}
          size="sm"
          variant="outline"
        >
          Sebelumnya
        </Button>
        <Button
          disabled={
            isLoading ||
            (pagination?.totalPages !== null &&
              pagination?.totalPages !== undefined &&
              query.page >= pagination.totalPages)
          }
          onClick={() => update({ page: query.page + 1 }, false)}
          size="sm"
          variant="outline"
        >
          Berikutnya
        </Button>
      </footer>
    </section>
  )
}
