import { redirect } from "next/navigation"

import { getStaffAccess } from "@/lib/auth/access"
import { ensureStaffSession } from "@/lib/auth/ensure-staff-session"
import { homePathForDesignation } from "@/lib/auth/home-path"
import { createClient } from "@/lib/supabase/server"

/** Post-login hop: resolves designation and sends the user to their home. */
export default async function AuthContinuePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await ensureStaffSession(user.id)
  }

  const access = await getStaffAccess()

  if (!access) {
    redirect("/login")
  }

  if (!access.hasClinicMembership) {
    redirect("/auth/pending")
  }

  redirect(homePathForDesignation(access.primaryRole))
}
