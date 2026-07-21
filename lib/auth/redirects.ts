import type { WebRole } from "@/lib/auth/types"

export const ROLE_DASHBOARD_PATHS: Record<WebRole, string> = {
  admin: "/admin/dashboard",
  nurse: "/nurse/dashboard",
  physician: "/physician/dashboard",
  dentist: "/dentist/dashboard",
}

const ROLE_PREFIXES: Record<WebRole, string> = {
  admin: "/admin",
  nurse: "/nurse",
  physician: "/physician",
  dentist: "/dentist",
}

const PREFIX_TO_ROLE = new Map<string, WebRole>(
  Object.entries(ROLE_PREFIXES).map(([role, prefix]) => [prefix, role as WebRole])
)

export function dashboardPathForRole(role: WebRole): string {
  return ROLE_DASHBOARD_PATHS[role]
}

export function roleFromPathname(pathname: string): WebRole | null {
  for (const [prefix, role] of PREFIX_TO_ROLE.entries()) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return role
    }
  }
  return null
}

export function isProtectedRolePath(pathname: string): boolean {
  return roleFromPathname(pathname) !== null
}

export function isRolePathAllowed(pathname: string, role: WebRole): boolean {
  const pathRole = roleFromPathname(pathname)
  if (!pathRole) return false
  return pathRole === role
}

export function roleRequiresClinicMembership(role: WebRole): boolean {
  return role !== "admin"
}
