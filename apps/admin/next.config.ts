import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import { createSecurityHeaders } from './src/lib/security-headers.ts'

/**
 * Versi dibaca dari package.json saat build, bukan ditulis ulang di kode:
 * satu angka yang harus dinaikkan di dua tempat pasti akan berbeda suatu saat.
 */
function appVersion(): string {
  try {
    const raw = readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      const { version } = parsed as { version: unknown }
      if (typeof version === 'string') return version
    }
  } catch {
    // Build tetap harus jalan walau package.json tidak terbaca.
  }
  return '0.0.0'
}

function gitSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'development'
  }
}

const release = gitSha()
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT

if (sentryAuthToken && (!sentryOrg || !sentryProject)) {
  throw new Error('SENTRY_ORG dan SENTRY_PROJECT wajib diisi saat SENTRY_AUTH_TOKEN tersedia.')
}

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Monorepo memakai TypeScript 7; Next 16 perlu mode CLI sampai compiler API tersedia lagi.
    useTypeScriptCli: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: release,
    NEXT_PUBLIC_APP_VERSION: appVersion(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: createSecurityHeaders({
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          isDevelopment: process.env.NODE_ENV === 'development',
          mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        }),
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  ...(sentryAuthToken && sentryOrg && sentryProject
    ? {
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
      }
    : {}),
  release: { name: release },
  silent: !sentryAuthToken,
  telemetry: false,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  widenClientFileUpload: true,
})
