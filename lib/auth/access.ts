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
  first_name: string | null
  last_name: string | null
  role: string | null
  user_role: string | null
  account_status: string | null
  office: string | null
  designation: string | null
  primary_role: string | null
}

function displayName(profile: ProfileRow) {
  const name = [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")

  return name || profile.email || "Staff"
}

export async function getStaffAccess(): Promise<StaffAccess | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, role, user_role, account_status, office, designation, primary_role"
    )
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile || !canUseWebApp(profile as ProfileRow)) {
    return null
  }

  const row = profile as ProfileRow
  const clinicRole = resolveClinicRole(row)
  const hasClinicMembership = hasApprovedClinicAccess(row)

  // Without a clinic RBAC role, expose a safe shell identity only for pending UI.
  if (!clinicRole) {
    return {
      userId: row.id,
      email: row.email ?? user.email ?? "",
      fullName: displayName(row),
      primaryRole: "nurse",
      designation: "nurse",
      hasClinicMembership: false,
    }
  }

  return {
    userId: row.id,
    email: row.email ?? user.email ?? "",
    fullName: displayName(row),
    primaryRole: clinicRole,
    designation: clinicRole,
    hasClinicMembership,
  }
}
