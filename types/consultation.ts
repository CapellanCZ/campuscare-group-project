export const CONSULTATION_STATUSES = [
  "awaiting_assessment",
  "in_progress",
  "completed",
] as const

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]

export type ConsultationStation = "nurse" | "physician" | "dentist"

export type Consultation = {
  id: string
  appointmentId: string | null
  patientName: string
  studentId: string
  station: ConsultationStation
  chiefComplaint: string
  status: ConsultationStatus
  startedAt: string | null
  provider: string
  hasAssessment: boolean
  hasDiagnosis: boolean
  hasPrescription: boolean
  assessmentNotes: string | null
  diagnosis: string | null
  treatmentNotes: string | null
  prescription: string | null
}

export type ConsultationStats = {
  openToday: number
  awaitingAssessment: number
  inProgress: number
  completedToday: number
}

export type ConsultationListParams = {
  query?: string
  page?: number
  pageSize?: number
  status?: ConsultationStatus | "all"
  station?: ConsultationStation | "all"
}

export type ConsultationListResult = {
  items: Consultation[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type UpdateConsultationInput = {
  id: string
  assessmentNotes?: string | null
  diagnosis?: string | null
  treatmentNotes?: string | null
  prescription?: string | null
  status?: ConsultationStatus
  providerName?: string | null
}

export class ConsultationServiceError extends Error {
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
    this.name = "ConsultationServiceError"
  }
}
