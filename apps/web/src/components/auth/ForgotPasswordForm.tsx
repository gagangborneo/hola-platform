'use client'

import { forgotPasswordSchema } from '@hola/shared'
import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
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
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email akun</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-accent/20 p-3 leading-snug text-accent-foreground">{success}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Mengirim…' : 'Kirim instruksi'}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Kembali ke masuk
        </Link>
      </div>
    </form>
  )
}
