import "server-only"

import { getStaffAccess } from "@/lib/auth/access"
import { createAdminClient } from "@/lib/supabase/admin"

export type AdminActionResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string }

export async function requireAdminAccess() {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "admin") {
    return { ok: false as const, error: "Only admins can manage this directory." }
  }
  return { ok: true as const, access }
}

export function getAdminClientSafe() {
  try {
    return { ok: true as const, client: createAdminClient() }
  } catch {
    return {
      ok: false as const,
      error:
        "Admin tools are not configured yet. Set SUPABASE_SERVICE_ROLE_KEY in your environment.",
    }
  }
}
