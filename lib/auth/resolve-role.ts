import type { ClinicDesignation, WebRole } from "@/lib/auth/types"

const CLINIC_ROLES = [
  "admin",
  "nurse",
  "physician",
  "dentist",
  "queue_display",
] as const satisfies readonly ClinicDesignation[]

/** Fields that exist on live `users` for RBAC gates. */
export type ProfileRoleFields = {
  primary_role?: string | null
  is_active?: boolean | null
}

/** Normalize DB role labels (legacy `doctor`) to app WebRole. */
export function normalizeClinicRole(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const role = value.toLowerCase().trim()
  if (role === "doctor") return "physician"
  return role
}

export function isClinicWebRole(value: string | null | undefined): value is WebRole {
  const role = normalizeClinicRole(value)
  if (!role) return false
  return (CLINIC_ROLES as readonly string[]).includes(role)
}

/**
 * Resolve clinic RBAC role from users.
 * Prefer `primary_role` (web_role). No silent default.
 */
export function resolveClinicRole(
  profile: ProfileRoleFields | null | undefined
): ClinicDesignation | null {
  if (!profile) return null

  const primary = normalizeClinicRole(profile.primary_role)
  if (primary && isClinicWebRole(primary)) return primary

  return null
}

/** Active clinic staff with a resolved RBAC role may enter the staff shell. */
export function hasApprovedClinicAccess(
  profile: ProfileRoleFields | null | undefined
): boolean {
  if (!profile) return false
  if (profile.is_active === false) return false
  return resolveClinicRole(profile) !== null
}

/** Same gate as approved access for this schema (no account_status column). */
export function canUseWebApp(
  profile: ProfileRoleFields | null | undefined
): boolean {
  return hasApprovedClinicAccess(profile)
}
