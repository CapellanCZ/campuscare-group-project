import "server-only"

import { createClient } from "@/lib/supabase/server"
import { staffBasePath } from "@/lib/auth/home-path"
import type { ClinicDesignation } from "@/lib/auth/types"

export type StaffNotification = {
  id: string
  type: "consultation_request" | "queue" | "announcement"
  title: string
  body: string
  href: string | null
  unread: boolean
  createdAt: string
}

function resolveHref(
  href: string | null,
  designation: ClinicDesignation
): string | null {
  if (!href) return null
  if (href.startsWith("/nurse/") || href.startsWith("/physician/") || href.startsWith("/dentist/") || href.startsWith("/admin/")) {
    // Rewrite role-prefixed paths to the current user's base when needed.
    const suffix = href.replace(/^\/(nurse|physician|dentist|admin)/, "")
    if (
      href.startsWith("/nurse/") &&
      (designation === "physician" || designation === "dentist" || designation === "admin")
    ) {
      return `${staffBasePath(designation)}${suffix === "/requests" ? "/requests" : suffix}`
    }
  }
  if (href === "/announcements") {
    return `${staffBasePath(designation)}/announcements`
  }
  if (href.startsWith("/") && !href.startsWith("/queue-management")) {
    // Relative staff path without role — prefix current role.
    if (
      href === "/nurse/requests" ||
      href === "/nurse/queue"
    ) {
      return href
    }
  }
  return href
}

export async function listStaffNotifications(
  userId: string,
  designation: ClinicDesignation,
  limit = 30
): Promise<StaffNotification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id as string,
    type: row.type as StaffNotification["type"],
    title: row.title as string,
    body: row.body as string,
    href: resolveHref((row.href as string | null) ?? null, designation),
    unread: row.read_at == null,
    createdAt: row.created_at as string,
  }))
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function markAllNotificationsRead(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
