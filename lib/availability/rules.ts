import { CLINIC_TIMEZONE } from "@/lib/availability/types"
import type {
  AccommodateResult,
  BreakStatus,
  ClinicOfficeHour,
  DayOfWeek,
  DutyStatusValue,
  StaffDutyStatus,
  StaffWeeklyHour,
} from "@/lib/availability/types"

function formatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-PH", { timeZone, ...options })
}

/** Parts of an instant in clinic timezone. */
export function zonedParts(
  isoOrDate: string | Date,
  timeZone: string = CLINIC_TIMEZONE
): { dayOfWeek: DayOfWeek; timeHm: string; dateKey: string } {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const parts = formatter(timeZone, {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun"
  const map: Record<string, DayOfWeek> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const dayOfWeek = map[weekday] ?? 0
  const year = parts.find((p) => p.type === "year")?.value ?? "0000"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00"
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00"

  return {
    dayOfWeek,
    timeHm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    dateKey: `${year}-${month}-${day}`,
  }
}

export function normalizeTimeHm(value: string): string {
  const trimmed = value.trim()
  if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  return trimmed
}

export function timeWithinWindow(
  timeHm: string,
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) return false
  const t = normalizeTimeHm(timeHm)
  const s = normalizeTimeHm(startTime)
  const e = normalizeTimeHm(endTime)
  return t >= s && t < e
}

export function isBreakActive(
  status: BreakStatus | null | undefined,
  at: Date = new Date()
): boolean {
  if (!status?.isOnBreak) return false
  if (!status.resumesAt) return true
  const resumes = new Date(status.resumesAt).getTime()
  if (Number.isNaN(resumes)) return true
  return at.getTime() < resumes
}

export function evaluateClinicOpen(input: {
  at: Date
  hours: ClinicOfficeHour[]
  breakStatus: BreakStatus | null
  timeZone?: string
}): AccommodateResult {
  const tz = input.timeZone ?? CLINIC_TIMEZONE
  if (isBreakActive(input.breakStatus, input.at)) {
    const until = input.breakStatus?.resumesAt
      ? new Date(input.breakStatus.resumesAt).toLocaleString("en-PH", {
          timeZone: tz,
        })
      : "later"
    return {
      ok: false,
      error: `The clinic is on break until ${until}. Appointments and intake are paused.`,
    }
  }

  const { dayOfWeek, timeHm } = zonedParts(input.at, tz)
  const day = input.hours.find((h) => h.dayOfWeek === dayOfWeek)

  if (!day || day.isClosed) {
    return {
      ok: false,
      error: "The clinic is closed on this day. Choose a time within clinic hours.",
    }
  }

  if (!timeWithinWindow(timeHm, day.startTime, day.endTime)) {
    return {
      ok: false,
      error: `Outside clinic hours (${normalizeTimeHm(day.startTime ?? "")}–${normalizeTimeHm(day.endTime ?? "")}).`,
    }
  }

  return { ok: true }
}

export function evaluateStaffOpen(input: {
  at: Date
  slots: StaffWeeklyHour[]
  breakStatus: BreakStatus | null
  timeZone?: string
  label?: string
}): AccommodateResult {
  const tz = input.timeZone ?? CLINIC_TIMEZONE
  const label = input.label ?? "This staff member"

  if (isBreakActive(input.breakStatus, input.at)) {
    const until = input.breakStatus?.resumesAt
      ? new Date(input.breakStatus.resumesAt).toLocaleString("en-PH", {
          timeZone: tz,
        })
      : "later"
    return {
      ok: false,
      error: `${label} is on break until ${until}.`,
    }
  }

  const { dayOfWeek, timeHm } = zonedParts(input.at, tz)
  const active = input.slots.filter(
    (s) => s.isActive && s.dayOfWeek === dayOfWeek
  )

  if (active.length === 0) {
    return {
      ok: false,
      error: `${label} has no office hours on this day.`,
    }
  }

  const inSlot = active.some((s) =>
    timeWithinWindow(timeHm, s.startTime, s.endTime)
  )
  if (!inSlot) {
    return {
      ok: false,
      error: `${label} is outside their scheduled office hours at this time.`,
    }
  }

  return { ok: true }
}

export function evaluateStaffDuty(input: {
  dutyStatus: StaffDutyStatus | null | undefined
  label?: string
}): AccommodateResult {
  const label = input.label ?? "This staff member"
  const status: DutyStatusValue = input.dutyStatus?.status ?? "not_available"

  if (status === "not_available") {
    return {
      ok: false,
      error: `${label} is not on duty. Start duty to receive patients.`,
    }
  }

  if (status === "on_break") {
    return {
      ok: false,
      error: `${label} is on break and cannot receive patients right now.`,
    }
  }

  return { ok: true }
}

export function evaluateCanAccommodate(input: {
  at: Date
  clinicHours: ClinicOfficeHour[]
  clinicBreak: BreakStatus | null
  staffDuty?: StaffDutyStatus | null
  staffBreak?: BreakStatus | null
  staffLabel?: string
  /** @deprecated Schedule slots are reference-only; use staffDuty for real-time availability. */
  staffSlots?: StaffWeeklyHour[]
  timeZone?: string
}): AccommodateResult {
  const clinic = evaluateClinicOpen({
    at: input.at,
    hours: input.clinicHours,
    breakStatus: input.clinicBreak,
    timeZone: input.timeZone,
  })
  if (!clinic.ok) return clinic

  if (input.staffDuty !== undefined) {
    const duty = evaluateStaffDuty({
      dutyStatus: input.staffDuty,
      label: input.staffLabel,
    })
    if (!duty.ok) return duty
  }

  if (input.staffBreak && isBreakActive(input.staffBreak, input.at)) {
    const label = input.staffLabel ?? "This staff member"
    const until = input.staffBreak.resumesAt
      ? new Date(input.staffBreak.resumesAt).toLocaleString("en-PH", {
          timeZone: input.timeZone ?? CLINIC_TIMEZONE,
        })
      : "later"
    return {
      ok: false,
      error: `${label} is on break until ${until}.`,
    }
  }

  return { ok: true }
}
