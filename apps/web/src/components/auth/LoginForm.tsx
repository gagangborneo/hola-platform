'use client'

import { loginSchema } from '@hola/shared'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { authStore } from '../../lib/auth.ts'
import { formErrorMessage, validationErrorMessage } from './auth-form.ts'
import { isAuthSessionPayload } from './auth-response.ts'

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
      setError(validationErrorMessage(parsed.error.issues))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.api.v1.auth.login.$post({ json: parsed.data })
      const body: unknown = await response.json()
      if (!isAuthSessionPayload(body)) throw new Error('Respons login tidak dapat diproses.')
      authStore.setAccessToken(body.data.access_token)
      router.replace('/')
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
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label className="field">
        <span>Email atau nomor HP</span>
        <input name="identifier" autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Memproses…' : 'Masuk'}
      </button>
      <div className="form-links">
        <Link href="/lupa-password">Lupa password?</Link>
        <Link href="/daftar">Belum punya akun? Daftar</Link>
      </div>
    </form>
  )
}
