import { mediaFiles, users } from '@hola/db'
import { ERROR_CODE, MEDIA_KIND, MEDIA_STATUS, USER_ROLE } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import { env } from '../../env.ts'
import type { StorageAdapter, StorageObject } from '../../providers/storage.ts'
import { createUser } from '../auth/auth.repository.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { deleteMediaFixtures, findMediaById, setMediaCreatedAt } from './media.repository.ts'
import {
  cleanupOrphanUploads,
  confirmMediaUpload,
  deleteMedia,
  getMedia,
  presignMediaUpload,
} from './media.service.ts'

const now = new Date('2026-07-30T02:00:00.000Z')
const fixtureMediaIds: string[] = []
let customer: Viewer
let admin: Viewer
let headObject: StorageObject | null = null
const deletedObjects: Array<{ bucket: string; objectKey: string }> = []

const storage: StorageAdapter = {
  assertBuckets: async () => undefined,
  createPresignedPut: async ({ objectKey }) => `https://upload.hola.test/${objectKey}`,
  createPresignedGet: async ({ objectKey }) => `https://download.hola.test/${objectKey}`,
  headObject: async () => headObject,
  deleteObject: async (input) => {
    deletedObjects.push(input)
  },
}

function context(at = now) {
  return { db, env, logger, storage, now: at }
}

beforeAll(async () => {
  const [customerUser, adminUser] = await Promise.all([
    createUser(db, {
      role: USER_ROLE.CUSTOMER,
      email: 'media-customer.integration@hola.test',
      phone: undefined,
      passwordHash: 'test-password-hash',
      fullName: 'Media Customer',
    }),
    createUser(db, {
      role: USER_ROLE.ADMIN,
      email: 'media-admin.integration@hola.test',
      phone: undefined,
      passwordHash: 'test-password-hash',
      fullName: 'Media Admin',
    }),
  ])
  customer = {
    userId: customerUser.id,
    role: customerUser.role,
    cafeTenantId: undefined,
    employeeId: undefined,
  }
  admin = {
    userId: adminUser.id,
    role: adminUser.role,
    cafeTenantId: undefined,
    employeeId: undefined,
  }
})

afterEach(async () => {
  await deleteMediaFixtures(db, fixtureMediaIds.splice(0))
  headObject = null
  deletedObjects.splice(0)
})

afterAll(async () => {
  await db.delete(mediaFiles).where(eq(mediaFiles.uploadedByUserId, customer.userId))
  await db.delete(mediaFiles).where(eq(mediaFiles.uploadedByUserId, admin.userId))
  await db.delete(users).where(eq(users.email, 'media-customer.integration@hola.test'))
  await db.delete(users).where(eq(users.email, 'media-admin.integration@hola.test'))
})

describe('media dan object storage', () => {
  it('F0-67: presign memaksa RBAC, mime, dan batas ukuran per kind', async () => {
    const upload = await presignMediaUpload(context(), customer, {
      kind: MEDIA_KIND.AVATAR,
      contentType: 'image/png',
      sizeBytes: 1_024,
    })
    fixtureMediaIds.push(upload.media.id)

    expect(upload.media.status).toBe(MEDIA_STATUS.PENDING)
    expect(upload.media.bucket).toBe(env.S3_BUCKET_MEDIA)
    expect(upload.media.objectKey).toMatch(/^uploads\/avatar\/.+\.png$/)
    expect(upload.uploadUrl).toContain(upload.media.objectKey)

    await expect(
      presignMediaUpload(context(), customer, {
        kind: MEDIA_KIND.CONTRACT_DOCUMENT,
        contentType: 'application/pdf',
        sizeBytes: 1_024,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODE.FORBIDDEN })
    await expect(
      presignMediaUpload(context(), admin, {
        kind: MEDIA_KIND.AVATAR,
        contentType: 'image/gif',
        sizeBytes: 1_024,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODE.MEDIA_CONTENT_TYPE_UNSUPPORTED })
    await expect(
      presignMediaUpload(context(), admin, {
        kind: MEDIA_KIND.AVATAR,
        contentType: 'image/png',
        sizeBytes: 2 * 1024 * 1024 + 1,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODE.MEDIA_TOO_LARGE })
  })

  it('F0-67: confirm HEAD hanya menerima mime dan ukuran yang dipresign', async () => {
    const upload = await presignMediaUpload(context(), customer, {
      kind: MEDIA_KIND.AVATAR,
      contentType: 'image/webp',
      sizeBytes: 2_048,
    })
    fixtureMediaIds.push(upload.media.id)
    headObject = { contentType: 'image/webp', sizeBytes: 2_048 }

    const confirmed = await confirmMediaUpload(context(), customer, upload.media.id)
    expect(confirmed.status).toBe(MEDIA_STATUS.READY)
    expect(confirmed.confirmedAt).toEqual(now)
    expect(await getMedia(context(), customer, upload.media.id)).toMatchObject({
      url: expect.stringContaining(upload.media.objectKey),
    })
  })

  it('F0-67: confirm menolak object yang belum ada atau tidak sesuai', async () => {
    const upload = await presignMediaUpload(context(), customer, {
      kind: MEDIA_KIND.AVATAR,
      contentType: 'image/jpeg',
      sizeBytes: 3_072,
    })
    fixtureMediaIds.push(upload.media.id)
    headObject = null

    await expect(confirmMediaUpload(context(), customer, upload.media.id)).rejects.toMatchObject({
      code: ERROR_CODE.MEDIA_NOT_UPLOADED,
    })
  })

  it('F0-67: media publik dapat dibaca tetapi hanya pemilik yang dapat menghapusnya', async () => {
    const upload = await presignMediaUpload(context(), admin, {
      kind: MEDIA_KIND.AVATAR,
      contentType: 'image/png',
      sizeBytes: 2_048,
    })
    fixtureMediaIds.push(upload.media.id)
    headObject = { contentType: 'image/png', sizeBytes: 2_048 }
    await confirmMediaUpload(context(), admin, upload.media.id)

    await expect(getMedia(context(), customer, upload.media.id)).resolves.toMatchObject({
      url: expect.stringContaining(upload.media.objectKey),
    })
    await expect(deleteMedia(context(), customer, upload.media.id)).rejects.toMatchObject({
      code: ERROR_CODE.NOT_FOUND,
    })
  })

  it('F0-68/J-32: pending lebih dari 24 jam menghapus object lalu baris database', async () => {
    const upload = await presignMediaUpload(context(), customer, {
      kind: MEDIA_KIND.AVATAR,
      contentType: 'image/png',
      sizeBytes: 4_096,
    })
    fixtureMediaIds.push(upload.media.id)
    await setMediaCreatedAt(db, upload.media.id, new Date(now.getTime() - 25 * 60 * 60 * 1000))

    await cleanupOrphanUploads(context())

    expect(deletedObjects).toContainEqual({
      bucket: upload.media.bucket,
      objectKey: upload.media.objectKey,
    })
    expect(await findMediaById(db, upload.media.id)).toBeNull()
    fixtureMediaIds.splice(fixtureMediaIds.indexOf(upload.media.id), 1)
  })
})
