export const OTP_LENGTH = 6
export const RESEND_COOLDOWN_SECONDS = 60

export type WebRole = "admin" | "doctor" | "clinic_staff"

export type AuthResult = { ok: true } | { ok: false; error: string }

export type StaffAccess = {
  userId: string
  email: string
  fullName: string
  primaryRole: WebRole
  hasClinicMembership: boolean
}
