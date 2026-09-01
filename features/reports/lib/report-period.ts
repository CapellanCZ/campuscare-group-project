import { manilaDayBounds } from "@/lib/health/time"

export type ReportPeriodPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "custom"

export const REPORT_PERIOD_PRESETS: ReportPeriodPreset[] = [
  "today",
  "this_week",
  "this_month",
  "custom",
]

export const REPORT_PERIOD_LABELS: Record<ReportPeriodPreset, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  custom: "Custom Range",
}

export const DEFAULT_REPORT_PERIOD: ReportPeriodPreset = "this_month"

function manilaYmd(date = new Date()): string {
  return manilaDayBounds(date).ymd
}

function parseManilaYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+08:00`)
}

function shiftYmd(ymd: string, days: number): string {
  const date = parseManilaYmd(ymd)
  date.setUTCDate(date.getUTCDate() + days)
  return manilaDayBounds(date).ymd
}

function manilaWeekday(ymd: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(parseManilaYmd(ymd))
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label)
}

function startOfWeekMonday(ymd: string): string {
  const weekday = manilaWeekday(ymd)
  const offset = weekday === 0 ? 6 : weekday - 1
  return shiftYmd(ymd, -offset)
}

function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`
}

export function formatPeriodLabel(dateFrom: string, dateTo: string): string {
  const from = parseManilaYmd(dateFrom)
  const to = parseManilaYmd(dateTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${dateFrom} to ${dateTo}`
  }
  const long: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }
  if (dateFrom === dateTo) {
    return from.toLocaleDateString("en-US", long)
  }
  const sameYear = dateFrom.slice(0, 4) === dateTo.slice(0, 4)
  const fromLabel = from.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })
  const toLabel = to.toLocaleDateString("en-US", long)
  return `${fromLabel}–${toLabel}`
}

export function validateCustomRange(
  dateFrom: string,
  dateTo: string
): string | null {
  if (!dateFrom || !dateTo) {
    return "Select a From Date and To Date."
  }
  if (dateFrom > dateTo) {
    return "From Date cannot be later than To Date."
  }
  return null
}

export function listPeriodDays(dateFrom: string, dateTo: string): string[] {
  const days: string[] = []
  const cursor = parseManilaYmd(dateFrom)
  const end = parseManilaYmd(dateTo)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days
  while (cursor.getTime() <= end.getTime()) {
    days.push(manilaDayBounds(cursor).ymd)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

export function resolveReportPeriod(
  preset: ReportPeriodPreset,
  customFrom?: string,
  customTo?: string
): { dateFrom: string; dateTo: string; label: string; error?: string } {
  const today = manilaYmd()

  if (preset === "today") {
    return {
      dateFrom: today,
      dateTo: today,
      label: formatPeriodLabel(today, today),
    }
  }

  if (preset === "this_week") {
    const from = startOfWeekMonday(today)
    return {
      dateFrom: from,
      dateTo: today,
      label: formatPeriodLabel(from, today),
    }
  }

  if (preset === "this_month") {
    const from = startOfMonth(today)
    return {
      dateFrom: from,
      dateTo: today,
      label: formatPeriodLabel(from, today),
    }
  }

  const from = customFrom?.trim() ?? ""
  const to = customTo?.trim() ?? ""
  const error = validateCustomRange(from, to)
  if (error) {
    return { dateFrom: from, dateTo: to, label: "Custom range", error }
  }
  return {
    dateFrom: from,
    dateTo: to,
    label: formatPeriodLabel(from, to),
  }
}

export function formatAppliedPeriod(
  preset: ReportPeriodPreset,
  dateFrom: string,
  dateTo: string
): string {
  const range = formatPeriodLabel(dateFrom, dateTo)
  if (preset === "this_month") {
    const month = parseManilaYmd(dateFrom).toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
      year: "numeric",
    })
    return `${month} so far (${range})`
  }
  return range
}
