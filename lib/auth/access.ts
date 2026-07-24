import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { normalizeWebRole, type StaffAccess } from "@/lib/auth/types"

/** Deduped per request so layout + page/actions share one auth lookup. */
export const getStaffAccess = cache(async (): Promise<StaffAccess | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, primary_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || !profile.is_active) return null

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    primaryRole: normalizeWebRole(profile.primary_role),
    hasClinicMembership: Boolean(membership),
  }
})
