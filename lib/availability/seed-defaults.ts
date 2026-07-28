import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import type { ManagedRole } from "@/features/admin/types/user-management"
import type { SupabaseClient } from "@supabase/supabase-js"

/** Default weekly slots when admin creates staff (matches clinic policy). */
export function defaultWeeklySlotsForRole(
  role: ManagedRole
): Array<{ dayOfWeek: number; startTime: string; endTime: string }> {
  if (role === "physician") {
    return [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
    ]
  }
  if (role === "dentist") {
    return [
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "18:00" },
    ]
  }
  if (role === "nurse") {
    return [
      { dayOfWeek: 1, startTime: "07:00", endTime: "21:00" },
      { dayOfWeek: 2, startTime: "07:00", endTime: "21:00" },
      { dayOfWeek: 3, startTime: "07:00", endTime: "21:00" },
      { dayOfWeek: 4, startTime: "07:00", endTime: "21:00" },
      { dayOfWeek: 5, startTime: "07:00", endTime: "21:00" },
      { dayOfWeek: 6, startTime: "07:00", endTime: "19:00" },
    ]
  }
  return []
}

export async function seedDefaultStaffHours(
  client: SupabaseClient,
  userId: string,
  role: ManagedRole
): Promise<void> {
  const slots = defaultWeeklySlotsForRole(role)
  if (slots.length === 0) return

  const { data: existing } = await client
    .from("doctor_availability")
    .select("id")
    .eq("doctor_id", userId)
    .limit(1)

  if (existing && existing.length > 0) return

  await client.from("doctor_availability").insert(
    slots.map((slot) => ({
      clinic_id: CAMPUS_CLINIC_ID,
      doctor_id: userId,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      timezone: "Asia/Manila",
      is_active: true,
    }))
  )
}
