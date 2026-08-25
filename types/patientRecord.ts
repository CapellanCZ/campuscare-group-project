export type PatientType = "student" | "faculty" | "employee" | "visitor"

export const PATIENT_TYPES: PatientType[] = [
  "student",
  "faculty",
  "employee",
  "visitor",
]

/** Family Background from the enrolled-students CSV → Emergency Contact Details */
export type PatientFamilyBackground = {
  guardianName: string | null
  relationship: string | null
  occupation: string | null
  address: string | null
  mobile: string | null
  email: string | null
}

/** Paper MEDICAL RECORD — Medical History */
export type MedicalHistory = {
  previousIllnessOrSurgery: string
  allergy: boolean
  asthma: boolean
  tb: boolean
  hpn: boolean
  gynecologicalObstetrical: boolean
  smoker: boolean
  alcoholicDrinker: boolean
  diabetesMellitus: boolean
  heartAilment: boolean
  kidneyDisease: boolean
}

/** Paper MEDICAL RECORD — Physical Examination */
export type PhysicalExam = {
  bloodPressure: string
  pulseRate: string
  temperature: string
  weight: string
  height: string
  o2: string
  skin: string
  eyesOd: string
  eyesOs: string
  earsAd: string
  earsAs: string
  nose: string
  throat: string
  neck: string
  thorax: string
  heart: string
  lungs: string
  abdomen: string
  extremities: string
  deformities: string
  otherPertinentFindings: string
}

export const EMPTY_MEDICAL_HISTORY: MedicalHistory = {
  previousIllnessOrSurgery: "",
  allergy: false,
  asthma: false,
  tb: false,
  hpn: false,
  gynecologicalObstetrical: false,
  smoker: false,
  alcoholicDrinker: false,
  diabetesMellitus: false,
  heartAilment: false,
  kidneyDisease: false,
}

export const EMPTY_PHYSICAL_EXAM: PhysicalExam = {
  bloodPressure: "",
  pulseRate: "",
  temperature: "",
  weight: "",
  height: "",
  o2: "",
  skin: "",
  eyesOd: "",
  eyesOs: "",
  earsAd: "",
  earsAs: "",
  nose: "",
  throat: "",
  neck: "",
  thorax: "",
  heart: "",
  lungs: "",
  abdomen: "",
  extremities: "",
  deformities: "",
  otherPertinentFindings: "",
}

export type PatientRecord = {
  id: string
  patientType: PatientType
  studentId: string | null
  employeeId: string | null
  firstName: string
  middleName: string | null
  lastName: string
  course: string | null
  yearLevel: string | null
  gender: string | null
  birthDate: string | null
  civilStatus: string | null
  religion: string | null
  nationality: string | null
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
  medicalHistory: MedicalHistory
  physicalExam: PhysicalExam
  lastEditedAt: string | null
  lastEditedBy: string | null
  lastEditedByName: string | null
  createdAt: string
  updatedAt: string
  consultationsCount: number
  documentsCount: number
  familyBackground?: PatientFamilyBackground | null
}

export type PatientRecordJson = {
  id: string
  patient_type: PatientType
  student_id: string | null
  employee_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  course: string | null
  year_level: string | null
  gender: string | null
  birth_date: string | null
  civil_status?: string | null
  religion?: string | null
  nationality?: string | null
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
  medical_history?: MedicalHistory | Record<string, unknown> | null
  physical_exam?: PhysicalExam | Record<string, unknown> | null
  last_edited_at?: string | null
  last_edited_by?: string | null
  last_edited_by_name?: string | null
  created_at: string
  updated_at: string
  consultations_count?: number | null
  documents_count?: number | null
  family_background?: PatientFamilyBackground | Record<string, unknown> | null
}

export type PatientRecordStats = {
  patientsOnFile: number
  visitedThisMonth: number
  flaggedAllergies: number
  documents: number
}

export type PatientRecordSortColumn =
  | "patient"
  | "type"
  | "program"
  | "lastVisit"

export type PatientRecordListParams = {
  query?: string
  patientType?: PatientType | "all"
  sortBy?: PatientRecordSortColumn
  sortDir?: "asc" | "desc"
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
  patientType: PatientType
  studentId?: string | null
  employeeId?: string | null
  firstName: string
  middleName?: string | null
  lastName: string
  course?: string | null
  yearLevel?: string | null
  gender?: string | null
  birthDate?: string | null
  civilStatus?: string | null
  religion?: string | null
  nationality?: string | null
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
  familyBackground?: PatientFamilyBackground | null
}

export type UpdatePatientRecordInput = CreatePatientRecordInput & {
  id: string
}

export type UpdatePatientMedicalRecordInput = {
  id: string
  medicalHistory: MedicalHistory
  physicalExam: PhysicalExam
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

export function normalizePatientType(
  value?: string | null
): PatientType | null {
  const raw = (value ?? "").trim().toLowerCase()
  if (
    raw === "student" ||
    raw === "faculty" ||
    raw === "employee" ||
    raw === "visitor"
  ) {
    return raw
  }
  return null
}

/** Campus / Student ID required for all types except visitor. */
export function patientTypeRequiresCampusId(type: PatientType): boolean {
  return type !== "visitor"
}

export function patientTypeLabel(type: PatientType | null | undefined): string {
  if (type === "faculty") return "Faculty"
  if (type === "employee") return "Employee"
  if (type === "visitor") return "Visitor"
  if (type === "student") return "Student"
  return "—"
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

export function patientCampusId(patient: {
  patientType: PatientType
  studentId?: string | null
  employeeId?: string | null
}): string | null {
  const value =
    patient.patientType === "faculty" || patient.patientType === "employee"
      ? patient.employeeId
      : patient.studentId
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function patientAgeYears(birthDate: string | null | undefined): number | null {
  if (!birthDate?.trim()) return null
  const birth = new Date(birthDate.slice(0, 10) + "T00:00:00")
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

export function parseMedicalHistory(
  value: MedicalHistory | Record<string, unknown> | null | undefined
): MedicalHistory {
  if (!value || typeof value !== "object") return { ...EMPTY_MEDICAL_HISTORY }
  const v = value as Record<string, unknown>
  return {
    previousIllnessOrSurgery: String(v.previousIllnessOrSurgery ?? ""),
    allergy: Boolean(v.allergy),
    asthma: Boolean(v.asthma),
    tb: Boolean(v.tb),
    hpn: Boolean(v.hpn),
    gynecologicalObstetrical: Boolean(v.gynecologicalObstetrical),
    smoker: Boolean(v.smoker),
    alcoholicDrinker: Boolean(v.alcoholicDrinker),
    diabetesMellitus: Boolean(v.diabetesMellitus),
    heartAilment: Boolean(v.heartAilment),
    kidneyDisease: Boolean(v.kidneyDisease),
  }
}

export function parsePhysicalExam(
  value: PhysicalExam | Record<string, unknown> | null | undefined
): PhysicalExam {
  if (!value || typeof value !== "object") return { ...EMPTY_PHYSICAL_EXAM }
  const v = value as Record<string, unknown>
  const str = (key: string) => String(v[key] ?? "")
  return {
    bloodPressure: str("bloodPressure"),
    pulseRate: str("pulseRate"),
    temperature: str("temperature"),
    weight: str("weight"),
    height: str("height"),
    o2: str("o2"),
    skin: str("skin"),
    eyesOd: str("eyesOd"),
    eyesOs: str("eyesOs"),
    earsAd: str("earsAd"),
    earsAs: str("earsAs"),
    nose: str("nose"),
    throat: str("throat"),
    neck: str("neck"),
    thorax: str("thorax"),
    heart: str("heart"),
    lungs: str("lungs"),
    abdomen: str("abdomen"),
    extremities: str("extremities"),
    deformities: str("deformities"),
    otherPertinentFindings: str("otherPertinentFindings"),
  }
}

export function parseFamilyBackground(
  value: PatientFamilyBackground | Record<string, unknown> | null | undefined
): PatientFamilyBackground | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const str = (key: string) => {
    const raw = v[key]
    if (raw == null) return null
    const trimmed = String(raw).trim()
    return trimmed ? trimmed : null
  }
  const parsed: PatientFamilyBackground = {
    guardianName: str("guardianName"),
    relationship: str("relationship"),
    occupation: str("occupation"),
    address: str("address"),
    mobile: str("mobile"),
    email: str("email"),
  }
  const hasAny = Object.values(parsed).some(Boolean)
  return hasAny ? parsed : null
}

export function allergiesSummaryFromHistory(history: MedicalHistory): string | null {
  if (!history.allergy) return null
  return "Allergy noted on medical history"
}

export function patientRecordFromJson(json: PatientRecordJson): PatientRecord {
  return {
    id: json.id,
    patientType: normalizePatientType(json.patient_type) ?? "student",
    studentId: json.student_id,
    employeeId: json.employee_id,
    firstName: json.first_name,
    middleName: json.middle_name,
    lastName: json.last_name,
    course: json.course,
    yearLevel: json.year_level,
    gender: json.gender,
    birthDate: json.birth_date,
    civilStatus: json.civil_status ?? null,
    religion: json.religion ?? null,
    nationality: json.nationality ?? null,
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
    medicalHistory: parseMedicalHistory(json.medical_history),
    physicalExam: parsePhysicalExam(json.physical_exam),
    lastEditedAt: json.last_edited_at ?? null,
    lastEditedBy: json.last_edited_by ?? null,
    lastEditedByName: json.last_edited_by_name ?? null,
    createdAt: json.created_at,
    updatedAt: json.updated_at,
    consultationsCount: json.consultations_count ?? 0,
    documentsCount: json.documents_count ?? 0,
    familyBackground: parseFamilyBackground(json.family_background),
  }
}

export function patientRecordToJson(
  patient: CreatePatientRecordInput | UpdatePatientRecordInput
): Record<string, string | null | PatientFamilyBackground | undefined> {
  const patientType = patient.patientType
  const requiresId = patientTypeRequiresCampusId(patientType)
  const usesEmployeeId =
    patientType === "faculty" || patientType === "employee"
  const studentId =
    patientType === "student" ? emptyToNull(patient.studentId) : null
  const employeeId = usesEmployeeId
    ? emptyToNull(patient.employeeId)
    : null

  if (requiresId && patientType === "student" && !studentId) {
    // validation happens upstream; keep payload consistent
  }

  return {
    patient_type: patientType,
    student_id: studentId,
    employee_id: employeeId,
    first_name: patient.firstName.trim(),
    middle_name: emptyToNull(patient.middleName),
    last_name: patient.lastName.trim(),
    course: emptyToNull(patient.course),
    year_level: emptyToNull(patient.yearLevel),
    gender: emptyToNull(patient.gender),
    birth_date: emptyToNull(patient.birthDate),
    civil_status: emptyToNull(patient.civilStatus),
    religion: emptyToNull(patient.religion),
    nationality: emptyToNull(patient.nationality),
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
    family_background: patient.familyBackground ?? null,
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
