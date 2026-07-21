import { CLINIC_TIMEZONE } from "@/features/physician/types"

function formatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-PH", { timeZone, ...options })
}

/** Format an ISO timestamp in the clinic/patient timezone. */
export function formatClinicDateTime(
  iso: string,
  timeZone: string = CLINIC_TIMEZONE
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Invalid date"
  return formatter(timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatClinicTime(
  iso: string,
  timeZone: string = CLINIC_TIMEZONE
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return formatter(timeZone, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatClinicDate(
  iso: string,
  timeZone: string = CLINIC_TIMEZONE
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return formatter(timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function zonedDayKey(
  iso: string,
  timeZone: string = CLINIC_TIMEZONE
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((p) => p.type === "year")?.value ?? "0000"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  return `${year}-${month}-${day}`
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = new Date(startA).getTime()
  const a1 = new Date(endA).getTime()
  const b0 = new Date(startB).getTime()
  const b1 = new Date(endB).getTime()
  return a0 < b1 && b0 < a1
}
