/** Query media_files. Kebijakan upload/ownership hidup di media.service.ts. */
import { type HolaDb, mediaFiles } from '@hola/db'
import { and, asc, eq, inArray, lt, ne, or } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx
export type MediaRow = typeof mediaFiles.$inferSelect

export async function createPendingMedia(
  db: DbExecutor,
  input: {
    id: string
    bucket: string
    objectKey: string
    kind: MediaRow['kind']
    contentType: string
    sizeBytes: number
    uploadedByUserId: string
  },
): Promise<MediaRow> {
  const [media] = await db
    .insert(mediaFiles)
    .values({
      id: input.id,
      bucket: input.bucket,
      objectKey: input.objectKey,
      kind: input.kind,
      status: 'pending',
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedByUserId: input.uploadedByUserId,
    })
    .returning()
  if (!media) throw new Error('media_files gagal dibuat')
  return media
}

export async function findMediaById(db: DbExecutor, mediaId: string): Promise<MediaRow | null> {
  const [media] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, mediaId)).limit(1)
  return media ?? null
}

export async function markMediaReady(
  db: DbExecutor,
  input: { mediaId: string; contentType: string; sizeBytes: number; now: Date },
): Promise<MediaRow | null> {
  const [media] = await db
    .update(mediaFiles)
    .set({
      status: 'ready',
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      confirmedAt: input.now,
    })
    .where(and(eq(mediaFiles.id, input.mediaId), eq(mediaFiles.status, 'pending')))
    .returning()
  return media ?? null
}

export async function markMediaDeleted(
  db: DbExecutor,
  input: { mediaId: string; now: Date },
): Promise<MediaRow | null> {
  const [media] = await db
    .update(mediaFiles)
    .set({ status: 'deleted', deletedAt: input.now })
    .where(and(eq(mediaFiles.id, input.mediaId), ne(mediaFiles.status, 'deleted')))
    .returning()
  return media ?? null
}

/** Kandidat J-32: pending tua dan soft-delete yang masih menyisakan objek. */
export async function listMediaCleanupCandidates(
  db: DbExecutor,
  before: Date,
  limit: number,
): Promise<MediaRow[]> {
  return db
    .select()
    .from(mediaFiles)
    .where(
      or(
        and(eq(mediaFiles.status, 'pending'), lt(mediaFiles.createdAt, before)),
        eq(mediaFiles.status, 'deleted'),
      ),
    )
    .orderBy(asc(mediaFiles.createdAt), asc(mediaFiles.id))
    .limit(limit)
}

/** Mengunci semantik cleanup terhadap race `/confirm`: pending → deleted dulu. */
export async function claimPendingMediaForCleanup(
  db: DbExecutor,
  input: { mediaId: string; now: Date },
): Promise<MediaRow | null> {
  const [media] = await db
    .update(mediaFiles)
    .set({ status: 'deleted', deletedAt: input.now })
    .where(and(eq(mediaFiles.id, input.mediaId), eq(mediaFiles.status, 'pending')))
    .returning()
  return media ?? null
}

/** Jika storage sementara gagal, pending dikembalikan agar J-32 dapat mencoba lagi. */
export async function restoreMediaPending(db: DbExecutor, mediaId: string): Promise<void> {
  await db
    .update(mediaFiles)
    .set({ status: 'pending', deletedAt: null })
    .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.status, 'deleted')))
}

export async function permanentlyDeleteMedia(db: DbExecutor, mediaId: string): Promise<boolean> {
  const [media] = await db
    .delete(mediaFiles)
    .where(eq(mediaFiles.id, mediaId))
    .returning({ id: mediaFiles.id })
  return media !== undefined
}

export async function deletePendingMedia(db: DbExecutor, mediaId: string): Promise<void> {
  await db
    .delete(mediaFiles)
    .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.status, 'pending')))
}

/** Dipakai hanya cleanup test/fixture agar query tetap berada pada repository. */
export async function setMediaCreatedAt(
  db: DbExecutor,
  mediaId: string,
  createdAt: Date,
): Promise<void> {
  await db.update(mediaFiles).set({ createdAt }).where(eq(mediaFiles.id, mediaId))
}

export async function deleteMediaFixtures(
  db: DbExecutor,
  mediaIds: readonly string[],
): Promise<void> {
  if (mediaIds.length === 0) return
  await db.delete(mediaFiles).where(inArray(mediaFiles.id, [...mediaIds]))
}
