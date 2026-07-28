export const MEDICAL_CERTIFICATE_STATUSES = [
  "draft",
  "pending",
  "issued",
  "printed",
] as const

export type MedicalCertificateStatus =
  (typeof MEDICAL_CERTIFICATE_STATUSES)[number]

export type MedicalCertificatePatient = {
  id: string
  fullName: string
  studentId: string | null
  email: string | null
}

export type MedicalCertificatePatientOption = MedicalCertificatePatient

export type MedicalCertificate = {
  id: string
  patientId: string
  certificateNumber: string
  certificateType: string
  purpose: string | null
  doctorName: string | null
  remarks: string | null
  status: MedicalCertificateStatus
  issuedAt: string | null
  validUntil: string | null
  createdAt: string
  updatedAt: string
  patient: MedicalCertificatePatient
}

export type MedicalCertificateStats = {
  issuedThisMonth: number
  issuedToday: number
  drafts: number
  pending: number
}

export type MedicalCertificateSortField =
  | "issued_at"
  | "created_at"
  | "status"
  | "certificate_type"
  | "certificate_number"

export type MedicalCertificateSortDirection = "asc" | "desc"

export type MedicalCertificateListParams = {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: MedicalCertificateSortField
  sortDirection?: MedicalCertificateSortDirection
  status?: MedicalCertificateStatus | "all"
}

export type MedicalCertificateListResult = {
  items: MedicalCertificate[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateMedicalCertificateInput = {
  patientId: string
  certificateNumber?: string
  certificateType: string
  purpose?: string | null
  doctorName?: string | null
  remarks?: string | null
  status?: MedicalCertificateStatus
  issuedAt?: string | null
  validUntil?: string | null
}

export type UpdateMedicalCertificateInput = {
  id: string
  patientId?: string
  certificateNumber?: string
  certificateType?: string
  purpose?: string | null
  doctorName?: string | null
  remarks?: string | null
  status?: MedicalCertificateStatus
  issuedAt?: string | null
  validUntil?: string | null
}

export type MedicalCertificateServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "database"
  | "unknown"

export class MedicalCertificateServiceError extends Error {
  readonly code: MedicalCertificateServiceErrorCode

  constructor(code: MedicalCertificateServiceErrorCode, message: string) {
    super(message)
    this.name = "MedicalCertificateServiceError"
    this.code = code
  }
}
