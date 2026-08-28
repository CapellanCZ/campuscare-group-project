export type ConsultationDateRange =
  | "today"
  | "this_week"
  | "this_month"
  | "all_time"

const MANILA = "Asia/Manila"

function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970")
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1")
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1")

  return { year, month, day }
}

function toIsoDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function startOfWeekMonday(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const day = utc.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  utc.setUTCDate(utc.getUTCDate() + diff)
  return toIsoDate(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate()
  )
}

function endOfWeekSunday(weekStartIso: string) {
  const [y, m, d] = weekStartIso.split("-").map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + 6)
  return toIsoDate(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate()
  )
}

export function consultationDateRangeBounds(
  range: ConsultationDateRange,
  now = new Date()
): { start: string; end: string } | null {
  if (range === "all_time") return null

  const { year, month, day } = manilaParts(now)
  const today = toIsoDate(year, month, day)

  if (range === "today") {
    return { start: today, end: today }
  }

  if (range === "this_week") {
    const start = startOfWeekMonday(today)
    return { start, end: endOfWeekSunday(start) }
  }

  const start = toIsoDate(year, month, 1)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = toIsoDate(year, month, lastDay)
  return { start, end }
}

export function consultationDateInRange(
  consultationDate: string,
  range: ConsultationDateRange,
  now = new Date()
): boolean {
  const bounds = consultationDateRangeBounds(range, now)
  if (!bounds) return true
  const day = consultationDate.slice(0, 10)
  return day >= bounds.start && day <= bounds.end
}

export const CONSULTATION_DATE_RANGE_LABELS: Record<
  ConsultationDateRange,
  string
> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  all_time: "All Time",
}
