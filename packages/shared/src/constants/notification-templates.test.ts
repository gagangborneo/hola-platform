/**
 * Test drift: katalog template ≡ docs/02-INFRASTRUCTURE.md § 7 "Katalog `template_code`".
 *
 * DOC_TEMPLATES disalin verbatim dari kolom tabel dokumen (Phase 0 / auth).
 * Saat modul lain menambah template ke dokumen, salin barisnya ke sini juga.
 */
import { describe, expect, it } from 'vitest'
import { TEMPLATE_CODE, TRANSACTIONAL_TEMPLATE_CODES } from './notification-templates'

const DOC_TEMPLATES = `
auth.email_verify email transaksional
auth.password_reset email transaksional
auth.password_changed email transaksional
auth.account_locked email transaksional
`

const docTemplates = DOC_TEMPLATES.trim()
  .split('\n')
  .map((line) => {
    const [code, channel, kind] = line.trim().split(' ')
    if (code === undefined || channel === undefined || kind === undefined) {
      throw new Error(`Baris DOC_TEMPLATES tidak dapat diurai: ${line}`)
    }
    return { code, channel, transactional: kind === 'transaksional' }
  })

describe('notification-templates ≡ docs/02-INFRASTRUCTURE.md § 7', () => {
  it('jumlah template sama persis dengan katalog dokumen', () => {
    expect(Object.values(TEMPLATE_CODE)).toEqual(docTemplates.map((t) => t.code))
  })

  it('setiap kode memakai konvensi {domain}.{peristiwa}', () => {
    for (const code of Object.values(TEMPLATE_CODE)) {
      expect(code, code).toMatch(/^[a-z_]+\.[a-z_]+$/)
    }
  })

  it('template transaksional mengabaikan preferensi user (docs/02 § 7 aturan 3)', () => {
    const expected = docTemplates.filter((t) => t.transactional).map((t) => t.code)
    expect([...TRANSACTIONAL_TEMPLATE_CODES].sort()).toEqual(expected.sort())
  })
})
