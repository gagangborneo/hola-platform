import { HeadBucketCommand, type S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it } from 'vitest'
import { S3StorageAdapter, StorageUnavailableError } from '../providers/storage.ts'
import { storageBuckets } from './storage.ts'

describe('konfigurasi storage', () => {
  it('F0-66: memeriksa tepat tiga bucket kontrak pada boot', async () => {
    const commands: unknown[] = []
    const send = async (command: unknown): Promise<unknown> => {
      commands.push(command)
      return {}
    }
    // Adapter hanya memanggil `send`; fake ini cukup untuk menguji boundary SDK.
    const client = { send } as unknown as S3Client
    const adapter = new S3StorageAdapter(client)

    await adapter.assertBuckets(storageBuckets)

    expect(commands).toHaveLength(3)
    const buckets = commands.map((command) => {
      expect(command).toBeInstanceOf(HeadBucketCommand)
      if (!(command instanceof HeadBucketCommand)) throw new Error('Command bucket tidak valid')
      return command.input.Bucket
    })
    expect(buckets).toEqual([...storageBuckets])
  })

  it('F0-66: kegagalan bucket diterjemahkan ke adapter error tanpa detail provider', async () => {
    const client = {
      send: async (): Promise<never> => Promise.reject(new Error('provider detail')),
    } as unknown as S3Client

    await expect(new S3StorageAdapter(client).assertBuckets(['hola-media'])).rejects.toBeInstanceOf(
      StorageUnavailableError,
    )
  })
})
