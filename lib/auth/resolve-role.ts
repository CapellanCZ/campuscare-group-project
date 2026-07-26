import type { ClinicDesignation, WebRole } from "@/lib/auth/types"

const CLINIC_ROLES = [
  "admin",
  "nurse",
  "physician",
  "dentist",
  "queue_display",
] as const satisfies readonly ClinicDesignation[]

/** Fields that exist on live `profiles` for RBAC gates. */
export type ProfileRoleFields = {
  primary_role?: string | null
  is_active?: boolean | null
}

export function isClinicWebRole(value: string | null | undefined): value is WebRole {
  if (!value) return false
  return (CLINIC_ROLES as readonly string[]).includes(value.toLowerCase().trim())
}

/**
 * Resolve clinic RBAC role from profiles.
 * Prefer `primary_role` (web_role). No silent default.
 */
export function resolveClinicRole(
  profile: ProfileRoleFields | null | undefined
): ClinicDesignation | null {
  if (!profile) return null

  const primary = (profile.primary_role ?? "").toLowerCase().trim()
  if (isClinicWebRole(primary)) return primary

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
