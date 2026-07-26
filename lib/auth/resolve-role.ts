import type { ClinicDesignation, WebRole } from "@/lib/auth/types"

const CLINIC_ROLES = [
  "admin",
  "nurse",
  "physician",
  "dentist",
  "queue_display",
] as const satisfies readonly ClinicDesignation[]

export type ProfileRoleFields = {
  primary_role?: string | null
  designation?: string | null
  role?: string | null
  user_role?: string | null
  account_status?: string | null
}

export function isClinicWebRole(value: string | null | undefined): value is WebRole {
  if (!value) return false
  return (CLINIC_ROLES as readonly string[]).includes(value.toLowerCase().trim())
}

/**
 * Resolve clinic RBAC role from profiles.
 * Prefer `primary_role` (web_role), then `designation`. No silent default —
 * missing role means the user is not a clinic web staff member.
 */
export function resolveClinicRole(
  profile: ProfileRoleFields | null | undefined
): ClinicDesignation | null {
  if (!profile) return null

  const primary = (profile.primary_role ?? "").toLowerCase().trim()
  if (isClinicWebRole(primary)) return primary

  const designation = (profile.designation ?? "").toLowerCase().trim()
  if (isClinicWebRole(designation)) return designation

  return null
}

export function hasApprovedClinicAccess(
  profile: ProfileRoleFields | null | undefined
): boolean {
  if (!profile) return false
  const status = (profile.account_status ?? "").toLowerCase().trim()
  if (status !== "approved") return false
  if ((profile.user_role ?? "").toLowerCase().trim() === "student") return false
  return resolveClinicRole(profile) !== null
}

export function canUseWebApp(
  profile: ProfileRoleFields | null | undefined
): boolean {
  const status = (profile?.account_status ?? "").toLowerCase().trim()
  return status === "approved" || status === "pending"
}
