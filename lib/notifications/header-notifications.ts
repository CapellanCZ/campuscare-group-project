import type { ClinicDesignation } from "@/lib/auth/types"
import { staffBasePath } from "@/lib/auth/home-path"

export type HeaderNotification = {
  id: string
  title: string
  detail: string
  time: string
  href: string
  unread: boolean
  initials: string
}

/** Clinic-relevant inbox items for the header (local until a notifications API exists). */
export function buildHeaderNotifications(
  designation: ClinicDesignation
): HeaderNotification[] {
  const base = staffBasePath(designation)

  return [
    {
      id: "req-1",
      title: "New consultation request",
      detail: "Walk-in · fever and cough",
      time: "2 min ago",
      href: `${base}/requests`,
      unread: true,
      initials: "CR",
    },
    {
      id: "queue-1",
      title: "Queue waiting",
      detail: "3 patients past target wait",
      time: "18 min ago",
      href: `${base}/queue`,
      unread: true,
      initials: "Q",
    },
    {
      id: "ann-1",
      title: "Announcement published",
      detail: "Clinic hours update for Friday",
      time: "1 hour ago",
      href: `${base}/announcements`,
      unread: false,
      initials: "A",
    },
  ]
}
