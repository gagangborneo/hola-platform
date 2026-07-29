'use client'

import { registerSchema } from '@hola/shared'
import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formErrorMessage, validationErrorMessage } from './auth-form.ts'

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function RegisterForm(): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (formData: FormData): Promise<void> => {
    const email = formValue(formData, 'email')
    const phone = formValue(formData, 'phone')
    const parsed = registerSchema.safeParse({
      email: email || undefined,
      phone: phone || undefined,
      password: formValue(formData, 'password'),
      full_name: formValue(formData, 'full_name'),
    })
    if (!parsed.success) {
      setError(validationErrorMessage(parsed.error.issues))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.api.v1.auth.register.$post({ json: parsed.data })
      setSuccess('Cek email Anda untuk melanjutkan, lalu masuk ke akun Hola.')
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
        <span>Nama lengkap</span>
        <input name="full_name" autoComplete="name" required />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" />
      </label>
      <label className="field">
        <span>Nomor HP (+62…)</span>
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Mendaftarkan…' : 'Daftar'}
      </button>
      <div className="form-links">
        <Link href="/login">Sudah punya akun? Masuk</Link>
      </div>
    </form>
  )
}
