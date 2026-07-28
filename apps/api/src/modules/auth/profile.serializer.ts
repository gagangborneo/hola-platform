/** Contoh serializer field-level yang dipakai modul profile/customer berikutnya. */
import type { Viewer } from './auth.types.ts'

export interface CustomerProfileView {
  userId: string
  birthDate: string | null
  gender: string | null
  skillLevel: string | null
  internalNotes: string | null
}

function birthDateForStaff(value: string): string {
  // Staff hanya butuh bulan-tanggal untuk operasional; tahun lahir tetap privat.
  return value.length === 10 ? value.slice(5) : value
}

export function serializeCustomerProfile(profile: CustomerProfileView, viewer: Viewer) {
  const result: {
    user_id: string
    birth_date: string | null
    gender: string | null
    skill_level: string | null
    internal_notes?: string | null
  } = {
    user_id: profile.userId,
    birth_date:
      viewer.role === 'staff' && profile.birthDate
        ? birthDateForStaff(profile.birthDate)
        : profile.birthDate,
    gender: profile.gender,
    skill_level: profile.skillLevel,
  }
  if (viewer.role === 'staff' || viewer.role === 'admin')
    result.internal_notes = profile.internalNotes
  return result
}
