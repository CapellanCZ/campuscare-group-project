"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { requireStaffModule } from "@/lib/auth/require-module"
import {
  getStaffProfile,
  getUserPreferences,
  updateStaffAvatar,
  updateStaffLicenseNumber,
  upsertUserPreferences,
  type StaffProfile,
  type UserPreferences,
} from "@/services/staff-profile"
import {
  listStaffNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type StaffNotification,
} from "@/services/notifications"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function requireSignedIn() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    return null
  }
  return access
}

export async function fetchStaffProfileAction(): Promise<
  ActionResult<StaffProfile>
> {
  const access = await requireStaffModule("settings")
  const profile = await getStaffProfile(access.userId)
  if (!profile) return { ok: false, error: "Profile not found." }
  return { ok: true, data: profile }
}

export async function updateAvatarAction(
  avatarUrl: string | null
): Promise<ActionResult<StaffProfile>> {
  const access = await requireStaffModule("settings")
  const result = await updateStaffAvatar(access.userId, avatarUrl)
  if (!result.ok) return result
  const profile = await getStaffProfile(access.userId)
  if (!profile) return { ok: false, error: "Profile not found." }
  return { ok: true, data: profile }
}

export async function updateLicenseNumberAction(
  licenseNumber: string | null
): Promise<ActionResult<StaffProfile>> {
  const access = await requireStaffModule("settings")
  const result = await updateStaffLicenseNumber(access.userId, licenseNumber)
  if (!result.ok) return result
  const profile = await getStaffProfile(access.userId)
  if (!profile) return { ok: false, error: "Profile not found." }
  return { ok: true, data: profile }
}

export async function fetchPreferencesAction(): Promise<
  ActionResult<UserPreferences>
> {
  const access = await requireSignedIn()
  if (!access) return { ok: false, error: "Not signed in." }
  return { ok: true, data: await getUserPreferences(access.userId) }
}

export async function saveThemePreferenceAction(
  theme: "light" | "dark" | "system"
): Promise<ActionResult<UserPreferences>> {
  const access = await requireSignedIn()
  if (!access) return { ok: false, error: "Not signed in." }
  return upsertUserPreferences(access.userId, { theme })
}

export async function savePreferencesAction(
  patch: Partial<{
    notifyConsultationRequests: boolean
    notifyQueue: boolean
    notifyAnnouncements: boolean
    theme: "light" | "dark" | "system"
  }>
): Promise<ActionResult<UserPreferences>> {
  const access = await requireStaffModule("settings")
  return upsertUserPreferences(access.userId, patch)
}

export async function fetchNotificationsAction(): Promise<
  ActionResult<StaffNotification[]>
> {
  const access = await requireSignedIn()
  if (!access) return { ok: false, error: "Not signed in." }
  const items = await listStaffNotifications(
    access.userId,
    access.designation
  )
  return { ok: true, data: items }
}

export async function markNotificationReadAction(
  id: string
): Promise<ActionResult<true>> {
  const access = await requireSignedIn()
  if (!access) return { ok: false, error: "Not signed in." }
  const result = await markNotificationRead(access.userId, id)
  if (!result.ok) return result
  return { ok: true, data: true }
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<true>
> {
  const access = await requireSignedIn()
  if (!access) return { ok: false, error: "Not signed in." }
  const result = await markAllNotificationsRead(access.userId)
  if (!result.ok) return result
  return { ok: true, data: true }
}
