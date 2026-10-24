import "server-only"

import { redirect } from "next/navigation"

import { homePathForDesignation } from "@/lib/auth/home-path"
import {
  canUseWebApp,
  resolveClinicRole,
  type ProfileRoleFields,
} from "@/lib/auth/resolve-role"
import { createClient } from "@/lib/supabase/server"

/**
 * Marketing pages are public for guests. Signed-in clinic staff should not
 * linger there (Back/typed URL) — send them to their workspace home.
 */
export async function redirectAuthenticatedFromMarketing() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase
    .from("users")
    .select("primary_role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  const gate = profile as ProfileRoleFields | null
  if (!canUseWebApp(gate)) {
    redirect("/login")
  }

  const role = resolveClinicRole(gate)
  redirect(role ? homePathForDesignation(role) : "/auth/pending")
}
