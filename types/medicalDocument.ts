import type { MedicalCertificatePatient } from "@/types/medicalCertificate"

export const MEDICAL_DOCUMENT_TYPES = [
  "medical_certification",
  "go_home_slip",
  "prescription",
  "nfg_medical_clearance",
] as const

export type MedicalDocumentType = (typeof MEDICAL_DOCUMENT_TYPES)[number]

export const MEDICAL_DOCUMENT_STATUSES = [
  "draft",
  "pending",
  "issued",
  "printed",
  "voided",
] as const

export type MedicalDocumentStatus = (typeof MEDICAL_DOCUMENT_STATUSES)[number]

/** Legacy rows may still store `printed`; treat as issued in the app. */
export function normalizeDocumentStatus(
  status: string
): MedicalDocumentStatus {
  if (status === "printed") return "issued"
  return status as MedicalDocumentStatus
}

export type PrescriptionMedication = {
  name: string
  strength?: string | null
  quantity?: string | null
  frequency?: string | null
  route?: string | null
  instructions?: string | null
  duration?: string | null
}

export type MedicalCertificationPayload = {
  purposeCategory: string
  purposeOther?: string | null
  certificationStatus: string
  restrictions?: string | null
  recommendations?: string | null
  dateOfExamination?: string | null
  treatmentSuggested?: string | null
  treatmentOptional?: string | null
}

export type GoHomeSlipPayload = {
  reason: string
  releaseDate?: string | null
  medications?: PrescriptionMedication[]
}

export type PrescriptionPayload = {
  medications: PrescriptionMedication[]
  patientAddress?: string | null
  patientAge?: string | null
  patientSex?: string | null
}

export type NfgClearancePayload = {
  dateOfBirth?: string | null
  gender?: string | null
  phone?: string | null
  sport?: string | null
  campus?: string | null
  emergencyContact?: string | null
  physical?: {
    height?: string | null
    weight?: string | null
    bloodPressure?: string | null
    heartRate?: string | null
    respiratoryRate?: string | null
    otherFindings?: string | null
  }
  medicalHistory?: Record<string, boolean | string>
  historyDetails?: string | null
  clearanceStatus: string
  restrictions?: string | null
  recommendations?: string | null
}

export type MedicalDocumentPayload =
  | MedicalCertificationPayload
  | GoHomeSlipPayload
  | PrescriptionPayload
  | NfgClearancePayload

export type MedicalDocument = {
  id: string
  documentNumber: string
  documentType: MedicalDocumentType
  patientId: string
  consultationId: string | null
  patientRecordId: string | null
  purpose: string | null
  doctorName: string | null
  remarks: string | null
  status: MedicalDocumentStatus
  issuedAt: string | null
  validUntil: string | null
  issuedBy: string | null
  templateVersion: string
  payload: Record<string, unknown>
  voidedBy: string | null
  voidedAt: string | null
  voidReason: string | null
  replacesDocumentId: string | null
  createdAt: string
  updatedAt: string
  patient: MedicalCertificatePatient
  /** Legacy certificate_type column */
  certificateType: string
}

export type IssueMedicalDocumentInput = {
  documentType: MedicalDocumentType
  patientId: string
  patientRecordId?: string | null
  consultationId: string
  purpose?: string | null
  doctorName: string
  licenseNumber?: string | null
  issuedBy: string
  payload: Record<string, unknown>
  templateVersion?: string
}

export type MedicalDocumentListParams = {
  query?: string
  documentType?: MedicalDocumentType | "all"
  status?: MedicalDocumentStatus | "all"
  consultationId?: string | null
  issuedBy?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  pageSize?: number
}

export type MedicalDocumentListResult = {
  items: MedicalDocument[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const DOCUMENT_TYPE_LABELS: Record<MedicalDocumentType, string> = {
  medical_certification: "Medical Certification",
  go_home_slip: "Go Home Slip",
  prescription: "Prescription",
  nfg_medical_clearance: "NFG Medical Clearance",
}

export const DOCUMENT_NUMBER_PREFIX: Record<MedicalDocumentType, string> = {
  medical_certification: "MC",
  go_home_slip: "GH",
  prescription: "RX",
  nfg_medical_clearance: "NFG",
}

export type MedicalDocumentServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "database"
  | "unknown"

export class MedicalDocumentServiceError extends Error {
  readonly code: MedicalDocumentServiceErrorCode

  constructor(code: MedicalDocumentServiceErrorCode, message: string) {
    super(message)
    this.name = "MedicalDocumentServiceError"
    this.code = code
  }
}
