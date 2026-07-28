/** Adapter mail tanpa ketergantungan domain auth/notification. */
import nodemailer from 'nodemailer'
import type { Logger } from '../config/logger.ts'
import type { Env } from '../env.ts'

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface MailAdapter {
  send(message: EmailMessage): Promise<void>
}

function smtpAdapter(
  env: Pick<Env, 'MAIL_FROM' | 'SMTP_HOST' | 'SMTP_PASS' | 'SMTP_PORT' | 'SMTP_USER'>,
): MailAdapter {
  if (!env.SMTP_HOST || !env.SMTP_PORT)
    throw new Error('SMTP_HOST dan SMTP_PORT wajib untuk transport smtp')
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  })
  return {
    async send(message) {
      await transporter.sendMail({ from: env.MAIL_FROM, ...message })
    },
  }
}

function resendAdapter(env: Pick<Env, 'MAIL_FROM' | 'RESEND_API_KEY'>): MailAdapter {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY wajib untuk transport resend')
  return {
    async send(message) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: env.MAIL_FROM, ...message }),
      })
      if (!response.ok) throw new Error(`Resend menolak email dengan status ${response.status}`)
    },
  }
}

function consoleAdapter(logger: Logger): MailAdapter {
  return {
    async send(message) {
      // Isi mengandung token reset/verifikasi, maka tidak pernah dicetak bahkan
      // pada local. Hanya metadata aman yang dapat dilacak.
      logger.info({ to: message.to, subject: message.subject }, 'email console diterima')
    },
  }
}

export function createMailAdapter(env: Env, logger: Logger): MailAdapter {
  switch (env.MAIL_TRANSPORT) {
    case 'resend':
      return resendAdapter(env)
    case 'smtp':
      return smtpAdapter(env)
    case 'console':
      return consoleAdapter(logger)
  }
}
