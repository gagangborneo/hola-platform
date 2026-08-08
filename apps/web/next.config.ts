import { execFileSync } from 'node:child_process'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import { createSecurityHeaders } from './src/lib/security-headers.ts'

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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.hola.id' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
    ],
  },
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: release,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: createSecurityHeaders({
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          isDevelopment: process.env.NODE_ENV === 'development',
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          midtransIsProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true',
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
