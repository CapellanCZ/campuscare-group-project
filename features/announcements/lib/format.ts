import type { AnnouncementStatus } from "@/types/announcement"

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function formatAnnouncementDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return manilaDateTime.format(date)
}

export function announcementStatusLabel(status: AnnouncementStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
