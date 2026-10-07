import type { ExcelRow } from "@/features/admin/lib/excel"
import {
  CLINICAL_EXPORT_PACKAGE_KIND,
  EXPORT_SHEET,
} from "@/features/patients/lib/export-patient-records"
import type { ClinicalRecordScope } from "@/lib/clinical/record-scope"
import { clinicalScopeForDesignation } from "@/lib/clinical/record-scope"
import {
  DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPES,
  type MedicalDocumentType,
} from "@/types/medicalDocument"
import {
  campusIdsFromIdNumber,
  normalizePatientType,
  type PatientType,
  type MedicalHistory,
  type PhysicalExam,
  EMPTY_MEDICAL_HISTORY,
  EMPTY_PHYSICAL_EXAM,
} from "@/types/patientRecord"
import {
  normalizeConsultationStatus,
  type ConsultationPriority,
  type ConsultationStatus,
} from "@/types/consultation"

export type RestorePatientRow = {
  exportPatientRecordId: string
  patientType: PatientType
  idNumber: string
  firstName: string
  middleName: string
  lastName: string
  course: string
  yearLevel: string
  gender: string
  birthDate: string
  civilStatus: string
  religion: string
  nationality: string
  bloodType: string
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  lastVisit: string
}

export type RestoreMedicalProfileRow = {
  exportPatientRecordId: string
  idNumber: string
  allergies: string
  medicalConditions: string
  notes: string
  medicalHistory: MedicalHistory
  physicalExam: PhysicalExam
}

export type RestoreConsultationRow = {
  exportPatientRecordId: string
  idNumber: string
  exportConsultationId: string
  consultationDate: string
  chiefComplaint: string
  symptoms: string
  assessment: string
  diagnosis: string
  treatment: string
  prescription: string
  notes: string
  providerName: string
  providerRole: string
  providerType: "physician" | "dentist" | null
  station: string
  status: ConsultationStatus
  priority: ConsultationPriority
  followUpDate: string
  specialty: "medical" | "dental"
}

export type RestoreVitalsRow = {
  exportPatientRecordId: string
  idNumber: string
  exportConsultationId: string
  providerType: string
  bpSystolic: string
  bpDiastolic: string
  heartRate: string
  temperatureC: string
  spo2: string
  heightCm: string
  weightKg: string
  respiratoryRate: string
}

export type RestoreDocumentRow = {
  exportPatientRecordId: string
  idNumber: string
  documentNumber: string
  documentType: MedicalDocumentType
  certificateType: string
  exportConsultationId: string
  purpose: string
  doctorName: string
  status: string
  issuedAt: string
  validUntil: string
  remarks: string
}

export type ClinicalRestorePackage = {
  packageKind: string
  packageVersion: string
  exportRole: string
  clinicalScope: ClinicalRecordScope | null
  patients: RestorePatientRow[]
  medicalProfiles: RestoreMedicalProfileRow[]
  medicalConsultations: RestoreConsultationRow[]
  dentalConsultations: RestoreConsultationRow[]
  vitals: RestoreVitalsRow[]
  documents: RestoreDocumentRow[]
  warnings: string[]
}

export type ClinicalRestorePlan = {
  package: ClinicalRestorePackage
  allowedScope: ClinicalRecordScope
  counts: {
    patients: number
    medicalProfiles: number
    medicalConsultations: number
    dentalConsultations: number
    vitals: number
    documents: number
    ignoredSheets: string[]
  }
  blockingErrors: string[]
}

function cell(row: ExcelRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ""
}

function parseYesNo(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === "yes" || v === "true" || v === "1" || v === "y"
}

function parseManifest(rows: ExcelRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = cell(row, "key")
    const value = cell(row, "value")
    if (key) out[key] = value
  }
  return out
}

function mapDocumentType(raw: string): MedicalDocumentType | null {
  const value = raw.trim()
  if (!value) return null
  if ((MEDICAL_DOCUMENT_TYPES as readonly string[]).includes(value)) {
    return value as MedicalDocumentType
  }
  const lower = value.toLowerCase()
  for (const [type, label] of Object.entries(DOCUMENT_TYPE_LABELS)) {
    if (label.toLowerCase() === lower) return type as MedicalDocumentType
  }
  if (lower.includes("prescription") || lower.startsWith("rx")) {
    return "prescription"
  }
  if (lower.includes("go home") || lower.includes("may go home")) {
    return "go_home_slip"
  }
  if (lower.includes("nfg")) return "nfg_medical_clearance"
  if (lower.includes("certif") || lower.includes("clearance")) {
    return "medical_certification"
  }
  return null
}

function parsePatientRow(row: ExcelRow): RestorePatientRow | null {
  const patientType = normalizePatientType(cell(row, "patient_type")) ?? null
  const firstName = cell(row, "first_name")
  const lastName = cell(row, "last_name")
  const idNumber = cell(row, "id_number", "student_id", "employee_id")
  if (!patientType || !firstName || !lastName) return null
  if (patientType !== "visitor" && !idNumber) return null

  return {
    exportPatientRecordId: cell(row, "patient_record_id"),
    patientType,
    idNumber,
    firstName,
    middleName: cell(row, "middle_name"),
    lastName,
    course: cell(row, "course"),
    yearLevel: cell(row, "year_level"),
    gender: cell(row, "gender"),
    birthDate: cell(row, "birth_date"),
    civilStatus: cell(row, "civil_status"),
    religion: cell(row, "religion"),
    nationality: cell(row, "nationality"),
    bloodType: cell(row, "blood_type"),
    phone: cell(row, "phone"),
    email: cell(row, "email"),
    address: cell(row, "address"),
    emergencyContactName: cell(row, "emergency_contact_name"),
    emergencyContactPhone: cell(row, "emergency_contact_phone"),
    lastVisit: cell(row, "last_visit"),
  }
}

function parseMedicalProfileRow(row: ExcelRow): RestoreMedicalProfileRow | null {
  const exportPatientRecordId = cell(row, "patient_record_id")
  const idNumber = cell(row, "id_number")
  if (!exportPatientRecordId && !idNumber) return null

  const medicalHistory: MedicalHistory = {
    ...EMPTY_MEDICAL_HISTORY,
    previousIllnessOrSurgery: cell(row, "previous_illness_or_surgery"),
    allergy: parseYesNo(cell(row, "history_allergy")),
    asthma: parseYesNo(cell(row, "history_asthma")),
    tb: parseYesNo(cell(row, "history_tb")),
    hpn: parseYesNo(cell(row, "history_hpn")),
    gynecologicalObstetrical: parseYesNo(
      cell(row, "history_gynecological_obstetrical")
    ),
    smoker: parseYesNo(cell(row, "history_smoker")),
    alcoholicDrinker: parseYesNo(cell(row, "history_alcoholic_drinker")),
    diabetesMellitus: parseYesNo(cell(row, "history_diabetes_mellitus")),
    heartAilment: parseYesNo(cell(row, "history_heart_ailment")),
    kidneyDisease: parseYesNo(cell(row, "history_kidney_disease")),
  }

  const physicalExam: PhysicalExam = {
    ...EMPTY_PHYSICAL_EXAM,
    bloodPressure: cell(row, "exam_blood_pressure"),
    pulseRate: cell(row, "exam_pulse_rate"),
    temperature: cell(row, "exam_temperature"),
    weight: cell(row, "exam_weight"),
    height: cell(row, "exam_height"),
    o2: cell(row, "exam_o2"),
    skin: cell(row, "exam_skin"),
    eyesOd: cell(row, "exam_eyes_od"),
    eyesOs: cell(row, "exam_eyes_os"),
    earsAd: cell(row, "exam_ears_ad"),
    earsAs: cell(row, "exam_ears_as"),
    nose: cell(row, "exam_nose"),
    throat: cell(row, "exam_throat"),
    neck: cell(row, "exam_neck"),
    thorax: cell(row, "exam_thorax"),
    heart: cell(row, "exam_heart"),
    lungs: cell(row, "exam_lungs"),
    abdomen: cell(row, "exam_abdomen"),
    extremities: cell(row, "exam_extremities"),
    deformities: cell(row, "exam_deformities"),
    otherPertinentFindings: cell(row, "exam_other_pertinent_findings"),
  }

  return {
    exportPatientRecordId,
    idNumber,
    allergies: cell(row, "allergies"),
    medicalConditions: cell(row, "medical_conditions"),
    notes: cell(row, "notes"),
    medicalHistory,
    physicalExam,
  }
}

function parseConsultationRow(
  row: ExcelRow,
  specialty: "medical" | "dental"
): RestoreConsultationRow | null {
  const exportConsultationId = cell(row, "consultation_id")
  const exportPatientRecordId = cell(row, "patient_record_id")
  const idNumber = cell(row, "id_number")
  if (!exportConsultationId) return null
  if (!exportPatientRecordId && !idNumber) return null

  const providerRaw = cell(row, "provider_type").toLowerCase()
  const providerType =
    providerRaw === "dentist" || providerRaw === "physician"
      ? providerRaw
      : specialty === "dental"
        ? "dentist"
        : "physician"

  const priorityRaw = cell(row, "priority") || "Normal"
  const priority = (
    ["Low", "Normal", "High", "Emergency"].includes(priorityRaw)
      ? priorityRaw
      : "Normal"
  ) as ConsultationPriority

  return {
    exportPatientRecordId,
    idNumber,
    exportConsultationId,
    consultationDate: cell(row, "consultation_date"),
    chiefComplaint: cell(row, "chief_complaint"),
    symptoms: cell(row, "symptoms"),
    assessment: cell(row, "assessment"),
    diagnosis: cell(row, "diagnosis"),
    treatment: cell(row, "treatment"),
    prescription: cell(row, "prescription"),
    notes: cell(row, "advice_remarks", "notes"),
    providerName: cell(row, "provider_name"),
    providerRole: cell(row, "provider_role"),
    providerType,
    station: cell(row, "station") || providerType,
    status: normalizeConsultationStatus(cell(row, "status") || "completed"),
    priority,
    followUpDate: cell(row, "follow_up_date"),
    specialty,
  }
}

function parseVitalsRow(row: ExcelRow): RestoreVitalsRow | null {
  const exportConsultationId = cell(row, "consultation_id")
  if (!exportConsultationId) return null
  return {
    exportPatientRecordId: cell(row, "patient_record_id"),
    idNumber: cell(row, "id_number"),
    exportConsultationId,
    providerType: cell(row, "provider_type"),
    bpSystolic: cell(row, "bp_systolic"),
    bpDiastolic: cell(row, "bp_diastolic"),
    heartRate: cell(row, "heart_rate"),
    temperatureC: cell(row, "temperature_c"),
    spo2: cell(row, "spo2"),
    heightCm: cell(row, "height_cm"),
    weightKg: cell(row, "weight_kg"),
    respiratoryRate: cell(row, "respiratory_rate"),
  }
}

function parseDocumentRow(row: ExcelRow): RestoreDocumentRow | null {
  const documentNumber = cell(row, "document_number")
  const documentType = mapDocumentType(
    cell(row, "document_type", "certificate_type")
  )
  if (!documentNumber || !documentType) return null
  return {
    exportPatientRecordId: cell(row, "patient_record_id"),
    idNumber: cell(row, "id_number"),
    documentNumber,
    documentType,
    certificateType: cell(row, "certificate_type"),
    exportConsultationId: cell(row, "consultation_id"),
    purpose: cell(row, "purpose"),
    doctorName: cell(row, "doctor_name"),
    status: cell(row, "status") || "issued",
    issuedAt: cell(row, "issued_at"),
    validUntil: cell(row, "valid_until"),
    remarks: cell(row, "remarks"),
  }
}

function collectRows<T>(
  sheets: Map<string, ExcelRow[]>,
  names: string[],
  mapRow: (row: ExcelRow) => T | null
): T[] {
  const out: T[] = []
  for (const name of names) {
    for (const row of sheets.get(name) ?? []) {
      const mapped = mapRow(row)
      if (mapped) out.push(mapped)
    }
  }
  return out
}

/** Detect clinical export package from multi-sheet workbook rows. */
export function isClinicalExportPackage(
  sheets: Map<string, ExcelRow[]>
): boolean {
  const manifest = parseManifest(sheets.get(EXPORT_SHEET.manifest) ?? [])
  if (manifest.package_kind === CLINICAL_EXPORT_PACKAGE_KIND) return true
  return sheets.has(EXPORT_SHEET.patientInformation)
}

export function parseClinicalRestorePackage(
  sheets: Map<string, ExcelRow[]>
): ClinicalRestorePackage {
  const warnings: string[] = []
  const manifest = parseManifest(sheets.get(EXPORT_SHEET.manifest) ?? [])

  if (!sheets.has(EXPORT_SHEET.patientInformation)) {
    throw new Error(
      "This file is not a CampusCare clinical export. Missing “Patient Information” sheet."
    )
  }

  const patients = collectRows(
    sheets,
    [EXPORT_SHEET.patientInformation],
    parsePatientRow
  )
  if (patients.length === 0) {
    throw new Error(
      "Patient Information sheet has no valid patient rows to restore."
    )
  }

  const medicalProfiles = collectRows(
    sheets,
    [EXPORT_SHEET.medicalProfile],
    parseMedicalProfileRow
  )
  const medicalConsultations = collectRows(
    sheets,
    [EXPORT_SHEET.medicalConsultations],
    (row) => parseConsultationRow(row, "medical")
  )
  const dentalConsultations = collectRows(
    sheets,
    [EXPORT_SHEET.dentalConsultations],
    (row) => parseConsultationRow(row, "dental")
  )
  const vitals = collectRows(
    sheets,
    [
      EXPORT_SHEET.vitalSigns,
      EXPORT_SHEET.medicalVitalSigns,
      EXPORT_SHEET.dentalVitalSigns,
    ],
    parseVitalsRow
  )
  const documents = collectRows(
    sheets,
    [
      EXPORT_SHEET.documents,
      EXPORT_SHEET.medicalDocuments,
      EXPORT_SHEET.dentalDocuments,
    ],
    parseDocumentRow
  )

  const known = new Set<string>(Object.values(EXPORT_SHEET))
  for (const name of sheets.keys()) {
    if (!known.has(name)) {
      warnings.push(`Ignored unrecognized sheet “${name}”.`)
    }
  }

  const scopeRaw = manifest.clinical_scope
  const clinicalScope =
    scopeRaw === "all" || scopeRaw === "medical" || scopeRaw === "dental"
      ? scopeRaw
      : null

  return {
    packageKind: manifest.package_kind || CLINICAL_EXPORT_PACKAGE_KIND,
    packageVersion: manifest.package_version || "1",
    exportRole: manifest.export_role || "",
    clinicalScope,
    patients,
    medicalProfiles,
    medicalConsultations,
    dentalConsultations,
    vitals,
    documents,
    warnings,
  }
}

/**
 * Apply restorer role scope: drop unauthorized clinical sheets and validate links.
 */
export function planClinicalRestore(input: {
  designation: string
  package: ClinicalRestorePackage
}): ClinicalRestorePlan {
  const allowedScope = clinicalScopeForDesignation(input.designation)
  const pkg = input.package
  const blockingErrors: string[] = []
  const ignoredSheets: string[] = []
  const warnings = [...pkg.warnings]

  let medicalProfiles = pkg.medicalProfiles
  let medicalConsultations = pkg.medicalConsultations
  let dentalConsultations = pkg.dentalConsultations
  let vitals = pkg.vitals
  let documents = pkg.documents

  if (allowedScope === "medical") {
    if (dentalConsultations.length > 0) {
      ignoredSheets.push(EXPORT_SHEET.dentalConsultations)
    }
    dentalConsultations = []
    vitals = vitals.filter((row) => {
      const match = pkg.medicalConsultations.find(
        (c) => c.exportConsultationId === row.exportConsultationId
      )
      return Boolean(match) || row.providerType.toLowerCase() !== "dentist"
    })
    documents = documents.filter((doc) => {
      if (!doc.exportConsultationId) {
        return !/dent/i.test(doc.certificateType)
      }
      return pkg.medicalConsultations.some(
        (c) => c.exportConsultationId === doc.exportConsultationId
      )
    })
  }

  if (allowedScope === "dental") {
    if (medicalProfiles.length > 0) {
      ignoredSheets.push(EXPORT_SHEET.medicalProfile)
    }
    if (medicalConsultations.length > 0) {
      ignoredSheets.push(EXPORT_SHEET.medicalConsultations)
    }
    medicalProfiles = []
    medicalConsultations = []
    vitals = vitals.filter((row) => {
      const match = pkg.dentalConsultations.find(
        (c) => c.exportConsultationId === row.exportConsultationId
      )
      return Boolean(match) || row.providerType.toLowerCase() === "dentist"
    })
    documents = documents.filter((doc) => {
      if (!doc.exportConsultationId) {
        return /dent/i.test(doc.certificateType)
      }
      return pkg.dentalConsultations.some(
        (c) => c.exportConsultationId === doc.exportConsultationId
      )
    })
  }

  const patientKeys = new Set<string>()
  for (const patient of pkg.patients) {
    if (patient.exportPatientRecordId) {
      patientKeys.add(`id:${patient.exportPatientRecordId}`)
    }
    if (patient.idNumber) {
      patientKeys.add(`campus:${patient.idNumber}`)
    }
    const ids = campusIdsFromIdNumber(patient.patientType, patient.idNumber)
    if (ids.ok) {
      if (ids.studentId) patientKeys.add(`campus:${ids.studentId}`)
      if (ids.employeeId) patientKeys.add(`campus:${ids.employeeId}`)
    }
  }

  const consultIds = new Set(
    [...medicalConsultations, ...dentalConsultations].map(
      (c) => c.exportConsultationId
    )
  )

  for (const consult of [...medicalConsultations, ...dentalConsultations]) {
    const ok =
      (consult.exportPatientRecordId &&
        patientKeys.has(`id:${consult.exportPatientRecordId}`)) ||
      (consult.idNumber && patientKeys.has(`campus:${consult.idNumber}`))
    if (!ok) {
      blockingErrors.push(
        `Consultation ${consult.exportConsultationId} is not linked to a Patient Information row.`
      )
    }
  }

  for (const vital of vitals) {
    if (!consultIds.has(vital.exportConsultationId)) {
      warnings.push(
        `Vital signs for consultation ${vital.exportConsultationId} have no matching consultation row and will be skipped.`
      )
    }
  }

  return {
    package: {
      ...pkg,
      medicalProfiles,
      medicalConsultations,
      dentalConsultations,
      vitals,
      documents,
      warnings,
    },
    allowedScope,
    counts: {
      patients: pkg.patients.length,
      medicalProfiles: medicalProfiles.length,
      medicalConsultations: medicalConsultations.length,
      dentalConsultations: dentalConsultations.length,
      vitals: vitals.length,
      documents: documents.length,
      ignoredSheets,
    },
    blockingErrors,
  }
}
