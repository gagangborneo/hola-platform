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

/**
 * Origin media diturunkan dari NEXT_PUBLIC_MEDIA_BASE_URL, bukan didaftar
 * manual: host media berbeda per environment (RustFS lokal, bucket produksi),
 * dan daftar yang di-hardcode membuat `next/image` menolak foto lapangan
 * dengan 400 setiap kali host-nya berpindah.
 */
function mediaRemotePatterns(): NonNullable<
  NonNullable<NextConfig['images']>['remotePatterns']
> {
  const raw = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  if (!raw) return []

  try {
    const url = new URL(raw)
    const protocol = url.protocol.replace(':', '')
    if (protocol !== 'http' && protocol !== 'https') return []

    return [
      {
        protocol,
        hostname: url.hostname,
        pathname: '/**',
        ...(url.port ? { port: url.port } : {}),
      },
    ]
  } catch {
    // URL tidak valid tidak boleh menggagalkan build; foto remote saja yang mati.
    return []
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
    remotePatterns: mediaRemotePatterns(),
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
