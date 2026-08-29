import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  DutyStatusValue,
  StaffDutyStatus,
  StationRoleDutyKey,
} from "@/lib/availability/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const DEFAULT_DUTY_STATUS: StaffDutyStatus = {
  status: "not_available",
  dutyStartedAt: null,
  dutyEndedAt: null,
  updatedAt: null,
}

function mapDuty(row: {
  status: string
  duty_started_at: string | null
  duty_ended_at: string | null
  updated_at: string | null
} | null): StaffDutyStatus {
  if (!row) return DEFAULT_DUTY_STATUS
  const status = row.status as DutyStatusValue
  if (
    status !== "not_available" &&
    status !== "available" &&
    status !== "on_break"
  ) {
    return DEFAULT_DUTY_STATUS
  }
  return {
    status,
    dutyStartedAt: row.duty_started_at,
    dutyEndedAt: row.duty_ended_at,
    updatedAt: row.updated_at,
  }
}

export async function getStaffDutyStatus(
  userId: string,
  client?: SupabaseClient
): Promise<StaffDutyStatus> {
  const supabase = client ?? (await createClient())
  const { data } = await supabase
    .from("staff_duty_status")
    .select("status, duty_started_at, duty_ended_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  return mapDuty(data)
}

export async function ensureStaffDutyRow(
  userId: string,
  client: SupabaseClient
): Promise<StaffDutyStatus> {
  const existing = await getStaffDutyStatus(userId, client)
  if (existing.updatedAt) return existing

  const now = new Date().toISOString()
  const { data, error } = await client
    .from("staff_duty_status")
    .upsert(
      {
        user_id: userId,
        status: "not_available",
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("status, duty_started_at, duty_ended_at, updated_at")
    .single()

  if (error) throw error
  return mapDuty(data)
}

/**
 * Role-level duty: available if any active staff member of that role is on duty (available).
 */
export async function getActiveDutyByRole(
  client?: SupabaseClient
): Promise<Partial<Record<StationRoleDutyKey, StaffDutyStatus>>> {
  let supabase: SupabaseClient
  try {
    supabase = createAdminClient()
  } catch {
    supabase = client ?? (await createClient())
  }

  const { data: dutyRows, error } = await supabase
    .from("staff_duty_status")
    .select("user_id, status, duty_started_at, duty_ended_at, updated_at")
    .in("status", ["available", "on_break"])

  if (error || !dutyRows?.length) return {}

  const userIds = dutyRows.map((row) => row.user_id as string).filter(Boolean)
  if (!userIds.length) return {}

  const { data: userRows } = await supabase
    .from("users")
    .select("id, primary_role, is_active")
    .in("id", userIds)
    .eq("is_active", true)

  const roleByUser = new Map(
    (userRows ?? []).map((u) => [u.id as string, u.primary_role as string])
  )

  const out: Partial<Record<StationRoleDutyKey, StaffDutyStatus>> = {}

  for (const row of dutyRows) {
    const role = roleByUser.get(row.user_id as string)
    if (role !== "nurse" && role !== "physician" && role !== "dentist") continue
    const duty = mapDuty(row)
    const key = role as StationRoleDutyKey
    const existing = out[key]
    if (!existing) {
      out[key] = duty
      continue
    }
    if (duty.status === "available" && existing.status !== "available") {
      out[key] = duty
    }
  }

  return out
}

export function isRoleOnDuty(
  dutyByRole: Partial<Record<StationRoleDutyKey, StaffDutyStatus>>,
  role: StationRoleDutyKey
): boolean {
  return dutyByRole[role]?.status === "available"
}

export async function hasActiveConsultationForUser(
  userId: string,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client ?? (await createClient())

  const { data: user } = await supabase
    .from("users")
    .select("primary_role, full_name")
    .eq("id", userId)
    .maybeSingle()

  const role = user?.primary_role as string | undefined
  if (role !== "physician" && role !== "dentist" && role !== "nurse") {
    return false
  }

  const providerName = user?.full_name?.trim()
  if (!providerName) return false

  const station = role === "nurse" ? "nurse" : role

  // Only block end duty for consultations this clinician is actively handling —
  // not every ongoing visit at the station (which would block all staff of that role).
  let query = supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("status", "ongoing")
    .eq("station", station)
    .ilike("provider_name", providerName)

  if (role === "physician" || role === "dentist") {
    query = query.eq("provider_type", role)
  }

  const { count, error } = await query

  if (error) throw error
  return (count ?? 0) > 0
}
