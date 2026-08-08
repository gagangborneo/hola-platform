'use client'

import { registerSchema } from '@hola/shared'
import Link from 'next/link'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
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
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Nomor HP (+62…)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-accent/20 p-3 leading-snug text-accent-foreground">{success}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Mendaftarkan…' : 'Daftar'}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Sudah punya akun? Masuk
        </Link>
      </div>
    </form>
  )
}
