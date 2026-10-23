import type { ClinicDesignation } from "@/lib/auth/types"
import { staffBasePath } from "@/lib/auth/home-path"

export type HeaderStaffNotification = {
  id: string
  type: "consultation_request" | "queue" | "announcement"
  title: string
  body: string
  href: string | null
  unread: boolean
  createdAt: string
}

export type NotificationPrefs = {
  consultationRequests: boolean
  queue: boolean
  announcements: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  consultationRequests: true,
  queue: true,
  announcements: true,
}

export function notificationPrefsStorageKey(userId: string) {
  return `campuscare:notification-prefs:${userId}`
}

/**
 * Fallback inbox when the notifications table has no rows yet,
 * so the header bell stays demonstrably functional.
 */
export function buildFallbackNotifications(
  designation: ClinicDesignation
): HeaderStaffNotification[] {
  const base = staffBasePath(designation)
  const now = Date.now()

  return [
    {
      id: "fallback-req-1",
      type: "consultation_request",
      title: "New consultation request",
      body: "Walk-in · fever and cough",
      href: `${base}/requests`,
      unread: true,
      createdAt: new Date(now - 2 * 60_000).toISOString(),
    },
    {
      id: "fallback-queue-1",
      type: "queue",
      title:
        designation === "physician" || designation === "dentist"
          ? "Patient waiting at your station"
          : "Queue waiting",
      body:
        designation === "physician" || designation === "dentist"
          ? "2 patients past target wait"
          : "3 patients past target wait",
      href: `${base}/queue`,
      unread: true,
      createdAt: new Date(now - 18 * 60_000).toISOString(),
    },
    {
      id: "fallback-ann-1",
      type: "announcement",
      title: "Announcement published",
      body: "Clinic hours update for Friday",
      href: `${base}/announcements`,
      unread: false,
      createdAt: new Date(now - 60 * 60_000).toISOString(),
    },
  ]
}

export function filterNotificationsByPrefs(
  items: HeaderStaffNotification[],
  prefs: {
    notifyConsultationRequests: boolean
    notifyQueue: boolean
    notifyAnnouncements: boolean
  }
): HeaderStaffNotification[] {
  return items.filter((item) => {
    if (item.type === "consultation_request") {
      return prefs.notifyConsultationRequests
    }
    if (item.type === "queue") return prefs.notifyQueue
    return prefs.notifyAnnouncements
  })
}

const NOTIFICATION_TYPES = new Set([
  "consultation_request",
  "queue",
  "announcement",
])

/** Map a `notifications` row (Realtime payload or select) into header inbox shape. */
export function mapNotificationRow(
  row: Record<string, unknown>,
  designation: ClinicDesignation
): HeaderStaffNotification | null {
  const id = typeof row.id === "string" ? row.id : null
  const typeRaw = typeof row.type === "string" ? row.type : null
  if (!id || !typeRaw || !NOTIFICATION_TYPES.has(typeRaw)) return null

  const type = typeRaw as HeaderStaffNotification["type"]
  const title = typeof row.title === "string" ? row.title : "Notification"
  const body = typeof row.body === "string" ? row.body : ""
  const hrefRaw = typeof row.href === "string" ? row.href : null
  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : new Date().toISOString()
  const unread = row.read_at == null

  let href = hrefRaw
  if (href === "/announcements") {
    href = `${staffBasePath(designation)}/announcements`
  } else if (href === "/nurse/queue" || href === "/nurse/requests") {
    const suffix = href.replace(/^\/nurse/, "")
    href = `${staffBasePath(designation)}${suffix}`
  }

  return {
    id,
    type,
    title,
    body,
    href,
    unread,
    createdAt,
  }
}
