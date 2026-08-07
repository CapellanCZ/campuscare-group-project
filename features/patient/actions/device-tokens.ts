"use server"

import { createClient } from "@/lib/supabase/server"
import { upsertPatientDeviceToken } from "@/services/patient-device-tokens"

export async function registerPatientDeviceTokenAction(input: {
  token: string
  platform?: "ios" | "android" | "web" | "unknown"
  patientId?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Sign in required." }

    await upsertPatientDeviceToken({
      token: input.token,
      platform: input.platform,
      patientId: input.patientId,
      userId: user.id,
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to register token.",
    }
  }
}
