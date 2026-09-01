import type { WebRole } from "@/lib/auth/types"

export type BreakMode = "clinic" | "staff"

/** Clinic-wide break for admins; personal staff break for clinical roles. */
export function breakModeForRole(role: WebRole): BreakMode | null {
  if (role === "admin") return "clinic"
  if (role === "nurse" || role === "physician" || role === "dentist") {
    return "staff"
  }
  return null
}

export function canUseClinicBreak(
  role: WebRole | null | undefined,
  mode: BreakMode | null
): boolean {
  return mode === "clinic" && role === "admin"
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
