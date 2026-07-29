'use client'

import type { UserRole, UserStatus } from '@hola/shared'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import {
  DataTable,
  type TableColumn,
  type TableQuery,
} from '../../../components/table/DataTable.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { isRecord, parseOffsetList } from '../../../lib/api-response.ts'

interface AdminUser {
  createdAt: string
  email: string | null
  fullName: string
  id: string
  role: UserRole
  status: UserStatus
}

interface AdminUserResponse {
  created_at: string
  email: string | null
  full_name: string
  id: string
  role: UserRole
  status: UserStatus
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'customer' || value === 'admin' || value === 'staff' || value === 'tenant'
}

function isUserStatus(value: unknown): value is UserStatus {
  return value === 'active' || value === 'suspended' || value === 'deleted'
}

function isAdminUser(value: unknown): value is AdminUserResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.full_name === 'string' &&
    (typeof value.email === 'string' || value.email === null) &&
    isUserRole(value.role) &&
    isUserStatus(value.status) &&
    typeof value.created_at === 'string'
  )
}

function normalizeUser(value: AdminUserResponse): AdminUser {
  return {
    id: value.id,
    fullName: value.full_name,
    email: value.email,
    role: value.role,
    status: value.status,
    createdAt: value.created_at,
  }
}

function parseRole(value: string | undefined): UserRole | undefined {
  return isUserRole(value) ? value : undefined
}

function parseStatus(value: string | undefined): UserStatus | undefined {
  return isUserStatus(value) ? value : undefined
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

const columns: ReadonlyArray<TableColumn<AdminUser>> = [
  { key: 'full_name', header: 'Pengguna', render: (user) => user.fullName },
  { key: 'email', header: 'Email', render: (user) => user.email ?? '—' },
  {
    key: 'role',
    header: 'Peran',
    render: (user) => <span className="status-chip">{user.role}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (user) => <span className="status-chip">{user.status}</span>,
  },
  { key: 'created_at', header: 'Dibuat', render: (user) => formatDate(user.createdAt) },
]

function UsersTable(): ReactNode {
  const [tableQuery, setTableQuery] = useState<TableQuery>({
    page: 1,
    perPage: 25,
    q: '',
    sort: '',
    filters: {},
  })
  const query = useQuery({
    queryKey: ['admin-users', tableQuery],
    queryFn: async () => {
      const role = parseRole(tableQuery.filters.role)
      const status = parseStatus(tableQuery.filters.status)
      const response = await apiClient.api.v1.admin.users.$get({
        query: {
          page: String(tableQuery.page),
          per_page: String(tableQuery.perPage),
          ...(tableQuery.q ? { q: tableQuery.q } : {}),
          ...(role ? { role } : {}),
          ...(status ? { status } : {}),
        },
      })
      const body: unknown = await response.json()
      const list = parseOffsetList(body, isAdminUser)
      return { ...list, data: list.data.map(normalizeUser) }
    },
  })

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      emptyMessage="Tidak ada pengguna yang sesuai."
      error={query.error ? new Error(formErrorMessage(query.error)) : null}
      filters={[
        {
          key: 'role',
          label: 'Peran',
          options: [
            { value: 'admin', label: 'Admin' },
            { value: 'staff', label: 'Staff' },
            { value: 'tenant', label: 'Tenant' },
            { value: 'customer', label: 'Customer' },
          ],
        },
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Aktif' },
            { value: 'suspended', label: 'Ditangguhkan' },
            { value: 'deleted', label: 'Dihapus' },
          ],
        },
      ]}
      getRowKey={(user) => user.id}
      isLoading={query.isLoading}
      onQueryChange={setTableQuery}
      onRetry={() => void query.refetch()}
      pagination={query.data?.pagination}
      query={tableQuery}
      searchPlaceholder="Cari nama, email, atau nomor HP"
    />
  )
}

export default function UsersPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <section className="page-stack">
        <div className="page-heading">
          <p className="eyebrow">Admin</p>
          <h1>Pengguna</h1>
          <p>
            Cari dan saring akun untuk kebutuhan operasional. Perubahan akun menyusul di modul user.
          </p>
        </div>
        <UsersTable />
      </section>
    </RoleRouteGuard>
  )
}
