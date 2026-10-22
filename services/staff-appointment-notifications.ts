import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"

export type NotifyNursesScheduledAppointmentInput = {
  clinicId?: string | null
  patientName: string
  preferredDate: string
  /** Asia/Manila HH:mm */
  preferredTime: string
  providerType: "physician" | "dentist" | string
  status: "pending" | "waitlisted"
  appointmentId: string
}

function providerLabel(providerType: string) {
  return providerType === "dentist" ? "Dental" : "Medical"
}

/**
 * Fan-out unread inbox rows to active nurses when a timed appointment is booked.
 * Best-effort — never throws; booking must succeed even if notify fails.
 */
export async function notifyNursesOfScheduledAppointment(
  client: SupabaseClient,
  input: NotifyNursesScheduledAppointmentInput
): Promise<void> {
  try {
    const clinicId = input.clinicId?.trim() || CAMPUS_CLINIC_ID
    const { data: members, error: membersError } = await client
      .from("clinic_members")
      .select("user_id")
      .eq("clinic_id", clinicId)
      .eq("member_role", "nurse")
      .eq("is_active", true)

    if (membersError || !members?.length) return

    const nurseIds = [
      ...new Set(
        members
          .map((row) => row.user_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    if (nurseIds.length === 0) return

    const specialty = providerLabel(input.providerType)
    const waitlisted =
      input.status === "waitlisted" ? " · waitlisted" : ""
    const title = "Appointment scheduled"
    const body = `${input.patientName} · ${specialty} · ${input.preferredDate} ${input.preferredTime}${waitlisted}`
    const now = new Date().toISOString()

    const rows = nurseIds.map((userId) => ({
      user_id: userId,
      type: "consultation_request" as const,
      title,
      body,
      href: "/nurse/requests",
      read_at: null,
      created_at: now,
    }))

    const { error } = await client.from("notifications").insert(rows)
    if (error) {
      console.warn("[notify-nurses] insert failed", error.message)
    }
  } catch (error) {
    console.warn("[notify-nurses] unexpected", error)
  }
}
