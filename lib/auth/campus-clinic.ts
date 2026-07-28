import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

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
    .limit(1)
    .maybeSingle()

  if (membership?.clinic_id) return membership.clinic_id as string

  const { data: clinic } = await client
    .from("clinics")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (clinic?.id) return clinic.id as string

  const { data: patient } = await client
    .from("patients")
    .select("clinic_id")
    .limit(1)
    .maybeSingle()

  return (patient?.clinic_id as string | undefined) ?? null
}
