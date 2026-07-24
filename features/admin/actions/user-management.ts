"use server"

import { getStaffAccess } from "@/lib/auth/access"
import type { WebRole } from "@/lib/auth/types"
import { createAdminClient } from "@/lib/supabase/admin"

type ManagedRole = Extract<WebRole, "nurse" | "physician" | "dentist">
type UserStatusFilter = "all" | "active" | "inactive"

const MANAGED_ROLES: ManagedRole[] = ["nurse", "physician", "dentist"]

type StaffProfileRow = {
  id: string
  full_name: string | null
  email: string
  primary_role: ManagedRole
  is_active: boolean
}

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
}

export type CreateStaffUserInput = {
  fullName: string
  email: string
  role: ManagedRole
}

export type SetStaffUserActiveInput = {
  userId: string
  isActive: boolean
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function normalizeSearch(input?: string): string {
  return (input ?? "").trim().toLowerCase()
}

function deriveDisplayName(profile: StaffProfileRow): string {
  const name = profile.full_name?.trim()
  if (name) return name
  const [prefix] = profile.email.split("@")
  return prefix || profile.email
}

async function requireAdmin() {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "admin") {
    return { ok: false as const, error: "Only admins can manage user accounts." }
  }
  return { ok: true as const }
}

async function resolveDefaultClinicId() {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("clinics")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error("Could not resolve clinic for new staff user.")
  }

  return data?.id ?? null
}

function getAdminClientSafe() {
  try {
    return { ok: true as const, client: createAdminClient() }
  } catch {
    return {
      ok: false as const,
      error:
        "Admin user management is not configured yet. Set SUPABASE_SERVICE_ROLE_KEY in your environment.",
    }
  }
}

function summarize(users: ManagedStaffUser[]): StaffDirectorySummary {
  return users.reduce<StaffDirectorySummary>(
    (acc, user) => {
      acc.total += 1
      if (user.isActive) acc.active += 1
      if (!user.isActive) acc.inactive += 1
      if (user.role === "nurse") acc.nurses += 1
      if (user.role === "physician") acc.physicians += 1
      if (user.role === "dentist") acc.dentists += 1
      return acc
    },
    {
      total: 0,
      active: 0,
      inactive: 0,
      nurses: 0,
      physicians: 0,
      dentists: 0,
    }
  )
}

function roleWriteCandidates(role: ManagedRole): string[] {
  if (role === "nurse") return ["nurse"]
  if (role === "physician") return ["physician", "doctor"]
  return ["dentist"]
}

export async function listStaffUsers(
  input: ListStaffUsersInput = {}
): Promise<ListStaffUsersResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const query = normalizeSearch(input.query)
  const status: UserStatusFilter = input.status ?? "all"
  const role: ManagedRole | "all" = input.role ?? "all"
  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data: profileRows, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, primary_role, is_active")
    .in("primary_role", MANAGED_ROLES)

  if (profileError) {
    return {
      ok: false,
      error: `Could not load user directory. ${profileError.message}`,
    }
  }

  const rows = (profileRows ?? []) as StaffProfileRow[]
  const userIds = rows.map((row) => row.id)

  const membershipSet = new Set<string>()
  if (userIds.length > 0) {
    const { data: membershipRows, error: membershipError } = await adminClient
      .from("clinic_members")
      .select("profile_id")
      .in("profile_id", userIds)
      .eq("is_active", true)

    if (membershipError) {
      return {
        ok: false,
        error: `Could not load clinic membership status. ${membershipError.message}`,
      }
    }

    for (const row of membershipRows ?? []) {
      if (row.profile_id) membershipSet.add(row.profile_id)
    }
  }

  const users = rows
    .map((row) => ({
      id: row.id,
      fullName: deriveDisplayName(row),
      email: row.email,
      role: row.primary_role,
      isActive: row.is_active,
      hasClinicMembership: membershipSet.has(row.id),
    }))
    .filter((user) => {
      if (role !== "all" && user.role !== role) return false
      if (status === "active" && !user.isActive) return false
      if (status === "inactive" && user.isActive) return false
      if (!query) return true

      const target = `${user.fullName} ${user.email}`.toLowerCase()
      return target.includes(query)
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  return {
    ok: true,
    users,
    summary: summarize(users),
    filters: { query: input.query?.trim() ?? "", status, role },
  }
}

export async function createStaffUser(
  input: CreateStaffUserInput
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()

  if (!fullName) {
    return { ok: false, error: "Enter a full name." }
  }

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." }
  }

  if (!MANAGED_ROLES.includes(input.role)) {
    return { ok: false, error: "Choose a valid role." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback`,
      data: {
        full_name: fullName,
        primary_role: input.role,
      },
    })

  const userId = inviteData.user?.id ?? null
  let warning: string | undefined

  if (inviteError) {
    return { ok: false, error: inviteError.message }
  }

  if (!userId) {
    return {
      ok: false,
      error:
        "User invite was sent but account details were missing. Try again or check Supabase auth settings.",
    }
  }

  let savedProfile = false
  let profileWriteError: string | null = null
  for (const roleCandidate of roleWriteCandidates(input.role)) {
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        primary_role: roleCandidate,
        is_active: true,
      },
      { onConflict: "id" }
    )

    if (!profileError) {
      savedProfile = true
      break
    }
    profileWriteError = profileError.message
  }

  if (!savedProfile) {
    return {
      ok: false,
      error: `Could not save user profile details. ${profileWriteError ?? ""}`.trim(),
    }
  }

  let clinicId: string | null = null
  try {
    clinicId = await resolveDefaultClinicId()
  } catch {
    warning =
      "User was created, but clinic assignment could not be resolved automatically."
    return {
      ok: true,
      message: "User account created and invite email sent.",
      warning,
    }
  }
  if (!clinicId) {
    warning =
      "User was created, but no clinic exists yet. Assign clinic membership to avoid pending access."
    return {
      ok: true,
      message: "User account created and invite email sent.",
      warning,
    }
  }

  const { error: membershipError } = await adminClient
    .from("clinic_members")
    .upsert(
      { profile_id: userId, clinic_id: clinicId, is_active: true },
      { onConflict: "profile_id,clinic_id" }
    )

  if (membershipError) {
    warning =
      "User was created, but clinic membership could not be assigned automatically."
  }

  return {
    ok: true,
    message: "User account created and invite email sent.",
    warning,
  }
}

export async function setStaffUserActive(
  input: SetStaffUserActiveInput
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const userId = input.userId.trim()
  if (!userId) {
    return { ok: false, error: "Missing user identifier." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client
  const { data, error } = await adminClient
    .from("profiles")
    .update({ is_active: input.isActive })
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: "Could not update user status." }
  }

  return {
    ok: true,
    message: input.isActive
      ? "User account has been activated."
      : "User account has been deactivated.",
  }
}
