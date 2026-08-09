'use client'

import { resetPasswordSchema } from '@hola/shared'
import { Button, Input, Label } from '@hola/ui'
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
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password baru</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-accent/20 p-3 leading-snug text-accent-foreground">{success}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || token.length === 0}>
        {isSubmitting ? 'Memperbarui…' : 'Atur password baru'}
      </Button>
      {!token ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          Tautan reset tidak memiliki token yang valid.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Kembali ke masuk
        </Link>
      </div>
    </form>
  )
}
