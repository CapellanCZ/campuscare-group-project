export const OTP_LENGTH = 6
export const RESEND_COOLDOWN_SECONDS = 60

export type WebRole = "admin" | "nurse" | "physician" | "dentist"
export type LegacyWebRole = "doctor" | "clinic_staff"

export type AuthResult = { ok: true } | { ok: false; error: string }
export type PostLoginPathResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

export type StaffAccess = {
  userId: string
  email: string
  fullName: string
  primaryRole: WebRole
  hasClinicMembership: boolean
}

export function normalizeWebRole(role: string | null | undefined): WebRole {
  if (role === "admin") return "admin"
  if (role === "nurse") return "nurse"
  if (role === "physician") return "physician"
  if (role === "dentist") return "dentist"

  // Backward-compatible mappings while database role values are being migrated.
  if (role === "doctor") return "physician"
  if (role === "clinic_staff") return "nurse"

  return "nurse"
}
