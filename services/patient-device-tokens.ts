import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type UpsertDeviceTokenInput = {
  token: string
  platform?: "ios" | "android" | "web" | "unknown"
  patientId?: string | null
  userId?: string | null
}

export async function upsertPatientDeviceToken(
  input: UpsertDeviceTokenInput,
  client?: SupabaseClient
): Promise<void> {
  const token = input.token.trim()
  if (!token) throw new Error("token is required.")
  if (!input.userId && !input.patientId) {
    throw new Error("userId or patientId is required.")
  }

  const supabase = client ?? (await createClient())
  const { error } = await supabase.from("patient_device_tokens").upsert(
    {
      token,
      platform: input.platform ?? "unknown",
      user_id: input.userId ?? null,
      patient_id: input.patientId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  )
  if (error) throw error
}

export async function listDeviceTokensForUser(
  userId: string,
  client?: SupabaseClient
): Promise<string[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("patient_device_tokens")
    .select("token")
    .eq("user_id", userId)
  if (error) throw error
  return (data ?? []).map((row) => row.token as string)
}
