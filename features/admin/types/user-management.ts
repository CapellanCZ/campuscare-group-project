import type { WebRole } from "@/lib/auth/types"

export type ManagedRole = Extract<
  WebRole,
  "admin" | "nurse" | "physician" | "dentist"
>

export type UserStatusFilter = "all" | "active" | "invited" | "inactive"

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

/** Derived account state for the directory. */
export type AccountLifecycleStatus = "active" | "invited" | "inactive"

export type ManagedStaffUser = {
  id: string
  fullName: string
  email: string
  role: ManagedRole
  isActive: boolean
  /** Invite/re-invite sent; clears to Active after they sign in. */
  invitePending: boolean
  hasClinicMembership: boolean
  /** ISO timestamp from Auth, or null if never signed in. */
  lastSignInAt: string | null
  status: AccountLifecycleStatus
}

export type StaffDirectorySummary = {
  total: number
  active: number
  invited: number
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
  licenseNumber?: string | null
  /** When set, create is rejected if role is outside this list. */
  allowedRoles?: ManagedRole[]
}

export type SetStaffUserActiveInput = {
  userId: string
  isActive: boolean
}

export type UpdateStaffUserRoleInput = {
  userId: string
  role: ManagedRole
  allowedRoles?: ManagedRole[]
}

export type StaffScheduleSlotInput = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive?: boolean
}

export type UpdateStaffUserInput = {
  userId: string
  fullName: string
  email: string
  role: ManagedRole
  licenseNumber?: string | null
  allowedRoles?: ManagedRole[]
  /** When provided (clinic staff), replaces weekly office hours. */
  scheduleSlots?: StaffScheduleSlotInput[]
}

export type StaffUserEditData = {
  userId: string
  fullName: string
  email: string
  role: ManagedRole
  isActive: boolean
  licenseNumber: string | null
  scheduleSlots: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>
}

export const LICENSED_PROFESSIONAL_ROLES: ManagedRole[] = [
  "physician",
  "dentist",
  "nurse",
]

export function isLicensedProfessionalRole(role: ManagedRole): boolean {
  return (LICENSED_PROFESSIONAL_ROLES as readonly string[]).includes(role)
}

export type AssignClinicMembershipInput = {
  userId: string
}

export type ResendStaffInviteInput = {
  userId: string
}

export type DeleteStaffUserInput = {
  userId: string
}

export type ImportStaffUsersInput = {
  allowedRoles?: ManagedRole[]
}
