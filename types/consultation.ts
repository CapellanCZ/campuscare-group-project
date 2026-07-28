export const CONSULTATION_STATUSES = [
  "Awaiting Assessment",
  "In Progress",
  "Completed",
  "Cancelled",
] as const

export const CONSULTATION_PRIORITIES = [
  "Low",
  "Normal",
  "High",
  "Emergency",
] as const

export const CONSULTATION_STATIONS = [
  "nurse",
  "physician",
  "dentist",
] as const

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number]
export type ConsultationPriority = (typeof CONSULTATION_PRIORITIES)[number]
export type ConsultationStation = (typeof CONSULTATION_STATIONS)[number]

export type ConsultationPatient = {
  id: string
  firstName: string
  lastName: string
  studentId: string
  fullName: string
}

export type Consultation = {
  id: string
  patientId: string
  chiefComplaint: string | null
  symptoms: string | null
  assessment: string | null
  diagnosis: string | null
  treatment: string | null
  prescription: string | null
  providerName: string | null
  providerRole: string | null
  station: string | null
  status: ConsultationStatus
  priority: ConsultationPriority
  consultationDate: string
  followUpDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  patient: ConsultationPatient
}

export type ConsultationJson = {
  id: string
  patient_id: string
  chief_complaint: string | null
  symptoms: string | null
  assessment: string | null
  diagnosis: string | null
  treatment: string | null
  prescription: string | null
  provider_name: string | null
  provider_role: string | null
  station: string | null
  status: string
  priority: string
  consultation_date: string
  follow_up_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  patient_records?:
    | {
        id: string
        first_name: string
        last_name: string
        student_id: string
      }
    | {
        id: string
        first_name: string
        last_name: string
        student_id: string
      }[]
    | null
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
  provider?: string | "all"
  station?: string | "all"
  consultationDate?: string | "all"
}

export type ConsultationListResult = {
  items: Consultation[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateConsultationInput = {
  patientId: string
  chiefComplaint?: string | null
  symptoms?: string | null
  assessment?: string | null
  diagnosis?: string | null
  treatment?: string | null
  prescription?: string | null
  providerName?: string | null
  providerRole?: string | null
  station?: string | null
  status?: ConsultationStatus
  priority?: ConsultationPriority
  consultationDate?: string | null
  followUpDate?: string | null
  notes?: string | null
}

export type UpdateConsultationInput = CreateConsultationInput & {
  id: string
}

export type ConsultationServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "database"
  | "unknown"

export class ConsultationServiceError extends Error {
  readonly code: ConsultationServiceErrorCode

  constructor(code: ConsultationServiceErrorCode, message: string) {
    super(message)
    this.name = "ConsultationServiceError"
    this.code = code
  }
}

export function consultationFromJson(json: ConsultationJson): Consultation {
  const joined = Array.isArray(json.patient_records)
    ? json.patient_records[0]
    : json.patient_records

  const firstName = joined?.first_name ?? ""
  const lastName = joined?.last_name ?? ""
  const studentId = joined?.student_id ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown patient"

  if (!isStatus(json.status)) {
    throw new ConsultationServiceError(
      "database",
      `Unexpected consultation status: ${json.status}`
    )
  }
  if (!isPriority(json.priority)) {
    throw new ConsultationServiceError(
      "database",
      `Unexpected consultation priority: ${json.priority}`
    )
  }

  return {
    id: json.id,
    patientId: json.patient_id,
    chiefComplaint: json.chief_complaint,
    symptoms: json.symptoms,
    assessment: json.assessment,
    diagnosis: json.diagnosis,
    treatment: json.treatment,
    prescription: json.prescription,
    providerName: json.provider_name,
    providerRole: json.provider_role,
    station: json.station,
    status: json.status,
    priority: json.priority,
    consultationDate: json.consultation_date,
    followUpDate: json.follow_up_date,
    notes: json.notes,
    createdAt: json.created_at,
    updatedAt: json.updated_at,
    patient: {
      id: joined?.id ?? json.patient_id,
      firstName,
      lastName,
      studentId,
      fullName,
    },
  }
}

export function consultationToJson(
  input: CreateConsultationInput | UpdateConsultationInput
): Record<string, string | null> {
  return {
    patient_id: input.patientId.trim(),
    chief_complaint: emptyToNull(input.chiefComplaint),
    symptoms: emptyToNull(input.symptoms),
    assessment: emptyToNull(input.assessment),
    diagnosis: emptyToNull(input.diagnosis),
    treatment: emptyToNull(input.treatment),
    prescription: emptyToNull(input.prescription),
    provider_name: emptyToNull(input.providerName),
    provider_role: emptyToNull(input.providerRole),
    station: emptyToNull(input.station),
    status: input.status ?? "Awaiting Assessment",
    priority: input.priority ?? "Normal",
    consultation_date: emptyToNull(input.consultationDate) ?? new Date().toISOString(),
    follow_up_date: emptyToNull(input.followUpDate),
    notes: emptyToNull(input.notes),
  }
}

export function consultationCopyWith(
  consultation: Consultation,
  patch: Partial<Consultation>
): Consultation {
  return { ...consultation, ...patch }
}

function isStatus(value: string): value is ConsultationStatus {
  return (CONSULTATION_STATUSES as readonly string[]).includes(value)
}

function isPriority(value: string): value is ConsultationPriority {
  return (CONSULTATION_PRIORITIES as readonly string[]).includes(value)
}

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
