export const CONSULTATION_REQUEST_STATUSES = [
  "pending",
  "approved",
  "declined",
  "rescheduled",
  "completed",
  "cancelled",
  "waitlisted",
] as const

export type ConsultationRequestStatus =
  (typeof CONSULTATION_REQUEST_STATUSES)[number]

export const CONSULTATION_REQUEST_ATTACHMENT_CATEGORIES = [
  "image",
  "medical_certificate",
  "lab_result",
  "referral",
  "other",
] as const

export type ConsultationRequestAttachmentCategory =
  (typeof CONSULTATION_REQUEST_ATTACHMENT_CATEGORIES)[number]

export type ConsultationRequestStaff = {
  id: string
  fullName: string
  email: string | null
}

export type ConsultationRequestAttachment = {
  id: string
  requestId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  category: ConsultationRequestAttachmentCategory
  uploadedBy: string | null
  createdAt: string
  url?: string | null
}

export type ConsultationRequestTimelineItem = {
  id: string
  requestId: string
  action: string
  remarks: string | null
  actorId: string | null
  actorName: string | null
  createdAt: string
}

export type ConsultationRequestNote = {
  id: string
  requestId: string
  body: string
  authorId: string | null
  authorName: string | null
  createdAt: string
  updatedAt: string
}

export type ConsultationRequestAuditItem = {
  id: string
  requestId: string
  event: string
  actorId: string | null
  actorName: string | null
  details: string | null
  createdAt: string
}

export type ConsultationRequestMedicalHistory = {
  allergies: string | null
  currentMedications: string | null
  medicalConditions: string | null
  previousVisits: {
    id: string
    date: string
    chiefComplaint: string | null
    status: string
    providerName: string | null
  }[]
  previousConsultations: {
    id: string
    date: string
    service: string
    status: string
  }[]
  previousCertificates: {
    id: string
    certificateNumber: string
    certificateType: string
    status: string
    issuedAt: string | null
  }[]
  vaccinationHistory: string | null
  hasRecords: boolean
}

export type ConsultationRequest = {
  id: string
  patientRecordId: string | null
  patientName: string
  studentId: string | null
  course: string | null
  yearLevel: string | null
  email: string | null
  phone: string | null
  service: string
  providerType: "physician" | "dentist"
  preferredDate: string | null
  preferredTime: string | null
  reason: string
  symptoms: string | null
  additionalNotes: string | null
  status: ConsultationRequestStatus
  assignedNurseId: string | null
  assignedDoctorId: string | null
  assignedNurseName: string | null
  assignedDoctorName: string | null
  consultationRoom: string | null
  scheduleAt: string | null
  declineReason: string | null
  rescheduleReason: string | null
  approvalNotes: string | null
  queueTicketId: string | null
  queueNumber: number | null
  waitlistedAt: string | null
  createdBy: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
  recommendComeEarly: boolean
  attachments: ConsultationRequestAttachment[]
  timeline: ConsultationRequestTimelineItem[]
  notes: ConsultationRequestNote[]
  auditLog: ConsultationRequestAuditItem[]
  medicalHistory: ConsultationRequestMedicalHistory | null
}

export type ConsultationRequestStats = {
  pending: number
  approved: number
  declined: number
  rescheduled: number
  completed: number
  cancelled: number
  waitlisted: number
  total: number
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

export type ApproveConsultationRequestInput = {
  id: string
  doctorId?: string | null
  doctorName?: string | null
  scheduleAt?: string | null
  consultationRoom?: string | null
  notes?: string | null
}

export type DeclineConsultationRequestInput = {
  id: string
  reason: string
}

export type RescheduleConsultationRequestInput = {
  id: string
  preferredDate: string
  preferredTime: string
  reason: string
}

export type AdmitConsultationRequestInput = {
  id: string
  force?: boolean
}

export type UpdateConsultationRequestStatusInput = {
  id: string
  status: ConsultationRequestStatus
  remarks?: string | null
}

export type ConsultationRequestServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "database"
  | "unknown"

export class ConsultationRequestServiceError extends Error {
  readonly code: ConsultationRequestServiceErrorCode

  constructor(code: ConsultationRequestServiceErrorCode, message: string) {
    super(message)
    this.name = "ConsultationRequestServiceError"
    this.code = code
  }
}
