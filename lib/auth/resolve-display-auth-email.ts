import "server-only"

import { resolveDisplayLoginEmail } from "@/lib/auth/email"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Map display login input to the real Supabase Auth email.
 *
 * Supports:
 * - Full email (`hsoqueuedisplay@gmail.com`)
 * - Username that matches Auth local-part + configured domain
 * - Username stored in `public.users.email` (e.g. `NUDHSODisplay`) while Auth
 *   uses a different address (`hsoqueuedisplay@gmail.com`)
 */
export async function resolveDisplayAuthEmail(
  emailOrUsername: string
): Promise<string | null> {
  const trimmed = emailOrUsername.trim().toLowerCase()
  if (!trimmed) return null

  const direct = resolveDisplayLoginEmail(emailOrUsername)
  if (trimmed.includes("@")) return direct

  // Prefer profile username → Auth email (display kiosk short name).
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from("users")
      .select("id")
      .eq("primary_role", "queue_display")
      .eq("is_active", true)
      .ilike("email", trimmed)
      .maybeSingle()

    if (profile?.id) {
      const { data: authData, error } = await admin.auth.admin.getUserById(
        profile.id as string
      )
      const authEmail = authData.user?.email?.trim().toLowerCase()
      if (!error && authEmail && authEmail.includes("@")) {
        return authEmail
      }
    }
  } catch {
    // Fall through to username@domain when service role is unavailable.
  }

  return direct
}
