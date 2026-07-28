import type { ClinicDesignation } from "@/lib/auth/types"

/** Clinic roles that own a staff shell under `/{role}/*`. */
export const STAFF_ROUTE_ROLES = [
  "admin",
  "nurse",
  "physician",
  "dentist",
] as const

export type StaffRouteRole = (typeof STAFF_ROUTE_ROLES)[number]

export function isStaffRouteRole(
  value: string
): value is StaffRouteRole {
  return (STAFF_ROUTE_ROLES as readonly string[]).includes(value)
}

/** Post-login / home URL for a clinic designation. */
export function homePathForDesignation(
  designation: ClinicDesignation
): string {
  if (designation === "queue_display") {
    return "/queue-management/display"
  }
  if (
    designation === "admin" ||
    designation === "nurse" ||
    designation === "physician" ||
    designation === "dentist"
  ) {
    return `/${designation}/dashboard`
  }
  return `/${designation}`
}

/** Base path for sidebar links (`/nurse`, `/admin`, …). */
export function staffBasePath(designation: ClinicDesignation): string {
  if (designation === "queue_display") {
    return "/queue-management"
  }
  return `/${designation}`
}

/** True when pathname is a staff role area or queue-management. */
export function isStaffAreaPath(pathname: string): boolean {
  if (
    pathname === "/queue-management" ||
    pathname.startsWith("/queue-management/")
  ) {
    return true
  }
  return STAFF_ROUTE_ROLES.some(
    (role) => pathname === `/${role}` || pathname.startsWith(`/${role}/`)
  )
}

/**
 * Strip `/{role}` or `/queue-management` prefix, leaving `""` or `"/queue"`.
 */
export function stripStaffBasePath(pathname: string): string {
  if (
    pathname === "/queue-management" ||
    pathname.startsWith("/queue-management/")
  ) {
    const rest = pathname.slice("/queue-management".length)
    return rest || ""
  }

  for (const role of STAFF_ROUTE_ROLES) {
    const prefix = `/${role}`
    if (pathname === prefix) return ""
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length)
    }
  }

  return pathname
}
