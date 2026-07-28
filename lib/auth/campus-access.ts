import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Single-campus access gate:
 * - admins → row in admin_accounts (active)
 * - clinic staff → row in clinic_members (active)
 */
export async function hasCampusAccess(
  client: SupabaseClient,
  userId: string,
  primaryRole?: string | null
): Promise<boolean> {
  const role = (primaryRole ?? "").toLowerCase().trim()

  if (role === "admin") {
    const { data } = await client
      .from("admin_accounts")
      .select("profile_id")
      .eq("profile_id", userId)
      .eq("is_active", true)
      .maybeSingle()
    return Boolean(data)
  }

  const { data } = await client
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}
