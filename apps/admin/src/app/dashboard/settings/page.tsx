'use client'

import {
  type AdminUpdateSettingInput,
  adminUpdateSettingSchema,
  SETTINGS_KEY,
  type SettingsKey,
} from '@hola/shared'
import { Button, Textarea } from '@hola/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { isRecord, parseData, parseDataArray } from '../../../lib/api-response.ts'

interface AdminSetting {
  description: string | null
  key: SettingsKey
  updatedAt: string
  value: unknown
}

interface AdminSettingResponse {
  description: string | null
  key: string
  updated_at: string
  value: unknown
}

function isSettingsKey(value: unknown): value is SettingsKey {
  return Object.values(SETTINGS_KEY).some((key) => key === value)
}

function isAdminSetting(value: unknown): value is AdminSettingResponse {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.updated_at === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    'value' in value
  )
}

function normalizeSetting(value: AdminSettingResponse): AdminSetting {
  if (!isSettingsKey(value.key))
    throw new Error('API mengembalikan kunci setting yang tidak dikenali.')
  return {
    key: value.key,
    value: value.value,
    description: value.description,
    updatedAt: value.updated_at,
  }
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

function SettingsPanel(): ReactNode {
  const queryClient = useQueryClient()
  const [editingKey, setEditingKey] = useState<SettingsKey | null>(null)
  const [jsonValue, setJsonValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await apiClient.api.v1.admin.settings.$get()
      const body: unknown = await response.json()
      return parseDataArray(body, isAdminSetting).map(normalizeSetting)
    },
  })
  const update = useMutation({
    mutationFn: async (input: {
      key: SettingsKey
      value: AdminUpdateSettingInput['value']
    }): Promise<AdminSetting> => {
      const response = await apiClient.api.v1.admin.settings[':key'].$put({
        param: { key: input.key },
        json: { value: input.value },
      })
      const body: unknown = await response.json()
      return normalizeSetting(parseData(body, isAdminSetting))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
  })

  const beginEdit = (setting: AdminSetting): void => {
    setEditingKey(setting.key)
    setJsonValue(formatJson(setting.value))
    setEditError(null)
  }

  const submitEdit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!editingKey) return
    let value: unknown
    try {
      value = JSON.parse(jsonValue)
    } catch {
      setEditError('Nilai harus berupa JSON yang valid.')
      return
    }
    const parsed = adminUpdateSettingSchema.safeParse({ value })
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? 'Nilai JSON belum valid.')
      return
    }
    setEditError(null)
    try {
      await update.mutateAsync({ key: editingKey, value: parsed.data.value })
      setEditingKey(null)
    } catch (error) {
      setEditError(formErrorMessage(error))
    }
  }

  if (query.isLoading) return <p className="table-state">Memuat pengaturan…</p>
  if (query.error) {
    return (
      <div className="table-state table-error" role="alert">
        <p>{formErrorMessage(query.error)}</p>
        <Button onClick={() => void query.refetch()}>Coba lagi</Button>
      </div>
    )
  }
  if (!query.data || query.data.length === 0) {
    return (
      <p className="table-state">
        Belum ada app setting. Setting kanonik dapat dibuat dari endpoint ini.
      </p>
    )
  }

  return (
    <div className="settings-list">
      {query.data.map((setting) => (
        <article className="setting-card" key={setting.key}>
          <div className="setting-card-heading">
            <div>
              <h2>{setting.key}</h2>
              <p>{setting.description ?? 'Tidak ada deskripsi.'}</p>
              <small>Terakhir diperbarui {formatDate(setting.updatedAt)}</small>
            </div>
            <Button onClick={() => beginEdit(setting)} variant="secondary">
              Ubah JSON
            </Button>
          </div>
          {editingKey === setting.key ? (
            <form className="setting-editor" onSubmit={(event) => void submitEdit(event)}>
              <label className="field">
                <span>Nilai JSON</span>
                <Textarea
                  value={jsonValue}
                  onChange={(event) => setJsonValue(event.target.value)}
                />
              </label>
              {editError ? <p className="form-error">{editError}</p> : null}
              <div className="form-actions">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Menyimpan…' : 'Simpan'}
                </Button>
                <Button
                  onClick={() => setEditingKey(null)}
                  disabled={update.isPending}
                  variant="secondary"
                >
                  Batal
                </Button>
              </div>
            </form>
          ) : (
            <pre>{formatJson(setting.value)}</pre>
          )}
        </article>
      ))}
    </div>
  )
}

export default function SettingsPage(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <section className="page-stack">
        <div className="page-heading">
          <p className="eyebrow">Admin</p>
          <h1>Pengaturan aplikasi</h1>
          <p>Nilai disimpan sebagai JSON dan setiap perubahan masuk ke audit log.</p>
        </div>
        <SettingsPanel />
      </section>
    </RoleRouteGuard>
  )
}
