import type { WebRole } from "@/lib/auth/types"

export type BreakMode = "clinic" | "staff"

/**
 * Personal staff break for clinical roles only.
 * Admin is oversight-only and does not participate in duty/break.
 */
export function breakModeForRole(role: WebRole): BreakMode | null {
  if (role === "nurse" || role === "physician" || role === "dentist") {
    return "staff"
  }
  return null
}

export function canUseClinicBreak(
  _role: WebRole | null | undefined,
  _mode: BreakMode | null
): boolean {
  return false
}

export function canUseStaffBreak(
  role: WebRole | null | undefined,
  mode: BreakMode | null
): boolean {
  return (
    mode === "staff" &&
    (role === "nurse" || role === "physician" || role === "dentist")
  )
}
