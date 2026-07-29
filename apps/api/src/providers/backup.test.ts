import { describe, expect, it } from 'vitest'
import { createBackupObjectKey } from './backup.ts'

describe('createBackupObjectKey', () => {
  it('F0-88: membuat nama objek backup deterministik dalam zona WITA', () => {
    expect(createBackupObjectKey(new Date('2026-07-27T19:00:00.000Z'))).toEqual({
      fileName: 'hola-20260728-0300.dump',
      objectKey: 'pg/2026/07/hola-20260728-0300.dump',
    })
  })
})
