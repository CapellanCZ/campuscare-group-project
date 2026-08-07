"use server"

import { getStaffAccess } from "@/lib/auth/access"
import {
  getClinicCapacities,
  upsertClinicCapacity,
} from "@/services/consultation-capacity"

export async function saveClinicConsultationCapacityAction(input: {
  physician: number
  dentist: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await getStaffAccess()
  const role = access?.primaryRole
  if (!access || (role !== "admin" && role !== "nurse")) {
    return {
      ok: false,
      error: "Only clinic admins or nurses can update consultation capacity.",
    }
  }
  try {
    await upsertClinicCapacity({
      providerType: "physician",
      maxDailySlots: input.physician,
    })
    await upsertClinicCapacity({
      providerType: "dentist",
      maxDailySlots: input.dentist,
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save capacity.",
    }
  }
}

export async function loadClinicConsultationCapacitiesAction() {
  return getClinicCapacities()
}
