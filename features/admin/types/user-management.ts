import type { WebRole } from "@/lib/auth/types"

export type ManagedRole = Extract<
  WebRole,
  "admin" | "nurse" | "physician" | "dentist"
>

export type UserStatusFilter = "all" | "active" | "inactive"

export const MANAGED_ROLES: ManagedRole[] = [
  "admin",
  "nurse",
  "physician",
  "dentist",
]

export const ADMIN_DIRECTORY_ROLES: ManagedRole[] = ["admin"]

export const STAFF_DIRECTORY_ROLES: ManagedRole[] = [
  "nurse",
  "physician",
  "dentist",
]

export type ManagedStaffUser = {
  id: string
  fullName: string
  email: string
  role: ManagedRole
  isActive: boolean
  hasClinicMembership: boolean
}

export type StaffDirectorySummary = {
  total: number
  active: number
  inactive: number
  admins: number
  nurses: number
  physicians: number
  dentists: number
}

export type ListStaffUsersResult =
  | {
      ok: true
      users: ManagedStaffUser[]
      summary: StaffDirectorySummary
      filters: {
        query: string
        status: UserStatusFilter
        role: ManagedRole | "all"
      }
    }
  | { ok: false; error: string }

export type ManageUserResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string }

export type ListStaffUsersInput = {
  query?: string
  status?: UserStatusFilter
  role?: ManagedRole | "all"
  /** When set, only these roles are included in the directory query. */
  roles?: ManagedRole[]
}

export type CreateStaffUserInput = {
  fullName: string
  email: string
  role: ManagedRole
  /** When set, create is rejected if role is outside this list. */
  allowedRoles?: ManagedRole[]
}

export type SetStaffUserActiveInput = {
  userId: string
  isActive: boolean
}

export type ImportStaffUsersInput = {
  allowedRoles?: ManagedRole[]
}
