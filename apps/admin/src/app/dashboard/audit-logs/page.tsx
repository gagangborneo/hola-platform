'use client'

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

type AuditSort =
  | 'created_at'
  | '-created_at'
  | 'action'
  | '-action'
  | 'entity_type'
  | '-entity_type'

interface AuditLog {
  action: string
  actorRole: string | null
  actorUserId: string | null
  createdAt: string
  entityId: string | null
  entityType: string
  id: string
  requestId: string | null
}

interface AuditLogResponse {
  action: string
  actor_role: string | null
  actor_user_id: string | null
  created_at: string
  entity_id: string | null
  entity_type: string
  id: string
  request_id: string | null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isAuditLog(value: unknown): value is AuditLogResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.action === 'string' &&
    typeof value.entity_type === 'string' &&
    typeof value.created_at === 'string' &&
    isNullableString(value.entity_id) &&
    isNullableString(value.actor_user_id) &&
    isNullableString(value.actor_role) &&
    isNullableString(value.request_id)
  )
}

function normalizeAuditLog(value: AuditLogResponse): AuditLog {
  return {
    id: value.id,
    action: value.action,
    entityType: value.entity_type,
    entityId: value.entity_id,
    actorUserId: value.actor_user_id,
    actorRole: value.actor_role,
    requestId: value.request_id,
    createdAt: value.created_at,
  }
}

function parseSort(value: string): AuditSort {
  if (
    value === 'created_at' ||
    value === '-created_at' ||
    value === 'action' ||
    value === '-action' ||
    value === 'entity_type' ||
    value === '-entity_type'
  )
    return value
  return '-created_at'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(value),
  )
}

const columns: ReadonlyArray<TableColumn<AuditLog>> = [
  {
    key: 'created_at',
    header: 'Waktu',
    sortable: true,
    render: (log) => formatDate(log.createdAt),
  },
  { key: 'action', header: 'Aksi', sortable: true, render: (log) => log.action },
  {
    key: 'entity_type',
    header: 'Entitas',
    sortable: true,
    render: (log) => `${log.entityType}${log.entityId ? ` · ${log.entityId}` : ''}`,
  },
  {
    key: 'actor',
    header: 'Pelaku',
    render: (log) =>
      `${log.actorRole ?? 'system'}${log.actorUserId ? ` · ${log.actorUserId}` : ''}`,
  },
  { key: 'request_id', header: 'Request', render: (log) => log.requestId ?? '—' },
]

function AuditLogTable(): ReactNode {
  const [tableQuery, setTableQuery] = useState<TableQuery>({
    page: 1,
    perPage: 25,
    q: '',
    sort: '-created_at',
    filters: {},
  })
  const query = useQuery({
    queryKey: ['admin-audit-logs', tableQuery],
    queryFn: async () => {
      const response = await apiClient.api.v1.admin['audit-logs'].$get({
        query: {
          page: String(tableQuery.page),
          per_page: String(tableQuery.perPage),
          sort: parseSort(tableQuery.sort),
          ...(tableQuery.filters.entity_type
            ? { entity_type: tableQuery.filters.entity_type }
            : {}),
          ...(tableQuery.filters.action ? { action: tableQuery.filters.action } : {}),
          ...(tableQuery.filters.entity_id ? { entity_id: tableQuery.filters.entity_id } : {}),
          ...(tableQuery.filters.actor_user_id
            ? { actor_user_id: tableQuery.filters.actor_user_id }
            : {}),
        },
      })
      const body: unknown = await response.json()
      const list = parseOffsetList(body, isAuditLog)
      return { ...list, data: list.data.map(normalizeAuditLog) }
    },
  })

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      emptyMessage="Belum ada audit log yang sesuai dengan filter."
      error={query.error ? new Error(formErrorMessage(query.error)) : null}
      filters={[
        { key: 'entity_type', label: 'Jenis entitas', placeholder: 'Contoh: app_setting' },
        { key: 'entity_id', label: 'ID entitas' },
        { key: 'action', label: 'Aksi', placeholder: 'Contoh: admin.setting_update' },
        { key: 'actor_user_id', label: 'ID pelaku' },
      ]}
      getRowKey={(log) => log.id}
      isLoading={query.isLoading}
      onQueryChange={setTableQuery}
      onRetry={() => void query.refetch()}
      pagination={query.data?.pagination}
      query={tableQuery}
    />
  )
}

export default function AuditLogsPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <section className="page-stack">
        <div className="page-heading">
          <p className="eyebrow">Admin</p>
          <h1>Audit log</h1>
          <p>Jejak ini bersifat append-only. Gunakan filter dan sort untuk menelusuri perubahan.</p>
        </div>
        <AuditLogTable />
      </section>
    </RoleRouteGuard>
  )
}
