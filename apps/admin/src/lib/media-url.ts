import { env } from './env.ts'

/** URL publik objek media; `object_key` selalu relatif terhadap bucket. */
export function mediaUrl(objectKey: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
}
