/**
 * Unggah media lewat presigned URL (docs/02 § 6).
 *
 * Alur: kompresi di klien → `POST /media/presign` → `PUT` langsung ke object
 * storage → `POST /media/{id}/confirm`. Berkas tidak pernah melewati API.
 *
 * Kompresi dilakukan SEBELUM presign, bukan sesudah: `size_bytes` yang dikirim
 * ke presign divalidasi server terhadap batas per-kind (5 MB untuk
 * `court_photo`), jadi ukuran yang dilaporkan harus ukuran yang benar-benar
 * di-`PUT`. Foto kamera ponsel rutin melebihi batas itu mentah-mentah.
 */
import { apiClient } from './api-client.ts'
import { isRecord, parseData } from './api-response.ts'

/** Sisi terpanjang setelah kompresi. Cukup untuk kartu dan galeri lapangan. */
const MAX_EDGE_PX = 1600
const OUTPUT_TYPE = 'image/webp'
const OUTPUT_QUALITY = 0.82

export interface UploadedMedia {
  id: string
  objectKey: string
  url: string | null
}

interface PresignResponse {
  media_id: string
  upload_url: string
  object_key: string
}

interface MediaResponse {
  id: string
  object_key: string
  url: string | null
}

function isPresignResponse(value: unknown): value is PresignResponse {
  return (
    isRecord(value) &&
    typeof value.media_id === 'string' &&
    typeof value.upload_url === 'string' &&
    typeof value.object_key === 'string'
  )
}

function isMediaResponse(value: unknown): value is MediaResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.object_key === 'string' &&
    (typeof value.url === 'string' || value.url === null)
  )
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    })
    image.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Berkas tidak dapat dibaca sebagai gambar.'))
    })
    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Kompresi gambar gagal di peramban ini.'))
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    )
  })
}

/**
 * Menskalakan gambar ke sisi terpanjang `MAX_EDGE_PX` dan mengemasnya ulang
 * sebagai WebP. Gambar yang sudah lebih kecil tetap dikemas ulang supaya
 * `content_type` yang dikirim ke presign selalu sesuai dengan byte yang di-PUT.
 */
export async function compressImage(file: File): Promise<Blob> {
  const image = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Kompresi gambar gagal di peramban ini.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas)
}

/** Presign → PUT → confirm. Melempar pesan siap-tampil jika salah satu langkah gagal. */
export async function uploadMedia(kind: string, body: Blob): Promise<UploadedMedia> {
  const presignResponse = await apiClient.api.v1.media.presign.$post({
    json: { kind, content_type: body.type, size_bytes: body.size },
  })
  const presign = parseData(await presignResponse.json(), isPresignResponse)

  const upload = await globalThis.fetch(presign.upload_url, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': body.type },
  })
  if (!upload.ok) {
    throw new Error(`Unggahan ke penyimpanan gagal (HTTP ${upload.status}). Coba lagi.`)
  }

  const confirmResponse = await apiClient.api.v1.media[':id'].confirm.$post({
    param: { id: presign.media_id },
  })
  const media = parseData(await confirmResponse.json(), isMediaResponse)
  return { id: media.id, objectKey: media.object_key, url: media.url }
}

/** Kompresi + unggah satu berkas gambar dari `<input type="file">`. */
export async function uploadImage(kind: string, file: File): Promise<UploadedMedia> {
  return uploadMedia(kind, await compressImage(file))
}
