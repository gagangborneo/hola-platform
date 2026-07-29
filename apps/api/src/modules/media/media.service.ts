/** Kebijakan upload, konfirmasi object, ownership, dan pembersihan J-32. */
import { uuidv7 } from '@hola/db'
import { ERROR_CODE, MEDIA_KIND, MEDIA_STATUS, type UserRole } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { type StorageObject, StorageUnavailableError } from '../../providers/storage.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  claimPendingMediaForCleanup,
  createPendingMedia,
  deletePendingMedia,
  findMediaById,
  listMediaCleanupCandidates,
  type MediaRow,
  markMediaDeleted,
  markMediaReady,
  permanentlyDeleteMedia,
  restoreMediaPending,
} from './media.repository.ts'

type MediaDependencies = Pick<CoreDependencies, 'db' | 'env' | 'logger' | 'storage'>
export interface MediaServiceContext extends MediaDependencies {
  now: Date
}

interface MediaPolicy {
  bucket: 'public' | 'private'
  contentTypes: readonly string[]
  maxBytes: number
  roles: readonly UserRole[]
}

const MB = 1024 * 1024
const PRESIGNED_PUT_TTL_SECONDS = 10 * 60
const PRESIGNED_GET_TTL_SECONDS = 15 * 60
const ORPHAN_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000

const MEDIA_POLICY = new Map<string, MediaPolicy>([
  [
    MEDIA_KIND.COURT_PHOTO,
    {
      bucket: 'public',
      contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 5 * MB,
      roles: ['admin'],
    },
  ],
  [
    MEDIA_KIND.EVENT_POSTER,
    {
      bucket: 'public',
      contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 5 * MB,
      roles: ['admin'],
    },
  ],
  [
    MEDIA_KIND.TUTORIAL_THUMBNAIL,
    {
      bucket: 'public',
      contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 2 * MB,
      roles: ['admin'],
    },
  ],
  [
    MEDIA_KIND.AVATAR,
    {
      bucket: 'public',
      contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 2 * MB,
      roles: ['customer', 'staff', 'admin', 'tenant'],
    },
  ],
  [
    MEDIA_KIND.CONTRACT_DOCUMENT,
    {
      bucket: 'private',
      contentTypes: ['application/pdf'],
      maxBytes: 10 * MB,
      roles: ['admin'],
    },
  ],
  [
    MEDIA_KIND.PAYMENT_PROOF,
    {
      bucket: 'private',
      contentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      maxBytes: 5 * MB,
      roles: ['staff', 'admin', 'tenant'],
    },
  ],
  [
    MEDIA_KIND.EXPENSE_RECEIPT,
    {
      bucket: 'private',
      contentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      maxBytes: 5 * MB,
      roles: ['staff', 'admin'],
    },
  ],
])

function policyFor(kind: string): { kind: MediaRow['kind']; policy: MediaPolicy } {
  const mediaKind = Object.values(MEDIA_KIND).find((candidate) => candidate === kind)
  if (!mediaKind) throw err.of(ERROR_CODE.MEDIA_KIND_UNSUPPORTED)
  const policy = MEDIA_POLICY.get(mediaKind)
  if (!policy) throw err.of(ERROR_CODE.MEDIA_KIND_UNSUPPORTED)
  return { kind: mediaKind, policy }
}

function extensionFor(contentType: string): string {
  const extensions = new Map<string, string>([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['application/pdf', 'pdf'],
  ])
  const extension = extensions.get(contentType)
  if (!extension) throw err.of(ERROR_CODE.MEDIA_CONTENT_TYPE_UNSUPPORTED)
  return extension
}

function publicUrl(baseUrl: string, objectKey: string): string {
  return new URL(objectKey, `${baseUrl.replace(/\/+$/, '')}/`).toString()
}

function storageError(error: unknown): never {
  if (error instanceof StorageUnavailableError) throw err.of(ERROR_CODE.STORAGE_UNAVAILABLE)
  throw error
}

function assertCanUpload(viewer: Viewer, policy: MediaPolicy): void {
  if (!policy.roles.includes(viewer.role)) throw err.forbidden()
}

function assertCanAccess(viewer: Viewer, media: MediaRow, publicBucket: string): void {
  if (media.bucket === publicBucket && media.status === MEDIA_STATUS.READY) return
  assertCanManage(viewer, media)
}

function assertCanManage(viewer: Viewer, media: MediaRow): void {
  if (viewer.role === 'admin' || viewer.role === 'staff') return
  if (media.uploadedByUserId === viewer.userId) return
  if (viewer.role === 'customer') throw err.notFound()
  throw err.forbidden()
}

function expectedUpload(media: MediaRow): { contentType: string; sizeBytes: number } {
  if (!media.contentType || media.sizeBytes === null) throw err.internal()
  return { contentType: media.contentType, sizeBytes: media.sizeBytes }
}

function matchingContentType(actual: string | undefined, expected: string): boolean {
  return actual?.split(';')[0]?.trim().toLowerCase() === expected
}

export async function presignMediaUpload(
  ctx: MediaServiceContext,
  viewer: Viewer,
  input: { kind: string; contentType: string; sizeBytes: number },
): Promise<{ media: MediaRow; uploadUrl: string }> {
  const contentType = input.contentType.trim().toLowerCase()
  const { kind, policy } = policyFor(input.kind)
  assertCanUpload(viewer, policy)
  if (!policy.contentTypes.includes(contentType))
    throw err.of(ERROR_CODE.MEDIA_CONTENT_TYPE_UNSUPPORTED)
  if (input.sizeBytes > policy.maxBytes) throw err.of(ERROR_CODE.MEDIA_TOO_LARGE)

  const bucket = policy.bucket === 'public' ? ctx.env.S3_BUCKET_MEDIA : ctx.env.S3_BUCKET_PRIVATE
  const mediaId = uuidv7()
  const media = await createPendingMedia(ctx.db, {
    id: mediaId,
    bucket,
    objectKey: `uploads/${kind}/${mediaId}.${extensionFor(contentType)}`,
    kind,
    contentType,
    sizeBytes: input.sizeBytes,
    uploadedByUserId: viewer.userId,
  })

  try {
    const uploadUrl = await ctx.storage.createPresignedPut({
      bucket: media.bucket,
      objectKey: media.objectKey,
      contentType,
      expiresInSeconds: PRESIGNED_PUT_TTL_SECONDS,
    })
    return { media, uploadUrl }
  } catch (error) {
    await deletePendingMedia(ctx.db, media.id)
    return storageError(error)
  }
}

export async function confirmMediaUpload(
  ctx: MediaServiceContext,
  viewer: Viewer,
  mediaId: string,
): Promise<MediaRow> {
  const media = await findMediaById(ctx.db, mediaId)
  if (!media || media.status === MEDIA_STATUS.DELETED) throw err.notFound()
  assertCanAccess(viewer, media, ctx.env.S3_BUCKET_MEDIA)
  if (media.status === MEDIA_STATUS.READY) return media

  const expected = expectedUpload(media)
  let object: StorageObject | null
  try {
    object = await ctx.storage.headObject({ bucket: media.bucket, objectKey: media.objectKey })
  } catch (error) {
    return storageError(error)
  }
  if (!object || !matchingContentType(object.contentType, expected.contentType))
    throw err.of(ERROR_CODE.MEDIA_NOT_UPLOADED, {
      message: 'Objek upload belum sesuai dengan permintaan.',
    })
  if (object.sizeBytes !== expected.sizeBytes)
    throw err.of(ERROR_CODE.MEDIA_NOT_UPLOADED, {
      message: 'Ukuran objek upload tidak sesuai.',
    })

  const confirmed = await markMediaReady(ctx.db, {
    mediaId,
    contentType: expected.contentType,
    sizeBytes: expected.sizeBytes,
    now: ctx.now,
  })
  if (confirmed) return confirmed

  const current = await findMediaById(ctx.db, mediaId)
  if (current?.status === MEDIA_STATUS.READY) return current
  throw err.notFound()
}

export async function getMedia(
  ctx: MediaServiceContext,
  viewer: Viewer,
  mediaId: string,
): Promise<{ media: MediaRow; url: string }> {
  const media = await findMediaById(ctx.db, mediaId)
  if (!media || media.status === MEDIA_STATUS.DELETED) throw err.notFound()
  assertCanAccess(viewer, media, ctx.env.S3_BUCKET_MEDIA)
  if (media.status !== MEDIA_STATUS.READY)
    throw err.of(ERROR_CODE.MEDIA_NOT_UPLOADED, { message: 'Media belum siap digunakan.' })

  if (media.bucket === ctx.env.S3_BUCKET_MEDIA) {
    return { media, url: publicUrl(ctx.env.MEDIA_PUBLIC_BASE_URL, media.objectKey) }
  }
  try {
    return {
      media,
      url: await ctx.storage.createPresignedGet({
        bucket: media.bucket,
        objectKey: media.objectKey,
        expiresInSeconds: PRESIGNED_GET_TTL_SECONDS,
      }),
    }
  } catch (error) {
    return storageError(error)
  }
}

/** Soft delete langsung menyembunyikan media; J-32 mengulang jika S3 sedang gagal. */
export async function deleteMedia(
  ctx: MediaServiceContext,
  viewer: Viewer,
  mediaId: string,
): Promise<void> {
  const media = await findMediaById(ctx.db, mediaId)
  if (!media) throw err.notFound()
  // URL publik boleh dibaca semua user terautentikasi, tetapi tidak boleh dihapus sembarang user.
  assertCanManage(viewer, media)
  const deleted = await markMediaDeleted(ctx.db, { mediaId, now: ctx.now })
  if (!deleted) return

  try {
    await ctx.storage.deleteObject({ bucket: deleted.bucket, objectKey: deleted.objectKey })
  } catch (error) {
    ctx.logger.warn({ err: error, media_id: mediaId }, 'hapus object media ditunda ke J-32')
  }
}

/** J-32: bersihkan pending >24 jam dan soft-delete yang belum tuntas di storage. */
export async function cleanupOrphanUploads(ctx: MediaServiceContext): Promise<void> {
  const before = new Date(ctx.now.getTime() - ORPHAN_UPLOAD_AGE_MS)
  const candidates = await listMediaCleanupCandidates(ctx.db, before, 100)
  for (const candidate of candidates) {
    const claimed =
      candidate.status === MEDIA_STATUS.PENDING
        ? await claimPendingMediaForCleanup(ctx.db, { mediaId: candidate.id, now: ctx.now })
        : candidate
    if (!claimed) continue

    try {
      await ctx.storage.deleteObject({ bucket: claimed.bucket, objectKey: claimed.objectKey })
      await permanentlyDeleteMedia(ctx.db, claimed.id)
    } catch (error) {
      if (candidate.status === MEDIA_STATUS.PENDING) await restoreMediaPending(ctx.db, candidate.id)
      ctx.logger.warn({ err: error, media_id: candidate.id }, 'J-32 gagal menghapus object media')
    }
  }
}
