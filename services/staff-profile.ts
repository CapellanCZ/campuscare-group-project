import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ClinicDesignation } from "@/lib/auth/types"

export type StaffProfile = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  employeeId: string | null
  role: ClinicDesignation
  licenseNumber: string | null
  department: string
}

export type UserPreferences = {
  userId: string
  notifyConsultationRequests: boolean
  notifyQueue: boolean
  notifyAnnouncements: boolean
  theme: "light" | "dark" | "system"
}

const DEFAULT_DEPARTMENT = "Health Services Office"

function mapPreferences(row: {
  user_id: string
  notify_consultation_requests: boolean
  notify_queue: boolean
  notify_announcements: boolean
  theme: string
} | null): UserPreferences | null {
  if (!row) return null
  const theme =
    row.theme === "light" || row.theme === "dark" || row.theme === "system"
      ? row.theme
      : "system"
  return {
    userId: row.user_id,
    notifyConsultationRequests: row.notify_consultation_requests,
    notifyQueue: row.notify_queue,
    notifyAnnouncements: row.notify_announcements,
    theme,
  }
}

export async function getStaffProfile(
  userId: string
): Promise<StaffProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, full_name, email, avatar_url, primary_role, employee_id, license_number, department"
    )
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    userId: data.id as string,
    fullName: (data.full_name as string) || "",
    email: (data.email as string) || "",
    avatarUrl: (data.avatar_url as string | null) ?? null,
    employeeId: (data.employee_id as string | null) ?? null,
    role: data.primary_role as ClinicDesignation,
    licenseNumber: (data.license_number as string | null) ?? null,
    department:
      ((data.department as string | null)?.trim() || DEFAULT_DEPARTMENT),
  }
}

export async function updateStaffAvatar(
  userId: string,
  avatarUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("users")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateStaffLicenseNumber(
  userId: string,
  licenseNumber: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const trimmed = licenseNumber?.trim() || null
  const { error } = await supabase
    .from("users")
    .update({
      license_number: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_preferences")
    .select(
      "user_id, notify_consultation_requests, notify_queue, notify_announcements, theme"
    )
    .eq("user_id", userId)
    .maybeSingle()

  const mapped = mapPreferences(
    data as Parameters<typeof mapPreferences>[0]
  )
  if (mapped) return mapped

  return {
    userId,
    notifyConsultationRequests: true,
    notifyQueue: true,
    notifyAnnouncements: true,
    theme: "system",
  }
}

export async function upsertUserPreferences(
  userId: string,
  patch: Partial<{
    notifyConsultationRequests: boolean
    notifyQueue: boolean
    notifyAnnouncements: boolean
    theme: "light" | "dark" | "system"
  }>
): Promise<{ ok: true; data: UserPreferences } | { ok: false; error: string }> {
  const current = await getUserPreferences(userId)
  const next = {
    user_id: userId,
    notify_consultation_requests:
      patch.notifyConsultationRequests ?? current.notifyConsultationRequests,
    notify_queue: patch.notifyQueue ?? current.notifyQueue,
    notify_announcements:
      patch.notifyAnnouncements ?? current.notifyAnnouncements,
    theme: patch.theme ?? current.theme,
    updated_at: new Date().toISOString(),
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select(
      "user_id, notify_consultation_requests, notify_queue, notify_announcements, theme"
    )
    .single()

  if (error) return { ok: false, error: error.message }
  const mapped = mapPreferences(
    data as Parameters<typeof mapPreferences>[0]
  )
  if (!mapped) return { ok: false, error: "Failed to save preferences." }
  return { ok: true, data: mapped }
}
