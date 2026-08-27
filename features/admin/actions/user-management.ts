"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { sendStaffInviteEmail } from "@/lib/auth/send-staff-invite"
import { normalizeTimeHm } from "@/lib/availability/rules"
import { seedDefaultStaffHours } from "@/lib/availability/seed-defaults"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  MANAGED_ROLES,
  type AccountLifecycleStatus,
  type AssignClinicMembershipInput,
  type CreateStaffUserInput,
  type DeleteStaffUserInput,
  type ListStaffUsersInput,
  type ListStaffUsersResult,
  type ManagedRole,
  type ManagedStaffUser,
  type ManageUserResult,
  type ResendStaffInviteInput,
  type SetStaffUserActiveInput,
  type StaffDirectorySummary,
  type StaffUserEditData,
  type UpdateStaffUserInput,
  type UpdateStaffUserRoleInput,
  type UserStatusFilter,
  isLicensedProfessionalRole,
} from "@/features/admin/types/user-management"

type StaffProfileRow = {
  id: string
  full_name: string | null
  email: string
  primary_role: ManagedRole
  is_active: boolean
  invite_pending: boolean
}

type AdminClient = ReturnType<typeof createAdminClient>

type ImportStaffUsersOptions = {
  allowedRoles?: ManagedRole[]
}

function normalizeLicenseNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed || null
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

/**
 * Single-clinic campus: resolve clinic_id from existing memberships only.
 * Do not query a clinics catalog as the source of truth for new memberships.
 */
async function resolveClinicIdForMembership(
  adminClient: AdminClient,
  userId: string
): Promise<string | null> {
  const { data: existing } = await adminClient
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (existing?.clinic_id) return existing.clinic_id

  const { resolveCampusClinicId } = await import("@/lib/auth/campus-clinic")
  return resolveCampusClinicId(adminClient)
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
      if (user.status === "active") acc.active += 1
      if (user.status === "invited") acc.invited += 1
      if (user.status === "inactive") acc.inactive += 1
      if (user.role === "admin") acc.admins += 1
      if (user.role === "nurse") acc.nurses += 1
      if (user.role === "physician") acc.physicians += 1
      if (user.role === "dentist") acc.dentists += 1
      return acc
    },
    {
      total: 0,
      active: 0,
      invited: 0,
      inactive: 0,
      admins: 0,
      nurses: 0,
      physicians: 0,
      dentists: 0,
    }
  )
}

function resolveAccountStatus(
  isActive: boolean,
  lastSignInAt: string | null,
  invitePending = false
): AccountLifecycleStatus {
  if (!isActive) return "inactive"
  // Re-invite (or first invite) stays Invited until they sign in again.
  if (invitePending || !lastSignInAt) return "invited"
  return "active"
}

function resolveScopedRoles(roles?: ManagedRole[]): ManagedRole[] {
  if (!roles || roles.length === 0) return MANAGED_ROLES
  return roles.filter((role) => MANAGED_ROLES.includes(role))
}

/** Persist RBAC role in app_metadata (not user-editable) + display fields. */
async function syncAuthRoleMetadata(
  adminClient: AdminClient,
  userId: string,
  role: ManagedRole,
  fullName?: string | null
) {
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { primary_role: role },
    user_metadata: {
      primary_role: role,
      ...(fullName ? { full_name: fullName } : {}),
    },
  })
  return error
}

async function upsertAdminAccount(
  adminClient: AdminClient,
  userId: string,
  isActive = true
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Admins are never clinic_members — keep directories separate.
  await adminClient.from("clinic_members").delete().eq("user_id", userId)

  const { error } = await adminClient.from("admin_accounts").upsert(
    {
      user_id: userId,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return {
      ok: false,
      error: `Could not save admin account. ${error.message}`,
    }
  }

  return { ok: true }
}

async function upsertClinicMembership(
  adminClient: AdminClient,
  userId: string,
  role: ManagedRole,
  isActive = true
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (role === "admin") {
    return upsertAdminAccount(adminClient, userId, isActive)
  }

  // Staff never belong in admin_accounts.
  await adminClient.from("admin_accounts").delete().eq("user_id", userId)

  const { data: existingRows, error: existingError } = await adminClient
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", userId)

  if (existingError) {
    return {
      ok: false,
      error: `Could not load clinic membership. ${existingError.message}`,
    }
  }

  if (existingRows && existingRows.length > 0) {
    const { error: updateError } = await adminClient
      .from("clinic_members")
      .update({ member_role: role, is_active: isActive })
      .eq("user_id", userId)

    if (updateError) {
      return {
        ok: false,
        error: `Could not update clinic membership. ${updateError.message}`,
      }
    }

    return { ok: true }
  }

  const clinicId = await resolveClinicIdForMembership(adminClient, userId)
  if (!clinicId) {
    return {
      ok: false,
      error:
        "Could not resolve campus clinic id for membership. Check patients or existing members.",
    }
  }

  const { error } = await adminClient.from("clinic_members").upsert(
    {
      user_id: userId,
      clinic_id: clinicId,
      member_role: role,
      is_active: isActive,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return {
      ok: false,
      error: `Could not assign clinic membership. ${error.message}`,
    }
  }

  return { ok: true }
}

export async function listStaffUsers(
  input: ListStaffUsersInput = {}
): Promise<ListStaffUsersResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const query = normalizeSearch(input.query)
  const status: UserStatusFilter = input.status ?? "all"
  const scopedRoles = resolveScopedRoles(input.roles)
  const requestedRole: ManagedRole | "all" = input.role ?? "all"
  const role: ManagedRole | "all" =
    requestedRole !== "all" && scopedRoles.includes(requestedRole)
      ? requestedRole
      : "all"
  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data: profileRows, error: profileError } = await adminClient
    .from("users")
    .select("id, full_name, email, primary_role, is_active, invite_pending")
    .in("primary_role", scopedRoles)

  if (profileError) {
    return {
      ok: false,
      error: `Could not load user directory. ${profileError.message}`,
    }
  }

  let rows = (profileRows ?? []) as StaffProfileRow[]
  const listingAdmins = scopedRoles.length === 1 && scopedRoles[0] === "admin"

  // Staff directory = clinic_members only. Admin directory = admin_accounts only.
  if (listingAdmins) {
    const { data: adminRows, error: adminError } = await adminClient
      .from("admin_accounts")
      .select("user_id")

    if (adminError) {
      return {
        ok: false,
        error: `Could not load admin accounts. ${adminError.message}`,
      }
    }

    const adminIds = new Set(
      (adminRows ?? []).map((row) => row.user_id as string)
    )
    rows = rows.filter((row) => adminIds.has(row.id))
  } else {
    const { data: memberRows, error: memberError } = await adminClient
      .from("clinic_members")
      .select("user_id, member_role")
      .in("member_role", scopedRoles)

    if (memberError) {
      return {
        ok: false,
        error: `Could not load clinic members. ${memberError.message}`,
      }
    }

    const memberIds = new Set(
      (memberRows ?? []).map((row) => row.user_id as string)
    )
    rows = rows.filter(
      (row) => memberIds.has(row.id) && row.primary_role !== "admin"
    )
  }

  const userIds = rows.map((row) => row.id)

  const membershipSet = new Set<string>()
  if (listingAdmins) {
    for (const id of userIds) membershipSet.add(id)
  } else if (userIds.length > 0) {
    const { data: membershipRows, error: membershipError } = await adminClient
      .from("clinic_members")
      .select("user_id")
      .in("user_id", userIds)
      .eq("is_active", true)

    if (membershipError) {
      return {
        ok: false,
        error: `Could not load clinic membership status. ${membershipError.message}`,
      }
    }

    for (const row of membershipRows ?? []) {
      if (row.user_id) membershipSet.add(row.user_id)
    }
  }

  const lastSignInById = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: authData, error: authError } =
      await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })

    if (authError) {
      return {
        ok: false,
        error: `Could not load invite status. ${authError.message}`,
      }
    }

    for (const authUser of authData.users) {
      lastSignInById.set(authUser.id, authUser.last_sign_in_at ?? null)
    }
  }

  const users = rows
    .map((row) => {
      const lastSignInAt = lastSignInById.get(row.id) ?? null
      const invitePending = row.invite_pending === true
      const accountStatus = resolveAccountStatus(
        row.is_active,
        lastSignInAt,
        invitePending
      )
      return {
        id: row.id,
        fullName: deriveDisplayName(row),
        email: row.email,
        role: row.primary_role,
        isActive: row.is_active,
        invitePending: accountStatus === "invited",
        hasClinicMembership: membershipSet.has(row.id),
        lastSignInAt,
        status: accountStatus,
      } satisfies ManagedStaffUser
    })
    .filter((user) => {
      if (role !== "all" && user.role !== role) return false
      if (status === "active" && user.status !== "active") return false
      if (status === "invited" && user.status !== "invited") return false
      if (status === "inactive" && user.status !== "inactive") return false
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

  const allowedRoles = resolveScopedRoles(input.allowedRoles)
  if (!allowedRoles.includes(input.role)) {
    return { ok: false, error: "Choose a valid role for this directory." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  // Create the Auth user without Supabase's built-in mailer — we deliver via Resend.
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        primary_role: input.role,
      },
      app_metadata: {
        primary_role: input.role,
      },
    })

  if (createError) {
    const already = /already|registered|exists/i.test(createError.message)
    if (already) {
      return {
        ok: false,
        error:
          "An account with this email already exists. Use Resend invite from the row menu instead.",
      }
    }
    return { ok: false, error: createError.message }
  }

  const userId = created.user?.id ?? null
  if (!userId) {
    return {
      ok: false,
      error:
        "User was created but account details were missing. Try again or check Supabase auth settings.",
    }
  }

  // Server-controlled role claim — never rely on user_metadata alone for authz.
  const metaError = await syncAuthRoleMetadata(
    adminClient,
    userId,
    input.role,
    fullName
  )
  if (metaError) {
    return {
      ok: false,
      error: `Account created but role metadata could not be saved. ${metaError.message}`,
    }
  }

  const { error: profileError } = await adminClient.from("users").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      primary_role: input.role,
      is_active: true,
      invite_pending: true,
      license_number: isLicensedProfessionalRole(input.role)
        ? normalizeLicenseNumber(input.licenseNumber)
        : null,
    },
    { onConflict: "id" }
  )

  if (profileError) {
    return {
      ok: false,
      error: `Could not save user profile details. ${profileError.message}`,
    }
  }

  const membership = await upsertClinicMembership(
    adminClient,
    userId,
    input.role,
    true
  )
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
    }
  }

  if (input.role !== "admin") {
    await seedDefaultStaffHours(adminClient, userId, input.role)
  }

  try {
    await sendStaffInviteEmail({
      email,
      fullName,
      role: input.role,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send invite email."
    return {
      ok: true,
      message: "User account created, but the invite email failed to send.",
      warning: `${message} Use Resend invite from the row menu after checking RESEND_API_KEY.`,
    }
  }

  return {
    ok: true,
    message: "User account created and invite email sent via Resend.",
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

  const { data: profile, error: profileLookupError } = await adminClient
    .from("users")
    .select("id, primary_role")
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (profileLookupError || !profile) {
    return { ok: false, error: "Could not update user status." }
  }

  const { data, error } = await adminClient
    .from("users")
    .update({
      is_active: input.isActive,
      // Deactivate clears a pending invite; Activate alone restores prior access
      // (Active if they already signed in). Use Resend invite to reopen as Invited.
      ...(input.isActive ? {} : { invite_pending: false }),
    })
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: "Could not update user status." }
  }

  const { error: membershipError } =
    profile.primary_role === "admin"
      ? await adminClient
          .from("admin_accounts")
          .update({ is_active: input.isActive })
          .eq("user_id", userId)
      : await adminClient
          .from("clinic_members")
          .update({ is_active: input.isActive })
          .eq("user_id", userId)

  if (membershipError) {
    return {
      ok: false,
      error: `Profile updated, but access could not be synced. ${membershipError.message}`,
    }
  }

  // Ban revoked sessions from using Auth while deactivated.
  const { error: banError } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      ban_duration: input.isActive ? "none" : "876000h",
    }
  )

  if (banError) {
    return {
      ok: false,
      error: `Access flag updated, but auth ban could not be synced. ${banError.message}`,
    }
  }

  return {
    ok: true,
    message: input.isActive
      ? "User account has been activated."
      : "User account has been deactivated.",
  }
}

export async function updateStaffUserRole(
  input: UpdateStaffUserRoleInput
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const userId = input.userId.trim()
  if (!userId) {
    return { ok: false, error: "Missing user identifier." }
  }

  const allowedRoles = resolveScopedRoles(input.allowedRoles)
  if (!allowedRoles.includes(input.role)) {
    return { ok: false, error: "Choose a valid role for this directory." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data, error } = await adminClient
    .from("users")
    .update({ primary_role: input.role })
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .select("id, full_name, is_active")
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      error: `Could not update role. ${error?.message ?? "Profile not found."}`,
    }
  }

  const metaError = await syncAuthRoleMetadata(
    adminClient,
    userId,
    input.role,
    data.full_name
  )
  if (metaError) {
    return {
      ok: false,
      error: `Profile role updated, but auth metadata failed. ${metaError.message}`,
    }
  }

  const membership = await upsertClinicMembership(
    adminClient,
    userId,
    input.role,
    data.is_active !== false
  )
  if (!membership.ok) {
    return { ok: false, error: membership.error }
  }

  return {
    ok: true,
    message: `Role updated to ${input.role}.`,
  }
}

export async function getStaffUserForEdit(
  userId: string
): Promise<
  { ok: true; data: StaffUserEditData } | { ok: false; error: string }
> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const id = userId.trim()
  if (!id) return { ok: false, error: "Missing user identifier." }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data: profile, error } = await adminClient
    .from("users")
    .select("id, full_name, email, primary_role, is_active, license_number")
    .eq("id", id)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (error || !profile) {
    return { ok: false, error: "Could not load this user." }
  }

  const { data: slots } = await adminClient
    .from("doctor_availability")
    .select("id, day_of_week, start_time, end_time, is_active")
    .eq("doctor_id", id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })

  return {
    ok: true,
    data: {
      userId: profile.id,
      fullName: profile.full_name?.trim() || profile.email,
      email: profile.email,
      role: profile.primary_role as ManagedRole,
      isActive: profile.is_active !== false,
      licenseNumber: (profile.license_number as string | null) ?? null,
      scheduleSlots: (slots ?? []).map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: String(slot.start_time).slice(0, 5),
        endTime: String(slot.end_time).slice(0, 5),
        isActive: slot.is_active !== false,
      })),
    },
  }
}

export async function updateStaffUser(
  input: UpdateStaffUserInput
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const userId = input.userId.trim()
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()

  if (!userId) return { ok: false, error: "Missing user identifier." }
  if (!fullName) return { ok: false, error: "Enter a full name." }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." }
  }

  const allowedRoles = resolveScopedRoles(input.allowedRoles)
  if (!allowedRoles.includes(input.role)) {
    return { ok: false, error: "Choose a valid role for this directory." }
  }

  if (input.scheduleSlots) {
    for (const slot of input.scheduleSlots) {
      if (
        normalizeTimeHm(slot.endTime) <= normalizeTimeHm(slot.startTime) ||
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6
      ) {
        return {
          ok: false,
          error: "Each schedule slot needs a valid day and end time after start.",
        }
      }
    }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data: existing, error: lookupError } = await adminClient
    .from("users")
    .select("id, email, primary_role, is_active")
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (lookupError || !existing) {
    return { ok: false, error: "Could not find this user." }
  }

  if (email !== existing.email.trim().toLowerCase()) {
    const { data: emailTaken } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", userId)
      .maybeSingle()

    if (emailTaken) {
      return { ok: false, error: "Another account already uses that email." }
    }
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      email,
      email_confirm: true,
      app_metadata: { primary_role: input.role },
      user_metadata: {
        primary_role: input.role,
        full_name: fullName,
      },
    }
  )

  if (authError) {
    return {
      ok: false,
      error: `Could not update auth account. ${authError.message}`,
    }
  }

  const { error: profileError } = await adminClient
    .from("users")
    .update({
      full_name: fullName,
      email,
      primary_role: input.role,
      license_number: isLicensedProfessionalRole(input.role)
        ? normalizeLicenseNumber(input.licenseNumber)
        : null,
    })
    .eq("id", userId)

  if (profileError) {
    return {
      ok: false,
      error: `Auth updated, but profile save failed. ${profileError.message}`,
    }
  }

  const membership = await upsertClinicMembership(
    adminClient,
    userId,
    input.role,
    existing.is_active !== false
  )
  if (!membership.ok) {
    return { ok: false, error: membership.error }
  }

  if (input.role === "admin") {
    await adminClient.from("doctor_availability").delete().eq("doctor_id", userId)
  } else if (input.scheduleSlots) {
    await adminClient.from("doctor_availability").delete().eq("doctor_id", userId)
    if (input.scheduleSlots.length > 0) {
      const { error: scheduleError } = await adminClient
        .from("doctor_availability")
        .insert(
          input.scheduleSlots.map((slot) => ({
            clinic_id: CAMPUS_CLINIC_ID,
            doctor_id: userId,
            day_of_week: slot.dayOfWeek,
            start_time: normalizeTimeHm(slot.startTime),
            end_time: normalizeTimeHm(slot.endTime),
            timezone: "Asia/Manila",
            is_active: slot.isActive ?? true,
          }))
        )
      if (scheduleError) {
        return {
          ok: false,
          error: `Profile saved, but schedule could not be updated. ${scheduleError.message}`,
        }
      }
    }
  } else if (existing.primary_role !== input.role) {
    await adminClient.from("doctor_availability").delete().eq("doctor_id", userId)
    await seedDefaultStaffHours(adminClient, userId, input.role)
  }

  return {
    ok: true,
    message: "Staff details updated.",
  }
}

export async function assignClinicMembership(
  input: AssignClinicMembershipInput
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

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("id, primary_role, is_active")
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (profileError || !profile) {
    return { ok: false, error: "User not found in the directory." }
  }

  const membership = await upsertClinicMembership(
    adminClient,
    userId,
    profile.primary_role as ManagedRole,
    profile.is_active !== false
  )
  if (!membership.ok) {
    return { ok: false, error: membership.error }
  }

  return { ok: true, message: "Clinic membership assigned." }
}

export async function resendStaffInvite(
  input: ResendStaffInviteInput
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

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("email, full_name, primary_role, is_active")
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (profileError || !profile?.email) {
    return { ok: false, error: "Could not find that user's email." }
  }

  const role = profile.primary_role as ManagedRole

  // Re-invite reopens access and resets lifecycle to Invited until they sign in.
  const { error: reopenError } = await adminClient
    .from("users")
    .update({ is_active: true, invite_pending: true })
    .eq("id", userId)

  if (reopenError) {
    return {
      ok: false,
      error: `Could not reopen account for invite. ${reopenError.message}`,
    }
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(
    userId,
    { ban_duration: "none" }
  )
  if (banError) {
    return {
      ok: false,
      error: `Invite prepared, but auth access could not be restored. ${banError.message}`,
    }
  }

  // Ensure membership + role metadata stay intact before invite mail.
  await syncAuthRoleMetadata(
    adminClient,
    userId,
    role,
    profile.full_name
  )
  const membership = await upsertClinicMembership(
    adminClient,
    userId,
    role,
    true
  )
  if (!membership.ok) {
    return { ok: false, error: membership.error }
  }

  try {
    await sendStaffInviteEmail({
      email: profile.email,
      fullName: profile.full_name ?? profile.email,
      role,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send invite email."
    return { ok: false, error: message }
  }

  return {
    ok: true,
    message: "Invite resent. Status set to Invited until they sign in.",
  }
}

export async function deleteStaffUser(
  input: DeleteStaffUserInput
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const userId = input.userId.trim()
  if (!userId) {
    return { ok: false, error: "Missing user identifier." }
  }

  const access = await getStaffAccess()
  if (!access) {
    return { ok: false, error: "Only admins can manage user accounts." }
  }

  if (access.userId === userId) {
    return { ok: false, error: "You cannot delete your own account." }
  }

  const adminClientResult = getAdminClientSafe()
  if (!adminClientResult.ok) {
    return { ok: false, error: adminClientResult.error }
  }
  const adminClient = adminClientResult.client

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("id, email, primary_role")
    .eq("id", userId)
    .in("primary_role", MANAGED_ROLES)
    .maybeSingle()

  if (profileError || !profile) {
    return { ok: false, error: "User not found in the directory." }
  }

  // Auth delete cascades to users + clinic_members.
  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    return {
      ok: false,
      error: `Could not delete account. ${deleteError.message}`,
    }
  }

  return {
    ok: true,
    message: `${profile.email} has been permanently deleted.`,
  }
}

export async function importStaffUsersFromExcel(
  formData: FormData,
  options: ImportStaffUsersOptions = {}
): Promise<ManageUserResult> {
  const authz = await requireAdmin()
  if (!authz.ok) return authz

  const allowedRoles = resolveScopedRoles(options.allowedRoles)
  const roleHint = allowedRoles.join("|")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an Excel file to import." }
  }

  const { parseExcelRows } = await import("@/features/admin/lib/excel")
  const rows = await parseExcelRows(await file.arrayBuffer())
  if (rows.length === 0) {
    return { ok: false, error: "No rows found in the spreadsheet." }
  }

  let created = 0
  const failures: string[] = []

  for (const [index, row] of rows.entries()) {
    const fullName = (row.full_name || row.name || "").trim()
    const email = (row.email || "").trim().toLowerCase()
    const defaultRole = allowedRoles[0] ?? "nurse"
    const roleRaw = (row.role || defaultRole).trim().toLowerCase()
    const role = allowedRoles.includes(roleRaw as ManagedRole)
      ? (roleRaw as ManagedRole)
      : null

    if (!fullName || !email || !role) {
      failures.push(
        `Row ${index + 2}: need full_name, email, and valid role (${roleHint})`
      )
      continue
    }

    const outcome = await createStaffUser({
      fullName,
      email,
      role,
      allowedRoles,
    })
    if (!outcome.ok) {
      failures.push(`Row ${index + 2}: ${outcome.error}`)
      continue
    }
    created += 1
  }

  if (created === 0) {
    return {
      ok: false,
      error:
        failures[0] ??
        `No accounts imported. Headers: full_name, email, role (${roleHint})`,
    }
  }

  return {
    ok: true,
    message: `Imported ${created} account${created === 1 ? "" : "s"}.`,
    warning:
      failures.length > 0
        ? `${failures.length} row(s) failed. ${failures.slice(0, 3).join(" · ")}`
        : undefined,
  }
}
