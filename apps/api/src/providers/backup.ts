/** Adapter backup PostgreSQL → S3/R2. Hanya dipakai worker J-30. */
import { execFile } from 'node:child_process'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface BackupAdapter {
  createBackup(input: {
    databaseUrl: string
    bucket: string
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
    localDirectory: string
    localRetentionDays: number
    now: Date
  }): Promise<{ localPath: string; objectKey: string }>
}

function witaParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
}

export function createBackupObjectKey(now: Date): { fileName: string; objectKey: string } {
  const parts = witaParts(now)
  const year = parts.year ?? '0000'
  const month = parts.month ?? '00'
  const day = parts.day ?? '00'
  const hour = parts.hour ?? '00'
  const minute = parts.minute ?? '00'
  const fileName = `hola-${year}${month}${day}-${hour}${minute}.dump`
  return { fileName, objectKey: `pg/${year}/${month}/${fileName}` }
}

function postgresEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl)
  const sslMode = url.searchParams.get('sslmode')
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.replace(/^\//, ''),
    ...(sslMode ? { PGSSLMODE: sslMode } : {}),
  }
}

async function run(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): Promise<void> {
  try {
    await execFileAsync(command, args, { env: { ...process.env, ...env } })
  } catch {
    // `execFile` dapat menyertakan argumen/env pada pesan error; jangan biarkan
    // DATABASE_URL atau kredensial R2 masuk ke log/Sentry.
    throw new Error(`Perintah ${command} gagal.`)
  }
}

async function pruneLocalBackups(
  directory: string,
  now: Date,
  retentionDays: number,
): Promise<void> {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /^hola-\d{8}-\d{4}\.dump$/.test(entry.name))
      .map(async (entry) => {
        const path = join(directory, entry.name)
        const fileStats = await stat(path)
        if (fileStats.mtime.getTime() < cutoff) await rm(path)
      }),
  )
}

export class PgRcloneBackupAdapter implements BackupAdapter {
  async createBackup(input: {
    databaseUrl: string
    bucket: string
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
    localDirectory: string
    localRetentionDays: number
    now: Date
  }): Promise<{ localPath: string; objectKey: string }> {
    await mkdir(input.localDirectory, { recursive: true })
    await pruneLocalBackups(input.localDirectory, input.now, input.localRetentionDays)

    const { fileName, objectKey } = createBackupObjectKey(input.now)
    const localPath = join(input.localDirectory, fileName)
    const databaseEnv = postgresEnvironment(input.databaseUrl)
    await run('pg_dump', ['--format=custom', '--compress=9', '--file', localPath], databaseEnv)
    await run('pg_restore', ['--list', localPath], {})
    await run('rclone', ['copyto', localPath, `hola:${input.bucket}/${objectKey}`], {
      RCLONE_CONFIG_HOLA_TYPE: 's3',
      RCLONE_CONFIG_HOLA_PROVIDER: 'Other',
      RCLONE_CONFIG_HOLA_ENDPOINT: input.endpoint,
      RCLONE_CONFIG_HOLA_REGION: input.region,
      RCLONE_CONFIG_HOLA_ACCESS_KEY_ID: input.accessKeyId,
      RCLONE_CONFIG_HOLA_SECRET_ACCESS_KEY: input.secretAccessKey,
      RCLONE_CONFIG_HOLA_FORCE_PATH_STYLE: String(input.forcePathStyle),
    })
    return { localPath, objectKey }
  }
}
