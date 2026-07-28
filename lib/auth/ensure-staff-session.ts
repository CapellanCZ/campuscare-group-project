import "server-only"

import {
  isClinicWebRole,
  normalizeClinicRole,
} from "@/lib/auth/resolve-role"
import type { WebRole } from "@/lib/auth/types"
import { createAdminClient } from "@/lib/supabase/admin"

function roleFromAuthMetadata(metadata: Record<string, unknown> | undefined) {
  const raw =
    metadata?.primary_role ??
    metadata?.role ??
    metadata?.designation ??
    null
  const role = normalizeClinicRole(typeof raw === "string" ? raw : null)
  return role && isClinicWebRole(role) ? role : null
}

function displayNameFromAuth(
  email: string,
  metadata: Record<string, unknown> | undefined
) {
  const fullName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name.trim()
      : typeof metadata?.name === "string"
        ? metadata.name.trim()
        : ""
  if (fullName) return fullName
  const prefix = email.split("@")[0]?.trim()
  return prefix || email
}

async function resolveClinicId(admin: ReturnType<typeof createAdminClient>) {
  const { data: fromClinics } = await admin
    .from("clinics")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fromClinics?.id) return fromClinics.id as string

  const { data: fromMembers } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .limit(1)
    .maybeSingle()

  return (fromMembers?.clinic_id as string | undefined) ?? null
}

/**
 * Repairs missing staff rows after OTP sign-in so post-login routing can succeed.
 * Safe to call on every successful auth — only fills gaps via service role.
 */
export async function ensureStaffSession(userId: string): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(userId)
  if (authError || !authData.user) return

  const authUser = authData.user
  const email = authUser.email?.trim().toLowerCase() ?? ""
  if (!email) return

  const role =
    roleFromAuthMetadata(authUser.app_metadata) ??
    roleFromAuthMetadata(authUser.user_metadata)

  const { data: profile } = await admin
    .from("profiles")
    .select("id, primary_role, is_active")
    .eq("id", userId)
    .maybeSingle()

  const profileRole = normalizeClinicRole(profile?.primary_role)
  const resolvedRole = (profileRole && isClinicWebRole(profileRole)
    ? profileRole
    : role) as WebRole | null

  if (!resolvedRole) return

  if (!profile) {
    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: displayNameFromAuth(email, authUser.user_metadata),
        primary_role: resolvedRole,
        is_active: true,
        invite_pending: false,
      },
      { onConflict: "id" }
    )
  } else if (!profileRole && profile.is_active !== false) {
    await admin
      .from("profiles")
      .update({ primary_role: resolvedRole, invite_pending: false })
      .eq("id", userId)
  }

  const { data: membership } = await admin
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (membership?.clinic_id) return

  const clinicId = await resolveClinicId(admin)
  if (!clinicId) return

  await admin.from("clinic_members").upsert(
    {
      clinic_id: clinicId,
      profile_id: userId,
      member_role: resolvedRole,
      is_active: true,
    },
    { onConflict: "clinic_id,profile_id" }
  )
}
