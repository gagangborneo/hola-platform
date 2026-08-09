'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import {
  DataTable,
  type TableColumn,
  type TableQuery,
} from '../../../components/table/DataTable.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { isRecord, parseOffsetList } from '../../../lib/api-response.ts'
import { formatShortDateWita } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'

export interface Customer {
  createdAt: string
  email: string | null
  fullName: string
  id: string
  phone: string | null
  status: string
}

interface CustomerResponse {
  created_at: string
  email: string | null
  full_name: string
  id: string
  phone?: string | null
  status: string
}

function isCustomerResponse(value: unknown): value is CustomerResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.full_name === 'string' &&
    typeof value.status === 'string' &&
    typeof value.created_at === 'string' &&
    (typeof value.email === 'string' || value.email === null)
  )
}

function normalizeCustomer(value: CustomerResponse): Customer {
  return {
    id: value.id,
    fullName: value.full_name,
    email: value.email,
    phone: typeof value.phone === 'string' ? value.phone : null,
    status: value.status,
    createdAt: value.created_at,
  }
}

const columns: ReadonlyArray<TableColumn<Customer>> = [
  {
    key: 'full_name',
    header: 'Customer',
    render: (customer) => (
      <Link href={`/dashboard/customers/${customer.id}`}>{customer.fullName}</Link>
    ),
  },
  { key: 'email', header: 'Email', render: (customer) => customer.email ?? '—' },
  { key: 'phone', header: 'Nomor HP', render: (customer) => customer.phone ?? '—' },
  {
    key: 'status',
    header: 'Status',
    render: (customer) => <StatusChip {...labels.userStatus(customer.status)} />,
  },
  {
    key: 'created_at',
    header: 'Terdaftar',
    render: (customer) => formatShortDateWita(customer.createdAt),
  },
]

function CustomersTable(): ReactNode {
  const [tableQuery, setTableQuery] = useState<TableQuery>({
    page: 1,
    perPage: 25,
    q: '',
    sort: '',
    filters: {},
  })

  const query = useQuery({
    queryKey: ['admin-customers', tableQuery],
    queryFn: async () => {
      const response = await apiClient.api.v1.admin.users.$get({
        query: {
          role: 'customer',
          page: String(tableQuery.page),
          per_page: String(tableQuery.perPage),
          ...(tableQuery.q ? { q: tableQuery.q } : {}),
        },
      })
      const list = parseOffsetList(await response.json(), isCustomerResponse)
      return { ...list, data: list.data.map(normalizeCustomer) }
    },
  })

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      emptyMessage="Tidak ada customer yang cocok."
      error={query.error ? new Error(formErrorMessage(query.error)) : null}
      getRowKey={(customer) => customer.id}
      isLoading={query.isLoading}
      onQueryChange={setTableQuery}
      onRetry={() => void query.refetch()}
      pagination={query.data?.pagination}
      query={tableQuery}
      searchPlaceholder="Cari nama, email, atau nomor HP"
    />
  )
}

function CustomersPage(): ReactNode {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Customer</h1>
        <p>
          Daftar akun customer dan riwayat bookingnya. Ini pendahulu CRM Phase 2 — cukup untuk
          menjawab pertanyaan di meja depan hari ini.
        </p>
      </div>
      <CustomersTable />
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <CustomersPage />
    </RoleRouteGuard>
  )
}
