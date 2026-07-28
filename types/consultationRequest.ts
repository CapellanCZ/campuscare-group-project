export const CONSULTATION_REQUEST_STATUSES = [
  "pending",
  "approved",
  "declined",
  "rescheduled",
] as const

export type ConsultationRequestStatus =
  (typeof CONSULTATION_REQUEST_STATUSES)[number]

export type ConsultationRequest = {
  id: string
  patientName: string
  studentId: string
  service: string
  preferredDate: string
  preferredTime: string
  reason: string
  status: ConsultationRequestStatus
  submittedAt: string
}

export type ConsultationRequestStats = {
  pending: number
  approvedToday: number
  rescheduled: number
  declined: number
}

export type ConsultationRequestListParams = {
  query?: string
  page?: number
  pageSize?: number
  status?: ConsultationRequestStatus | "all"
}

export type ConsultationRequestListResult = {
  items: ConsultationRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type RescheduleConsultationRequestInput = {
  id: string
  appointmentDate: string
  appointmentTime: string
}

export class ConsultationRequestServiceError extends Error {
  constructor(
    public code:
      | "validation"
      | "permission"
      | "not_found"
      | "offline"
      | "database",
    message: string
  ) {
    super(message)
    this.name = "ConsultationRequestServiceError"
  }
}
