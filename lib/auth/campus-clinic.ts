import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/** Fixed single-campus UUID (kept on operational rows; no clinics catalog). */
export const CAMPUS_CLINIC_ID = "34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b"

/**
 * Single-campus clinic: resolve the one clinic_id from memberships/patients.
 * Do not invent a second clinic — CampusCare only has one.
 */
export async function resolveCampusClinicId(
  client: SupabaseClient
): Promise<string | null> {
  const { data: membership } = await client
    .from("clinic_members")
    .select("clinic_id")
    .eq("is_active", true)
    .not("clinic_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (membership?.clinic_id) return membership.clinic_id as string

  const { data: patient } = await client
    .from("patients")
    .select("clinic_id")
    .limit(1)
    .maybeSingle()

  if (patient?.clinic_id) return patient.clinic_id as string

  return CAMPUS_CLINIC_ID
}
