'use client'

import { resetPasswordSchema } from '@hola/shared'
import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formErrorMessage, validationErrorMessage } from './auth-form.ts'

export function ResetPasswordForm(): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [])

  const submit = async (formData: FormData): Promise<void> => {
    const password = formData.get('password')
    const parsed = resetPasswordSchema.safeParse({
      token,
      password: typeof password === 'string' ? password : '',
    })
    if (!parsed.success) {
      setError(validationErrorMessage(parsed.error.issues))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.api.v1.auth.password.reset.$post({ json: parsed.data })
      setSuccess('Password sudah diperbarui. Silakan masuk kembali.')
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
        <span>Password baru</span>
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button type="submit" disabled={isSubmitting || token.length === 0}>
        {isSubmitting ? 'Memperbarui…' : 'Atur password baru'}
      </button>
      {!token ? <p className="form-error">Tautan reset tidak memiliki token yang valid.</p> : null}
      <div className="form-links">
        <Link href="/login">Kembali ke masuk</Link>
      </div>
    </form>
  )
}
