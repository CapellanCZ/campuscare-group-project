import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  evaluateCanAccommodate,
  isBreakActive,
} from "@/lib/availability/rules"
import type {
  AccommodateResult,
  BreakStatus,
  ClinicOfficeHour,
  DayOfWeek,
  StaffHoursPerson,
  StaffWeeklyHour,
} from "@/lib/availability/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function mapHour(row: {
  id: string
  clinic_id: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_closed: boolean
  timezone: string
}): ClinicOfficeHour {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    isClosed: row.is_closed,
    timezone: row.timezone,
  }
}

function mapSlot(row: {
  id: string
  doctor_id: string
  clinic_id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
}): StaffWeeklyHour {
  return {
    id: row.id,
    userId: row.doctor_id,
    clinicId: row.clinic_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    timezone: row.timezone,
    isActive: row.is_active,
  }
}

function mapBreak(row: {
  is_on_break: boolean
  resumes_at: string | null
  set_by: string | null
  updated_at: string | null
} | null): BreakStatus {
  if (!row) {
    return {
      isOnBreak: false,
      resumesAt: null,
      setBy: null,
      updatedAt: null,
    }
  }
  const status: BreakStatus = {
    isOnBreak: row.is_on_break,
    resumesAt: row.resumes_at,
    setBy: row.set_by,
    updatedAt: row.updated_at,
  }
  if (!isBreakActive(status)) {
    return {
      isOnBreak: false,
      resumesAt: null,
      setBy: row.set_by,
      updatedAt: row.updated_at,
    }
  }
  return status
}

export async function getClinicHours(
  client?: SupabaseClient,
  clinicId: string = CAMPUS_CLINIC_ID
): Promise<ClinicOfficeHour[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("clinic_office_hours")
    .select(
      "id, clinic_id, day_of_week, start_time, end_time, is_closed, timezone"
    )
    .eq("clinic_id", clinicId)
    .order("day_of_week", { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapHour)
}

export async function getClinicBreakStatus(
  client?: SupabaseClient,
  clinicId: string = CAMPUS_CLINIC_ID
): Promise<BreakStatus> {
  const supabase = client ?? (await createClient())
  const { data } = await supabase
    .from("clinic_break_status")
    .select("is_on_break, resumes_at, set_by, updated_at")
    .eq("clinic_id", clinicId)
    .maybeSingle()

  return mapBreak(data)
}

export async function getStaffWeeklyHours(
  userId: string,
  client?: SupabaseClient
): Promise<StaffWeeklyHour[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("doctor_availability")
    .select(
      "id, doctor_id, clinic_id, day_of_week, start_time, end_time, timezone, is_active"
    )
    .eq("doctor_id", userId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapSlot)
}

export async function getStaffBreakStatus(
  userId: string,
  client?: SupabaseClient
): Promise<BreakStatus> {
  const supabase = client ?? (await createClient())
  const { data } = await supabase
    .from("staff_break_status")
    .select("is_on_break, resumes_at, set_by, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  return mapBreak(data)
}

export type StationRoleBreakKey = "nurse" | "physician" | "dentist"

/**
 * Active staff breaks keyed by primary role (any clinician of that role on break).
 * Used by the public queue display for per-station status.
 * Service role resolves staff roles — queue_display cannot always read other
 * users rows under RLS, which left stations stuck on Idle while a doctor was on break.
 */
export async function getActiveStaffBreaksByRole(
  client?: SupabaseClient
): Promise<Partial<Record<StationRoleBreakKey, BreakStatus>>> {
  // Prefer service role so display (and any restricted session) can resolve station breaks.
  let supabase: SupabaseClient
  try {
    supabase = createAdminClient()
  } catch {
    supabase = client ?? (await createClient())
  }

  const { data: breakRows, error } = await supabase
    .from("staff_break_status")
    .select("user_id, is_on_break, resumes_at, set_by, updated_at")
    .eq("is_on_break", true)

  if (error || !breakRows?.length) return {}

  const userIds = breakRows.map((row) => row.user_id as string).filter(Boolean)
  if (!userIds.length) return {}

  const { data: userRows } = await supabase
    .from("users")
    .select("id, primary_role")
    .in("id", userIds)

  const roleByUser = new Map(
    (userRows ?? []).map((u) => [u.id as string, u.primary_role as string])
  )

  const out: Partial<Record<StationRoleBreakKey, BreakStatus>> = {}
  for (const row of breakRows) {
    const status = mapBreak(row)
    if (!status.isOnBreak) continue
    const role = roleByUser.get(row.user_id as string)
    if (role !== "nurse" && role !== "physician" && role !== "dentist") continue
    const existing = out[role]
    if (
      !existing ||
      (status.resumesAt &&
        (!existing.resumesAt || status.resumesAt < existing.resumesAt))
    ) {
      out[role] = status
    }
  }
  return out
}

export async function listStaffForHoursEditor(
  client?: SupabaseClient
): Promise<StaffHoursPerson[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, primary_role, is_active")
    .in("primary_role", ["nurse", "physician", "dentist"])
    .eq("is_active", true)
    .order("full_name", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    userId: row.id,
    fullName: row.full_name ?? row.email ?? "Staff",
    email: row.email ?? "",
    primaryRole: row.primary_role,
  }))
}

export async function assertCanAccommodate(input: {
  at: Date | string
  clinicianUserId?: string
  staffLabel?: string
  client?: SupabaseClient
  clinicId?: string
}): Promise<AccommodateResult> {
  const supabase = input.client ?? (await createClient())
  const at = typeof input.at === "string" ? new Date(input.at) : input.at
  const clinicId = input.clinicId ?? CAMPUS_CLINIC_ID

  const [clinicHours, clinicBreak] = await Promise.all([
    getClinicHours(supabase, clinicId),
    getClinicBreakStatus(supabase, clinicId),
  ])

  if (clinicHours.length === 0) {
    return {
      ok: false,
      error: "Clinic office hours are not configured yet. Ask an admin to set them.",
    }
  }

  let staffSlots: StaffWeeklyHour[] | undefined
  let staffBreak: BreakStatus | null | undefined

  if (input.clinicianUserId) {
    ;[staffSlots, staffBreak] = await Promise.all([
      getStaffWeeklyHours(input.clinicianUserId, supabase),
      getStaffBreakStatus(input.clinicianUserId, supabase),
    ])
  }

  return evaluateCanAccommodate({
    at,
    clinicHours,
    clinicBreak,
    staffSlots,
    staffBreak,
    staffLabel: input.staffLabel,
  })
}

/** Expire lazy break rows when resumes_at has passed. */
export async function clearExpiredClinicBreak(
  client: SupabaseClient,
  clinicId: string = CAMPUS_CLINIC_ID
): Promise<void> {
  const status = await getClinicBreakStatus(client, clinicId)
  if (!status.isOnBreak && status.resumesAt) {
    // already mapped as inactive by mapBreak
  }
  const { data } = await client
    .from("clinic_break_status")
    .select("is_on_break, resumes_at")
    .eq("clinic_id", clinicId)
    .maybeSingle()

  if (
    data?.is_on_break &&
    data.resumes_at &&
    new Date(data.resumes_at).getTime() <= Date.now()
  ) {
    await client
      .from("clinic_break_status")
      .update({
        is_on_break: false,
        resumes_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("clinic_id", clinicId)
  }
}

export async function clearExpiredStaffBreak(
  client: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await client
    .from("staff_break_status")
    .select("is_on_break, resumes_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (
    data?.is_on_break &&
    data.resumes_at &&
    new Date(data.resumes_at).getTime() <= Date.now()
  ) {
    await client
      .from("staff_break_status")
      .update({
        is_on_break: false,
        resumes_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
  }
}
