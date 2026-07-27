import { describe, expect, it } from 'vitest'
import { roundTo100 } from './round'

describe('roundTo100 (docs/07 § 3.3 P10)', () => {
  const cases: Array<[number, number, string]> = [
    [0, 0, 'nol tetap nol'],
    [50, 100, 'tepat setengah membulat ke atas (half up)'],
    [49, 0, 'di bawah setengah membulat ke bawah'],
    [51, 100, 'di atas setengah membulat ke atas'],
    [149, 100, '—'],
    [150, 200, 'tepat setengah membulat ke atas'],
    [151, 200, '—'],
    [100, 100, 'sudah kelipatan 100, tidak berubah'],
    [375_000, 375_000, 'docs/07 § 3.3 P3: 250000 × 1.5 = 375000'],
    [87_500, 87_500, 'docs/07 § 3.3 P3: 175000/jam × 30 menit'],
    [75_000, 75_000, 'docs/07 § 3.3 P3: 150000/jam × 30 menit'],
    [150_050, 150_100, '—'],
    [150_049, 150_000, '—'],
  ]

  it.each(cases)('roundTo100(%i) = %i — %s', (input, expected) => {
    expect(roundTo100(input)).toBe(expected)
  })

  it('selalu menghasilkan kelipatan 100', () => {
    for (let i = -1000; i <= 1000; i++) {
      expect(Math.abs(roundTo100(i) % 100)).toBe(0)
    }
  })

  it('tidak pernah mengembalikan -0 (agar Object.is tidak menganggapnya beda)', () => {
    expect(Object.is(roundTo100(-50), 0)).toBe(true)
    expect(Object.is(roundTo100(-49), 0)).toBe(true)
    expect(Object.is(roundTo100(0), 0)).toBe(true)
  })

  it('nilai negatif mengikuti Math.round (membulat ke arah +∞ pada tepat .5)', () => {
    // Dikunci sengaja: docs/07 § 3.3 P10 menulis rumusnya sebagai
    // Math.round(x / 100) * 100, bukan pembulatan menjauhi nol.
    expect(roundTo100(-250)).toBe(-200)
    expect(roundTo100(-251)).toBe(-300)
    expect(roundTo100(-249)).toBe(-200)
    expect(roundTo100(-100)).toBe(-100)
  })

  it('menolak nilai yang bukan angka berhingga', () => {
    expect(() => roundTo100(Number.NaN)).toThrow()
    expect(() => roundTo100(Number.POSITIVE_INFINITY)).toThrow()
  })

  it('idempoten — membulatkan hasilnya tidak mengubah apa pun', () => {
    for (const [input] of cases) {
      expect(roundTo100(roundTo100(input))).toBe(roundTo100(input))
    }
  })
})
