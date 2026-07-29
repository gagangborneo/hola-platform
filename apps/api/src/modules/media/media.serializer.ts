import type { MediaRow } from './media.repository.ts'

export function serializeMedia(
  media: MediaRow,
  url: string | null,
): {
  id: string
  bucket: string
  object_key: string
  kind: MediaRow['kind']
  status: MediaRow['status']
  content_type: string | null
  size_bytes: number | null
  url: string | null
  created_at: string
  confirmed_at: string | null
  deleted_at: string | null
} {
  return {
    id: media.id,
    bucket: media.bucket,
    object_key: media.objectKey,
    kind: media.kind,
    status: media.status,
    content_type: media.contentType,
    size_bytes: media.sizeBytes,
    url,
    created_at: media.createdAt.toISOString(),
    confirmed_at: media.confirmedAt?.toISOString() ?? null,
    deleted_at: media.deletedAt?.toISOString() ?? null,
  }
}
