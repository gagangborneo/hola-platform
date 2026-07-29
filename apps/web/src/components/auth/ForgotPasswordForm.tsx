'use client'

import { forgotPasswordSchema } from '@hola/shared'
import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formErrorMessage, validationErrorMessage } from './auth-form.ts'

export function ForgotPasswordForm(): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (formData: FormData): Promise<void> => {
    const email = formData.get('email')
    const parsed = forgotPasswordSchema.safeParse({ email: typeof email === 'string' ? email : '' })
    if (!parsed.success) {
      setError(validationErrorMessage(parsed.error.issues))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.api.v1.auth.password.forgot.$post({ json: parsed.data })
      setSuccess('Jika akun tersedia, instruksi akan dikirim ke email Anda.')
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
        <span>Email akun</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Mengirim…' : 'Kirim instruksi'}
      </button>
      <div className="form-links">
        <Link href="/login">Kembali ke masuk</Link>
      </div>
    </form>
  )
}
