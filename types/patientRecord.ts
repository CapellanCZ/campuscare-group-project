export type PatientRecord = {
  id: string
  studentId: string
  firstName: string
  middleName: string | null
  lastName: string
  course: string
  yearLevel: string | null
  gender: string | null
  birthDate: string | null
  bloodType: string | null
  allergies: string | null
  phone: string | null
  email: string | null
  address: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  medicalConditions: string | null
  notes: string | null
  lastVisit: string | null
  createdAt: string
  updatedAt: string
  consultationsCount: number
  documentsCount: number
}

export type PatientRecordJson = {
  id: string
  student_id: string
  first_name: string
  middle_name: string | null
  last_name: string
  course: string
  year_level: string | null
  gender: string | null
  birth_date: string | null
  blood_type: string | null
  allergies: string | null
  phone: string | null
  email: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  medical_conditions: string | null
  notes: string | null
  last_visit: string | null
  created_at: string
  updated_at: string
  consultations_count?: number | null
  documents_count?: number | null
}

export type PatientRecordStats = {
  patientsOnFile: number
  visitedThisMonth: number
  flaggedAllergies: number
  documents: number
}

export type PatientRecordListParams = {
  query?: string
  page?: number
  pageSize?: number
}

export type PatientRecordListResult = {
  items: PatientRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreatePatientRecordInput = {
  studentId: string
  firstName: string
  middleName?: string | null
  lastName: string
  course: string
  yearLevel?: string | null
  gender?: string | null
  birthDate?: string | null
  bloodType?: string | null
  allergies?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  medicalConditions?: string | null
  notes?: string | null
  lastVisit?: string | null
}

export type UpdatePatientRecordInput = CreatePatientRecordInput & {
  id: string
}

export type PatientRecordServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "duplicate"
  | "database"
  | "unknown"

export class PatientRecordServiceError extends Error {
  readonly code: PatientRecordServiceErrorCode

  constructor(code: PatientRecordServiceErrorCode, message: string) {
    super(message)
    this.name = "PatientRecordServiceError"
    this.code = code
  }
}

export function patientFullName(patient: {
  firstName: string
  middleName?: string | null
  lastName: string
}): string {
  return [patient.firstName, patient.middleName, patient.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
}

export function patientRecordFromJson(json: PatientRecordJson): PatientRecord {
  return {
    id: json.id,
    studentId: json.student_id,
    firstName: json.first_name,
    middleName: json.middle_name,
    lastName: json.last_name,
    course: json.course,
    yearLevel: json.year_level,
    gender: json.gender,
    birthDate: json.birth_date,
    bloodType: json.blood_type,
    allergies: json.allergies,
    phone: json.phone,
    email: json.email,
    address: json.address,
    emergencyContactName: json.emergency_contact_name,
    emergencyContactPhone: json.emergency_contact_phone,
    medicalConditions: json.medical_conditions,
    notes: json.notes,
    lastVisit: json.last_visit,
    createdAt: json.created_at,
    updatedAt: json.updated_at,
    consultationsCount: json.consultations_count ?? 0,
    documentsCount: json.documents_count ?? 0,
  }
}

export function patientRecordToJson(
  patient: CreatePatientRecordInput | UpdatePatientRecordInput
): Record<string, string | null> {
  return {
    student_id: patient.studentId.trim(),
    first_name: patient.firstName.trim(),
    middle_name: emptyToNull(patient.middleName),
    last_name: patient.lastName.trim(),
    course: patient.course.trim(),
    year_level: emptyToNull(patient.yearLevel),
    gender: emptyToNull(patient.gender),
    birth_date: emptyToNull(patient.birthDate),
    blood_type: emptyToNull(patient.bloodType),
    allergies: emptyToNull(patient.allergies),
    phone: emptyToNull(patient.phone),
    email: emptyToNull(patient.email),
    address: emptyToNull(patient.address),
    emergency_contact_name: emptyToNull(patient.emergencyContactName),
    emergency_contact_phone: emptyToNull(patient.emergencyContactPhone),
    medical_conditions: emptyToNull(patient.medicalConditions),
    notes: emptyToNull(patient.notes),
    last_visit: emptyToNull(patient.lastVisit),
  }
}

export function patientRecordCopyWith(
  patient: PatientRecord,
  patch: Partial<PatientRecord>
): PatientRecord {
  return { ...patient, ...patch }
}

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
