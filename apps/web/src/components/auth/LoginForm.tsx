'use client'

import { loginSchema } from '@hola/shared'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { authStore } from '../../lib/auth.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
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
      const next = new URLSearchParams(globalThis.location.search).get('next')
      router.replace(next?.startsWith('/') ? next : '/')
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
        <Label htmlFor="identifier">Email atau nomor HP</Label>
        <Input id="identifier" name="identifier" autoComplete="username" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Memproses…' : 'Masuk'}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/lupa-password">
          Lupa password?
        </Link>
        <Link className="font-semibold text-primary hover:underline" href="/daftar">
          Belum punya akun? Daftar
        </Link>
      </div>
    </form>
  )
}
