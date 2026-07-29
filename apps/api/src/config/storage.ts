/** Konfigurasi klien S3-compatible (RustFS lokal, R2 produksi). */
import { S3Client } from '@aws-sdk/client-s3'
import { env } from '../env.ts'
import { S3StorageAdapter } from '../providers/storage.ts'

export const storageBuckets = [
  env.S3_BUCKET_MEDIA,
  env.S3_BUCKET_PRIVATE,
  env.S3_BUCKET_BACKUP,
] as const

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

export const storage = new S3StorageAdapter(s3)

/** Boot gagal bila tiga bucket kontrak tidak tersedia/diizinkan. */
export async function assertStorageReady(): Promise<void> {
  await storage.assertBuckets(storageBuckets)
}

export function closeStorage(): void {
  s3.destroy()
}
