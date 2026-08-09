'use client'

import { verifyEmailSchema } from '@hola/shared'
import { Button } from '@hola/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formErrorMessage, validationErrorMessage } from './auth-form.ts'

export function VerifyEmailForm(): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [])

  const submit = async (): Promise<void> => {
    const parsed = verifyEmailSchema.safeParse({ token })
    if (!parsed.success) {
      setError(validationErrorMessage(parsed.error.issues))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.api.v1.auth.email.verify.$post({ json: parsed.data })
      setSuccess('Email Anda sudah terverifikasi.')
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onClick = (): void => {
    void submit()
  }

  return (
    <div className="mt-6 grid gap-4">
      <p>Konfirmasi alamat email Anda untuk menerima e-receipt dan memakai pemulihan password.</p>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-accent/20 p-3 leading-snug text-accent-foreground">{success}</p>
      ) : null}
      <Button type="button" onClick={onClick} disabled={isSubmitting || token.length === 0}>
        {isSubmitting ? 'Memverifikasi…' : 'Verifikasi email'}
      </Button>
      {!token ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          Tautan verifikasi tidak memiliki token yang valid.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Kembali ke masuk
        </Link>
      </div>
    </div>
  )
}
