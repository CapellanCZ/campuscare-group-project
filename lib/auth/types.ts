export const OTP_LENGTH = 6
export const RESEND_COOLDOWN_SECONDS = 60

/**
 * Clinic web RBAC role from `users.primary_role` (`web_role` enum).
 * Drives route trees: /admin, /nurse, /physician, /dentist, /queue-management.
 */
export type WebRole =
  | "admin"
  | "nurse"
  | "physician"
  | "dentist"
  | "queue_display"

/** Alias used by permission matrix / queue stations (same values as WebRole). */
export type ClinicDesignation = WebRole

export type AuthResult = { ok: true } | { ok: false; error: string }

export type StaffAccess = {
  userId: string
  email: string
  fullName: string
  /** Optional profile photo from `users.avatar_url` */
  avatarUrl: string | null
  /** RBAC role from users.primary_role */
  primaryRole: WebRole
  /** Same as primaryRole — kept for permission/queue call sites */
  designation: ClinicDesignation
  hasClinicMembership: boolean
}
