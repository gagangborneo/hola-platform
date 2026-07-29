/** Adapter S3-compatible untuk RustFS/R2 tanpa mengekspos SDK ke service. */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StorageObject {
  contentType: string | undefined
  sizeBytes: number | undefined
}

export interface StorageAdapter {
  assertBuckets(buckets: readonly string[]): Promise<void>
  createPresignedPut(input: {
    bucket: string
    objectKey: string
    contentType: string
    expiresInSeconds: number
  }): Promise<string>
  createPresignedGet(input: {
    bucket: string
    objectKey: string
    expiresInSeconds: number
  }): Promise<string>
  headObject(input: { bucket: string; objectKey: string }): Promise<StorageObject | null>
  deleteObject(input: { bucket: string; objectKey: string }): Promise<void>
}

/** Kegagalan provider dipetakan service menjadi `STORAGE_UNAVAILABLE`. */
export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageUnavailableError'
  }
}

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  // AWS SDK errors do not expose a common typed metadata interface.
  const metadata = (error as { $metadata?: unknown }).$metadata
  if (!metadata || typeof metadata !== 'object') return undefined
  // Metadata was checked as an object immediately above; only this optional field is read.
  const value = (metadata as { httpStatusCode?: unknown }).httpStatusCode
  return typeof value === 'number' ? value : undefined
}

function isObjectNotFound(error: unknown): boolean {
  if (httpStatus(error) === 404) return true
  if (!error || typeof error !== 'object') return false
  // AWS SDK service errors use `name`, but do not share a stable base type.
  const name = (error as { name?: unknown }).name
  return name === 'NotFound' || name === 'NoSuchKey' || name === 'NoSuchObject'
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client

  constructor(client: S3Client) {
    this.client = client
  }

  async assertBuckets(buckets: readonly string[]): Promise<void> {
    try {
      await Promise.all(
        buckets.map(async (bucket) => this.client.send(new HeadBucketCommand({ Bucket: bucket }))),
      )
    } catch (error) {
      throw new StorageUnavailableError('Bucket object storage tidak dapat diakses.', {
        cause: error,
      })
    }
  }

  async createPresignedPut(input: {
    bucket: string
    objectKey: string
    contentType: string
    expiresInSeconds: number
  }): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.objectKey,
          ContentType: input.contentType,
        }),
        { expiresIn: input.expiresInSeconds },
      )
    } catch (error) {
      throw new StorageUnavailableError('URL upload tidak dapat dibuat.', { cause: error })
    }
  }

  async createPresignedGet(input: {
    bucket: string
    objectKey: string
    expiresInSeconds: number
  }): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
        { expiresIn: input.expiresInSeconds },
      )
    } catch (error) {
      throw new StorageUnavailableError('URL unduh tidak dapat dibuat.', { cause: error })
    }
  }

  async headObject(input: { bucket: string; objectKey: string }): Promise<StorageObject | null> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
      )
      return {
        contentType: object.ContentType,
        sizeBytes: object.ContentLength,
      }
    } catch (error) {
      if (isObjectNotFound(error)) return null
      throw new StorageUnavailableError('Objek storage tidak dapat diperiksa.', { cause: error })
    }
  }

  async deleteObject(input: { bucket: string; objectKey: string }): Promise<void> {
    try {
      // S3 DELETE idempoten: objek yang sudah hilang tetap dianggap berhasil.
      await this.client.send(
        new DeleteObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
      )
    } catch (error) {
      throw new StorageUnavailableError('Objek storage tidak dapat dihapus.', { cause: error })
    }
  }
}
