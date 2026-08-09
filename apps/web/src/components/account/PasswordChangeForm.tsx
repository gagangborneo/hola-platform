'use client'

import { changePasswordSchema } from '@hola/shared'
import { Button, Input, Label } from '@hola/ui'
import { useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { authStore, useAuthSession } from '../../lib/auth.ts'
import { AUTH_SESSIONS_QUERY_KEY } from '../../lib/auth-sessions.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { validationErrorMessage } from '../auth/auth-form.ts'

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/**
 * Ganti password (`POST /auth/password/change`).
 *
 * Server menaikkan `token_version` dan mencabut SELURUH refresh token, lalu
 * membalas sesi baru. Token itu WAJIB langsung dipasang ke store: tanpa itu,
 * access token yang masih dipegang tab ini sudah tidak sah dan pengguna
 * terlempar ke halaman login tepat setelah berhasil mengganti passwordnya.
 */
export function PasswordChangeForm(): ReactNode {
  const session = useAuthSession()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (form: HTMLFormElement): Promise<void> => {
    const formData = new FormData(form)
    const confirmation = formValue(formData, 'confirm_password')
    const parsed = changePasswordSchema.safeParse({
      current_password: formValue(formData, 'current_password'),
      new_password: formValue(formData, 'new_password'),
    })
    if (!parsed.success) {
      setNotice(null)
      setError(validationErrorMessage(parsed.error.issues))
      return
    }
    if (parsed.data.new_password !== confirmation) {
      setNotice(null)
      setError('Konfirmasi password tidak sama dengan password baru.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.api.v1.auth.password.change.$post({ json: parsed.data })
      const body = await response.json()
      // Respons `/password/change` tidak menyertakan `user` — identitas yang
      // sudah ada dipertahankan supaya header dan sidebar tidak kehilangan nama
      // pemilik sesi hanya karena passwordnya berganti.
      authStore.setSession({ accessToken: body.data.access_token, user: session.user })
      form.reset()
      setNotice('Password berhasil diubah. Perangkat lain otomatis dikeluarkan.')
      // Seluruh refresh token dicabut server; daftar perangkat di layar yang
      // sama sudah tidak menggambarkan keadaan sebenarnya.
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY })
    } catch (submissionError) {
      setNotice(null)
      setError(displayErrorMessage(submissionError, 'Password gagal diubah. Coba lagi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void submit(event.currentTarget)
  }

  return (
    <form className="rounded-xl border bg-card p-5 sm:p-6" onSubmit={onSubmit} noValidate>
      <h2 className="font-display text-lg font-bold text-foreground">Ganti password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Demi keamanan, mengganti password otomatis mengeluarkan semua perangkat lain yang masih
        masuk.
      </p>

      <div className="mt-5 grid gap-4 sm:max-w-md">
        <div className="grid gap-1.5">
          <Label htmlFor="current_password">Password saat ini</Label>
          <Input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new_password">Password baru</Label>
          <Input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm_password">Ulangi password baru</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-4 font-semibold text-primary">{notice}</p> : null}

      <Button className="mt-5" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan…' : 'Ganti password'}
      </Button>
    </form>
  )
}
