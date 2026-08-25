import type { ConsultationProviderType } from "@/lib/health/consultation-workflow"

/** Nurse-facing appointment request statuses (extends physician board statuses). */
export const APPOINTMENT_REQUEST_STATUSES = [
  "pending",
  "confirmed",
  "waitlisted",
  "rescheduled",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const

export type AppointmentRequestStatus =
  (typeof APPOINTMENT_REQUEST_STATUSES)[number]

export type AppointmentRequest = {
  id: string
  clinicId: string | null
  doctorId: string | null
  doctorName: string | null
  patientId: string | null
  patientName: string
  studentId: string | null
  email: string | null
  phone: string | null
  providerType: ConsultationProviderType
  service: string
  preferredDate: string | null
  preferredTime: string | null
  startsAt: string
  endsAt: string
  reason: string
  status: AppointmentRequestStatus
  location: string | null
  cancellationReason: string | null
  queueTicketId: string | null
  queueNumber: number | null
  waitlistedAt: string | null
  recommendComeEarly: boolean
  createdAt: string
  updatedAt: string
}

export type AppointmentRequestStats = {
  pending: number
  confirmed: number
  waitlisted: number
  rescheduled: number
  in_progress: number
  completed: number
  cancelled: number
  no_show: number
  total: number
}

/** Statuses shown on the nurse Consultation Requests tab (excludes Approved/confirmed). */
export const NURSE_REQUEST_TAB_STATUSES: AppointmentRequestStatus[] = [
  "pending",
  "waitlisted",
  "rescheduled",
  "cancelled",
]

export type AppointmentRequestListParams = {
  query?: string
  page?: number
  pageSize?: number
  status?: AppointmentRequestStatus | "all"
  /** When status is "all", restrict to these statuses (e.g. nurse tab excludes confirmed). */
  statuses?: AppointmentRequestStatus[]
}

export type AppointmentRequestListResult = {
  items: AppointmentRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ApproveAppointmentRequestInput = {
  id: string
  doctorId?: string | null
  doctorName?: string | null
  scheduleAt?: string | null
  location?: string | null
  notes?: string | null
}

export type DeclineAppointmentRequestInput = {
  id: string
  reason: string
}

export type RescheduleAppointmentRequestInput = {
  id: string
  preferredDate: string
  preferredTime: string
  reason: string
}

export type AdmitAppointmentRequestInput = {
  id: string
  force?: boolean
}

export class AppointmentRequestServiceError extends Error {
  readonly code:
    | "offline"
    | "permission"
    | "not_found"
    | "validation"
    | "database"
    | "unknown"

  constructor(
    code: AppointmentRequestServiceError["code"],
    message: string
  ) {
    super(message)
    this.name = "AppointmentRequestServiceError"
    this.code = code
  }
}
