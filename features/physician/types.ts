export const CLINIC_TIMEZONE = "Asia/Manila"

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "rescheduled",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "waitlisted",
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export type PhysicianPatient = {
  id: string
  fullName: string
  email: string | null
  studentId: string | null
  phone: string | null
  dateOfBirth: string | null
  sex: string | null
  medicalNotes: string | null
  timezone: string
}

export type PhysicianAppointment = {
  id: string
  clinicId: string
  doctorId: string
  patientId: string
  patientName: string
  patientStudentId: string | null
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  reason: string | null
  location: string | null
  cancellationReason: string | null
  timezone: string
}

export type PhysicianConsultation = {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  symptoms: string
  diagnosis: string
  clinicalNotes: string
  prescription: string
  startedAt: string | null
  completedAt: string | null
}

export type DoctorAvailabilitySlot = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  timezone: string
  isActive: boolean
}

export type PhysicianDashboardStats = {
  todayCount: number
  confirmedCount: number
  inProgressCount: number
  completedThisWeek: number
  pendingCount: number
  noShowCount: number
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export function isPastAppointment(startsAt: string, now = new Date()): boolean {
  return new Date(startsAt).getTime() < now.getTime()
}

export function isActionableStatus(status: AppointmentStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "rescheduled"
}

export function canStartConsultation(status: AppointmentStatus): boolean {
  return status === "confirmed" || status === "rescheduled" || status === "in_progress"
}

/** Statuses shown on the physician clinic board by default (excludes nurse waitlist). */
export function isPhysicianBoardStatus(status: AppointmentStatus): boolean {
  return (
    status === "confirmed" ||
    status === "rescheduled" ||
    status === "in_progress"
  )
}
