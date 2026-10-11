import { cache } from "react"
import { cookies } from "next/headers"

import { hasCampusAccess } from "@/lib/auth/campus-access"
import {
  canUseWebApp,
  hasApprovedClinicAccess,
  resolveClinicRole,
} from "@/lib/auth/resolve-role"
import {
  decodeStaffAccessGate,
  STAFF_ACCESS_GATE_COOKIE,
} from "@/lib/auth/staff-access-gate"
import type { StaffAccess } from "@/lib/auth/types"
import { isStaleRefreshTokenError } from "@/lib/supabase/auth-errors"
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

async function loadStaffAccess(): Promise<StaffAccess | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (isStaleRefreshTokenError(authError)) {
    await supabase.auth.signOut({ scope: "local" })
    return null
  }

  if (!user) return null

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, primary_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile || !canUseWebApp(profile as ProfileRow)) {
    return null
  }

  const row = profile as ProfileRow
  const clinicRole = resolveClinicRole(row)

  if (!clinicRole) {
    return null
  }

  // Prefer proxy-issued gate cookie (same navigation) to skip a second membership query.
  let hasClinicMembership: boolean | null = null
  try {
    const jar = await cookies()
    const gate = await decodeStaffAccessGate(
      jar.get(STAFF_ACCESS_GATE_COOKIE)?.value
    )
    if (gate && gate.u === user.id && gate.r === clinicRole) {
      hasClinicMembership = gate.m === 1
    }
  } catch {
    // cookies() can throw outside a request context; fall through to DB.
  }

  if (hasClinicMembership == null) {
    hasClinicMembership = await hasCampusAccess(
      supabase,
      user.id,
      row.primary_role
    )
  }

  if (!hasApprovedClinicAccess(row)) {
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

/** Request-scoped: layout + page share one auth resolve per navigation. */
export const getStaffAccess = cache(loadStaffAccess)
