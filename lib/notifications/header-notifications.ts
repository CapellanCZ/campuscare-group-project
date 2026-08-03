import type { ClinicDesignation } from "@/lib/auth/types"

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

export type HeaderNotification = {
  id: string
  title: string
  detail: string
  time: string
  href: string
  unread: boolean
  initials: string
}

/**
 * Staff header inbox items.
 * Returns an empty list until a real notifications API exists —
 * do not invent placeholder clinic events here.
 */
export function buildHeaderNotifications(
  _designation: ClinicDesignation
): HeaderNotification[] {
  void _designation
  return []
}
