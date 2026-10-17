export function consultationRequestStatusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Approved"
    case "cancelled":
      return "Declined"
    case "pending":
      return "Pending"
    case "rescheduled":
      return "Rescheduled"
    case "waitlisted":
      return "Waitlisted"
    default:
      return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
  }
}

export function formatRequestDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatRequestDate(value: string | null | undefined): string {
  if (!value) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  }).format(date)
}

/** Convert stored HH:mm (24h) preferred time to 12-hour clock. */
export function formatRequestTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return ""
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value.trim()
  let hour = Number(match[1])
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return value.trim()
  const minute = match[2]
  const suffix = hour >= 12 ? "PM" : "AM"
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${minute} ${suffix}`
}

export function formatRequestPreferred(
  date: string | null | undefined,
  time: string | null | undefined
): string {
  const day = formatRequestDate(date)
  const clock = formatRequestTime12h(time)
  if (day === "—" && !clock) return "—"
  return [day !== "—" ? day : null, clock || null].filter(Boolean).join(" · ")
}
