import { createClient } from "@/lib/supabase/server"
import type { StaffAccess, WebRole } from "@/lib/auth/types"

export async function getStaffAccess(): Promise<StaffAccess | null> {
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
    primaryRole: profile.primary_role as WebRole,
    hasClinicMembership: Boolean(membership),
  }
}
