import type { ClinicDesignation } from "@/lib/auth/types"

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
