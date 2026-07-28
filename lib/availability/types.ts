/** Shared availability types. doctor_availability.doctor_id = staff users.id */

export const CLINIC_TIMEZONE = "Asia/Manila"

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ClinicOfficeHour = {
  id: string
  clinicId: string
  dayOfWeek: DayOfWeek
  startTime: string | null
  endTime: string | null
  isClosed: boolean
  timezone: string
}

export type StaffWeeklyHour = {
  id: string
  userId: string
  clinicId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  timezone: string
  isActive: boolean
}

export type BreakStatus = {
  isOnBreak: boolean
  resumesAt: string | null
  setBy: string | null
  updatedAt: string | null
}

export type AccommodateResult =
  | { ok: true }
  | { ok: false; error: string }

export type StaffHoursPerson = {
  userId: string
  fullName: string
  email: string
  primaryRole: string
}
