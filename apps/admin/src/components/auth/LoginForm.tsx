'use client'

import { loginSchema } from '@hola/shared'
import { Button, Field, Input } from '@hola/ui'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { authStore } from '../../lib/auth.ts'
import { isAdminSessionPayload } from '../../lib/auth-store.ts'
import { formErrorMessage } from '../common/form-error.ts'

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function LoginForm(): ReactNode {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (formData: FormData): Promise<void> => {
    const parsed = loginSchema.safeParse({
      identifier: formValue(formData, 'identifier'),
      password: formValue(formData, 'password'),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Data formulir belum valid.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.api.v1.auth.login.$post({ json: parsed.data })
      const body: unknown = await response.json()
      if (!isAdminSessionPayload(body)) {
        authStore.clearAccessToken()
        setError('Akun customer memakai portal pelanggan, bukan back-office.')
        return
      }
      authStore.setSession(body.data)
      router.replace('/dashboard')
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void submit(new FormData(event.currentTarget))
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <Field label="Email atau nomor HP" required>
        {({ id }) => <Input autoComplete="username" id={id} name="identifier" required />}
      </Field>
      <Field label="Password" required>
        {({ id }) => (
          <Input autoComplete="current-password" id={id} name="password" required type="password" />
        )}
      </Field>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed text-destructive">
          {error}
        </p>
      ) : null}
      <Button disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? 'Memproses…' : 'Masuk ke back-office'}
      </Button>
    </form>
  )
}
