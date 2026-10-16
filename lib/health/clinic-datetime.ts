/**
 * Clinic wall-clock helpers for Asia/Manila.
 * Appointments store timestamptz (UTC); UI must never treat UTC hour digits as local.
 */

export const CLINIC_TIMEZONE = "Asia/Manila" as const

/** Split an ISO instant into Manila calendar date + HH:mm. */
export function manilaPartsFromIso(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: "", time: "" }
  }
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d)
  // Normalize rare locale separators (e.g. "21.00") to HH:mm.
  const normalized = time.replace(".", ":").padStart(5, "0")
  return { date, time: normalized.slice(0, 5) }
}

/**
 * Value for `<input type="datetime-local">` showing Manila wall clock.
 * Do not use `iso.slice(0, 16)` — that keeps UTC hours (9 PM PHT → 1 PM).
 */
export function isoToManilaDatetimeLocal(iso: string): string {
  const { date, time } = manilaPartsFromIso(iso)
  if (!date || !time) return ""
  return `${date}T${time}`
}

/** Build UTC ISO from Manila date (YYYY-MM-DD) + time (HH:mm or HH:mm:ss). */
export function manilaDateTimeToIso(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}+08:00`).toISOString()
}

/**
 * Parse a datetime-local string as Asia/Manila wall clock → UTC ISO.
 * Browser `new Date("YYYY-MM-DDTHH:mm")` uses the device TZ; we force +08:00.
 */
export function manilaDatetimeLocalToIso(value: string): string {
  const trimmed = value.trim()
  const [date, timePart = ""] = trimmed.split("T")
  if (!date || !timePart) {
    throw new Error("Invalid datetime-local value")
  }
  const time = timePart.length >= 8 ? timePart.slice(0, 8) : timePart
  return manilaDateTimeToIso(date, time)
}

/** Human-readable Manila date + time for summaries. */
export function formatManilaDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: CLINIC_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}
