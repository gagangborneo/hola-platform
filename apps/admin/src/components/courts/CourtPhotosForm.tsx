'use client'

import { MEDIA_KIND } from '@hola/shared'
import { Button } from '@hola/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChangeEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import type { CourtDetail } from '../../lib/courts.ts'
import { uploadImage } from '../../lib/media-upload.ts'
import { mediaUrl } from '../../lib/media-url.ts'
import { formErrorMessage } from '../common/form-error.ts'

/** Batas `PUT /courts/{id}/photos`. */
const MAX_PHOTOS = 12

interface CourtPhotosFormProps {
  court: CourtDetail
}

interface PhotoDraft {
  mediaId: string
  objectKey: string
}

export function CourtPhotosForm({ court }: CourtPhotosFormProps): ReactNode {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<PhotoDraft[]>(() =>
    court.photos.map((photo) => ({ mediaId: photo.mediaId, objectKey: photo.objectKey })),
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const save = useMutation({
    mutationFn: async (photos: PhotoDraft[]): Promise<void> => {
      await apiClient.api.v1.courts[':id'].photos.$put({
        param: { id: court.id },
        json: { media_ids: photos.map((photo) => photo.mediaId) },
      })
    },
    onSuccess: async () => {
      setIsSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['court-detail', court.id] })
    },
  })

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget
    const files = [...(input.files ?? [])]
    input.value = ''
    if (files.length === 0) return
    if (drafts.length + files.length > MAX_PHOTOS) {
      setError(`Maksimal ${MAX_PHOTOS} foto per lapangan.`)
      return
    }

    setError(null)
    setIsSaved(false)
    setIsUploading(true)
    try {
      // Berurutan, bukan paralel: unggahan foto kamera lewat koneksi venue
      // lebih andal satu per satu, dan kegagalan di tengah menyisakan daftar
      // yang tetap konsisten dengan apa yang sudah berhasil.
      for (const file of files) {
        const media = await uploadImage(MEDIA_KIND.COURT_PHOTO, file)
        setDrafts((current) => [...current, { mediaId: media.id, objectKey: media.objectKey }])
      }
    } catch (uploadError) {
      setError(formErrorMessage(uploadError))
    } finally {
      setIsUploading(false)
    }
  }

  const move = (index: number, delta: number): void => {
    setIsSaved(false)
    setDrafts((current) => {
      const next = [...current]
      const target = index + delta
      const moved = next[index]
      const displaced = next[target]
      if (!moved || !displaced) return current
      next[index] = displaced
      next[target] = moved
      return next
    })
  }

  const remove = (mediaId: string): void => {
    setIsSaved(false)
    setDrafts((current) => current.filter((photo) => photo.mediaId !== mediaId))
  }

  const submit = async (): Promise<void> => {
    setError(null)
    try {
      await save.mutateAsync(drafts)
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    }
  }

  return (
    <div className="stack">
      <p className="muted">
        Gambar dikompresi di peramban sebelum diunggah, lalu dikirim langsung ke object storage
        lewat presigned URL — berkas tidak melewati API. Urutan di sini menentukan urutan foto di
        halaman publik.
      </p>

      <label className="field">
        <span>Tambah foto</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => void onFilesSelected(event)}
          disabled={isUploading || drafts.length >= MAX_PHOTOS}
        />
        <small>
          {drafts.length}/{MAX_PHOTOS} foto. JPEG, PNG, atau WebP.
        </small>
      </label>

      {isUploading ? <p className="notice notice-info">Mengompresi dan mengunggah…</p> : null}

      {drafts.length === 0 ? (
        <p className="table-state">Belum ada foto untuk lapangan ini.</p>
      ) : (
        <div className="photo-grid">
          {drafts.map((photo, index) => (
            <figure className="photo-tile" key={photo.mediaId}>
              {/* Object storage melayani gambar apa adanya; optimasi Next Image
                  tidak dipakai supaya CSP dan bucket publik tetap sederhana. */}
              {/** biome-ignore lint/performance/noImgElement: object storage, bukan aset build */}
              <img src={mediaUrl(photo.objectKey)} alt={`Foto ${index + 1} ${court.name}`} />
              <figcaption>Posisi {index + 1}</figcaption>
              <div className="row">
                <Button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  variant="secondary"
                  size="sm"
                >
                  ←
                </Button>
                <Button
                  onClick={() => move(index, 1)}
                  disabled={index === drafts.length - 1}
                  variant="secondary"
                  size="sm"
                >
                  →
                </Button>
                <Button onClick={() => remove(photo.mediaId)} variant="destructive" size="sm">
                  Hapus
                </Button>
              </div>
            </figure>
          ))}
        </div>
      )}

      {error ? <p className="form-error">{error}</p> : null}
      {isSaved ? <p className="notice notice-success">Daftar foto tersimpan.</p> : null}

      <div className="form-actions">
        <Button onClick={() => void submit()} disabled={save.isPending || isUploading}>
          {save.isPending ? 'Menyimpan…' : 'Simpan urutan foto'}
        </Button>
        <Button
          onClick={() => {
            setDrafts(
              court.photos.map((photo) => ({
                mediaId: photo.mediaId,
                objectKey: photo.objectKey,
              })),
            )
            setError(null)
            setIsSaved(false)
          }}
          disabled={save.isPending || isUploading}
          variant="secondary"
        >
          Kembalikan
        </Button>
      </div>
    </div>
  )
}
