import {
  canUseWebApp,
  hasApprovedClinicAccess,
  resolveClinicRole,
} from "@/lib/auth/resolve-role"
import type { StaffAccess } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  primary_role: string | null
  is_active: boolean | null
}

function displayName(profile: ProfileRow) {
  return profile.full_name?.trim() || profile.email || "Staff"
}

export async function getStaffAccess(): Promise<StaffAccess | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Live profiles: id, email, full_name, avatar_url, primary_role, is_active
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, primary_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile || !canUseWebApp(profile as ProfileRow)) {
    return null
  }

  const row = profile as ProfileRow
  const clinicRole = resolveClinicRole(row)
  const hasClinicMembership = hasApprovedClinicAccess(row)

  if (!clinicRole) {
    return null
  }

  const metaAvatar =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null

  return {
    userId: row.id,
    email: row.email ?? user.email ?? "",
    fullName: displayName(row),
    avatarUrl: row.avatar_url?.trim() || metaAvatar,
    primaryRole: clinicRole,
    designation: clinicRole,
    hasClinicMembership,
  }
}
