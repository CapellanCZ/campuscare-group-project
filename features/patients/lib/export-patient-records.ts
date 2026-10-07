import {
  clinicalScopeForDesignation,
  consultationTypeOf,
  filterConsultationsByStation,
  type ClinicalRecordScope,
  type HistoryStationFilter,
} from "@/lib/clinical/record-scope"
import type { QueueVitals } from "@/lib/health/types"
import {
  consultationStatusLabel,
  resolveConsultationProviderRole,
  type Consultation,
} from "@/types/consultation"
import {
  DOCUMENT_TYPE_LABELS,
  type MedicalDocument,
  type MedicalDocumentType,
} from "@/types/medicalDocument"
import {
  patientCampusId,
  patientFullName,
  type PatientRecord,
  type PatientType,
} from "@/types/patientRecord"

export const PATIENT_RECORD_EXPORT_HEADERS = [
  "patient_type",
  "id_number",
  "first_name",
  "middle_name",
  "last_name",
  "course",
  "year_level",
  "gender",
  "birth_date",
  "phone",
  "email",
] as const

/** Canonical sheet names written by clinical export (import detects these). */
export const EXPORT_SHEET = {
  manifest: "Manifest",
  patientInformation: "Patient Information",
  medicalProfile: "Medical Profile",
  medicalConsultations: "Medical Consultations",
  dentalConsultations: "Dental Consultations",
  vitalSigns: "Vital Signs",
  medicalVitalSigns: "Medical Vital Signs",
  dentalVitalSigns: "Dental Vital Signs",
  documents: "Documents",
  medicalDocuments: "Medical Documents",
  dentalDocuments: "Dental Documents",
} as const

export const CLINICAL_EXPORT_PACKAGE_KIND = "campuscare-patient-records-clinical"

export type PatientRecordExportRow = string[]

export type PatientRecordsExportSheet = {
  name: string
  headers: string[]
  rows: string[][]
}

export type PatientRecordsExportWorkbook = {
  filename: string
  sheets: PatientRecordsExportSheet[]
  patientCount: number
  role: string
  scope: ClinicalRecordScope
}

function cell(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value)
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No"
}

function formatExportDate(value: string | null | undefined): string {
  if (!value) return ""
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(parsed))
}

function formatExportDateTime(value: string | null | undefined): string {
  if (!value) return ""
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(parsed))
}

/** Parse consultation vitals JSON into QueueVitals (server-safe). */
export function vitalsFromConsultationRecord(
  value: Record<string, unknown> | null | undefined
): QueueVitals | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const num = (key: string) => {
    const raw = v[key]
    if (raw == null || raw === "") return null
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
    const match = String(raw).replace(/,/g, "").match(/-?\d+(\.\d+)?/)
    if (!match) return null
    const n = Number(match[0])
    return Number.isFinite(n) ? n : null
  }

  let bpSystolic = num("bpSystolic") ?? num("bp_systolic")
  let bpDiastolic = num("bpDiastolic") ?? num("bp_diastolic")
  const bloodPressure =
    typeof v.bloodPressure === "string" ? v.bloodPressure.trim() : ""
  if ((bpSystolic == null || bpDiastolic == null) && bloodPressure) {
    const match = bloodPressure.match(/(\d+)\s*\/\s*(\d+)/)
    if (match) {
      bpSystolic = Number(match[1])
      bpDiastolic = Number(match[2])
    }
  }

  const heartRate = num("heartRate") ?? num("heart_rate") ?? num("pulseRate")
  const temperatureC =
    num("temperatureC") ?? num("temperature_c") ?? num("temperature")
  const spo2 = num("spo2") ?? num("o2")
  const heightCm = num("heightCm") ?? num("height_cm") ?? num("height")
  const weightKg = num("weightKg") ?? num("weight_kg") ?? num("weight")
  const respiratoryRate = num("respiratoryRate") ?? num("respiratory_rate")

  const result: QueueVitals = {
    bpSystolic: Number.isFinite(bpSystolic) ? bpSystolic : null,
    bpDiastolic: Number.isFinite(bpDiastolic) ? bpDiastolic : null,
    heartRate: Number.isFinite(heartRate) ? heartRate : null,
    temperatureC: Number.isFinite(temperatureC) ? temperatureC : null,
    spo2: Number.isFinite(spo2) ? spo2 : null,
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
    weightKg: Number.isFinite(weightKg) ? weightKg : null,
    respiratoryRate: Number.isFinite(respiratoryRate) ? respiratoryRate : null,
  }

  const hasAny =
    result.bpSystolic != null ||
    result.bpDiastolic != null ||
    result.heartRate != null ||
    result.temperatureC != null ||
    result.spo2 != null ||
    result.heightCm != null ||
    result.weightKg != null ||
    result.respiratoryRate != null

  return hasAny ? result : null
}

export function patientRecordToExportRow(
  patient: PatientRecord
): PatientRecordExportRow {
  return [
    patient.patientType,
    patientCampusId(patient) ?? "",
    patient.firstName,
    patient.middleName ?? "",
    patient.lastName,
    patient.course ?? "",
    patient.yearLevel ?? "",
    patient.gender ?? "",
    patient.birthDate ?? "",
    patient.phone ?? "",
    patient.email ?? "",
  ]
}

const PATIENT_INFO_HEADERS = [
  "patient_record_id",
  "patient_type",
  "id_number",
  "first_name",
  "middle_name",
  "last_name",
  "course",
  "year_level",
  "gender",
  "birth_date",
  "civil_status",
  "religion",
  "nationality",
  "blood_type",
  "phone",
  "email",
  "address",
  "emergency_contact_name",
  "emergency_contact_phone",
  "last_visit",
] as const

const MEDICAL_PROFILE_HEADERS = [
  "patient_record_id",
  "id_number",
  "patient_name",
  "allergies",
  "medical_conditions",
  "previous_illness_or_surgery",
  "history_allergy",
  "history_asthma",
  "history_tb",
  "history_hpn",
  "history_gynecological_obstetrical",
  "history_smoker",
  "history_alcoholic_drinker",
  "history_diabetes_mellitus",
  "history_heart_ailment",
  "history_kidney_disease",
  "exam_blood_pressure",
  "exam_pulse_rate",
  "exam_temperature",
  "exam_weight",
  "exam_height",
  "exam_o2",
  "exam_skin",
  "exam_eyes_od",
  "exam_eyes_os",
  "exam_ears_ad",
  "exam_ears_as",
  "exam_nose",
  "exam_throat",
  "exam_neck",
  "exam_thorax",
  "exam_heart",
  "exam_lungs",
  "exam_abdomen",
  "exam_extremities",
  "exam_deformities",
  "exam_other_pertinent_findings",
  "notes",
] as const

const CONSULTATION_HEADERS = [
  "patient_record_id",
  "id_number",
  "patient_name",
  "consultation_id",
  "consultation_date",
  "chief_complaint",
  "symptoms",
  "assessment",
  "diagnosis",
  "treatment",
  "prescription",
  "advice_remarks",
  "provider_name",
  "provider_role",
  "provider_type",
  "station",
  "status",
  "priority",
  "follow_up_date",
  "queue_ticket_id",
] as const

const VITALS_HEADERS = [
  "patient_record_id",
  "id_number",
  "patient_name",
  "consultation_id",
  "consultation_date",
  "provider_type",
  "bp_systolic",
  "bp_diastolic",
  "heart_rate",
  "temperature_c",
  "spo2",
  "height_cm",
  "weight_kg",
  "respiratory_rate",
] as const

const DOCUMENT_HEADERS = [
  "patient_record_id",
  "id_number",
  "patient_name",
  "document_number",
  "document_type",
  "certificate_type",
  "consultation_id",
  "purpose",
  "doctor_name",
  "status",
  "issued_at",
  "valid_until",
  "remarks",
] as const

function patientInfoRow(patient: PatientRecord): string[] {
  return [
    patient.id,
    patient.patientType,
    patientCampusId(patient) ?? "",
    patient.firstName,
    patient.middleName ?? "",
    patient.lastName,
    patient.course ?? "",
    patient.yearLevel ?? "",
    patient.gender ?? "",
    patient.birthDate ?? "",
    patient.civilStatus ?? "",
    patient.religion ?? "",
    patient.nationality ?? "",
    patient.bloodType ?? "",
    patient.phone ?? "",
    patient.email ?? "",
    patient.address ?? "",
    patient.emergencyContactName ?? "",
    patient.emergencyContactPhone ?? "",
    formatExportDate(patient.lastVisit),
  ]
}

function medicalProfileRow(patient: PatientRecord): string[] {
  const history = patient.medicalHistory
  const exam = patient.physicalExam
  return [
    patient.id,
    patientCampusId(patient) ?? "",
    patientFullName(patient),
    patient.allergies ?? "",
    patient.medicalConditions ?? "",
    history.previousIllnessOrSurgery ?? "",
    yesNo(history.allergy),
    yesNo(history.asthma),
    yesNo(history.tb),
    yesNo(history.hpn),
    yesNo(history.gynecologicalObstetrical),
    yesNo(history.smoker),
    yesNo(history.alcoholicDrinker),
    yesNo(history.diabetesMellitus),
    yesNo(history.heartAilment),
    yesNo(history.kidneyDisease),
    exam.bloodPressure ?? "",
    exam.pulseRate ?? "",
    exam.temperature ?? "",
    exam.weight ?? "",
    exam.height ?? "",
    exam.o2 ?? "",
    exam.skin ?? "",
    exam.eyesOd ?? "",
    exam.eyesOs ?? "",
    exam.earsAd ?? "",
    exam.earsAs ?? "",
    exam.nose ?? "",
    exam.throat ?? "",
    exam.neck ?? "",
    exam.thorax ?? "",
    exam.heart ?? "",
    exam.lungs ?? "",
    exam.abdomen ?? "",
    exam.extremities ?? "",
    exam.deformities ?? "",
    exam.otherPertinentFindings ?? "",
    patient.notes ?? "",
  ]
}

function consultationRow(
  patient: PatientRecord,
  consultation: Consultation
): string[] {
  return [
    patient.id,
    patientCampusId(patient) ?? "",
    patientFullName(patient),
    consultation.id,
    formatExportDateTime(consultation.consultationDate),
    consultation.chiefComplaint ?? "",
    consultation.symptoms ?? "",
    consultation.assessment ?? "",
    consultation.diagnosis ?? "",
    consultation.treatment ?? "",
    consultation.prescription ?? "",
    consultation.notes ?? "",
    consultation.providerName ?? "",
    consultation.providerRole ?? "",
    consultation.providerType ?? "",
    consultation.station ?? "",
    consultationStatusLabel(consultation.status),
    consultation.priority,
    formatExportDate(consultation.followUpDate),
    consultation.queueTicketId ?? "",
  ]
}

function vitalsRow(
  patient: PatientRecord,
  consultation: Consultation
): string[] | null {
  const vitals = vitalsFromConsultationRecord(consultation.vitals)
  if (!vitals) return null
  return [
    patient.id,
    patientCampusId(patient) ?? "",
    patientFullName(patient),
    consultation.id,
    formatExportDateTime(consultation.consultationDate),
    consultation.providerType ??
      resolveConsultationProviderRole(consultation) ??
      "",
    cell(vitals.bpSystolic),
    cell(vitals.bpDiastolic),
    cell(vitals.heartRate),
    cell(vitals.temperatureC),
    cell(vitals.spo2),
    cell(vitals.heightCm),
    cell(vitals.weightKg),
    cell(vitals.respiratoryRate),
  ]
}

function documentTypeLabel(doc: MedicalDocument): string {
  return (
    DOCUMENT_TYPE_LABELS[doc.documentType as MedicalDocumentType] ??
    doc.certificateType ??
    doc.documentType
  )
}

function documentRow(
  patient: PatientRecord,
  document: MedicalDocument
): string[] {
  return [
    patient.id,
    patientCampusId(patient) ?? "",
    patientFullName(patient),
    document.documentNumber,
    documentTypeLabel(document),
    document.certificateType ?? "",
    document.consultationId ?? "",
    document.purpose ?? "",
    document.doctorName ?? "",
    document.status,
    formatExportDateTime(document.issuedAt),
    formatExportDate(document.validUntil),
    document.remarks ?? "",
  ]
}

function sheetOrOmit(
  name: string,
  headers: readonly string[],
  rows: string[][]
): PatientRecordsExportSheet | null {
  if (rows.length === 0) return null
  return { name, headers: [...headers], rows }
}

function pushSheet(
  sheets: PatientRecordsExportSheet[],
  sheet: PatientRecordsExportSheet | null
) {
  if (sheet) sheets.push(sheet)
}

function filterDocumentsForScope(
  documents: MedicalDocument[],
  consultationsById: Map<string, Consultation>,
  scope: ClinicalRecordScope
): MedicalDocument[] {
  if (scope === "all") return documents
  return documents.filter((doc) => {
    if (doc.consultationId) {
      const consultation = consultationsById.get(doc.consultationId)
      if (consultation) {
        const role = resolveConsultationProviderRole(consultation)
        if (role === "dentist") return scope === "dental"
        if (role === "physician") return scope === "medical"
      }
    }
    return consultationTypeOf(null, doc.certificateType) === scope
  })
}

export function historyStationFilterForExportRole(
  designation: string
): HistoryStationFilter {
  if (designation === "dentist") return "dentist"
  if (designation === "physician") return "physician"
  return "all"
}

export function buildPatientRecordsExportWorkbook(input: {
  designation: string
  patients: PatientRecord[]
  consultations: Consultation[]
  documents: MedicalDocument[]
  patientTypeFilter?: PatientType | "all"
}): PatientRecordsExportWorkbook {
  const scope = clinicalScopeForDesignation(input.designation)
  const stationFilter = historyStationFilterForExportRole(input.designation)
  const patientsById = new Map(input.patients.map((p) => [p.id, p]))
  const consultationsById = new Map(
    input.consultations.map((c) => [c.id, c])
  )

  const scopedConsultations = filterConsultationsByStation(
    input.consultations.filter((c) => patientsById.has(c.patientId)),
    stationFilter
  )

  const medicalConsultations = scopedConsultations.filter(
    (c) => resolveConsultationProviderRole(c) === "physician"
  )
  const dentalConsultations = scopedConsultations.filter(
    (c) => resolveConsultationProviderRole(c) === "dentist"
  )
  const unresolvedConsultations =
    scope === "all"
      ? scopedConsultations.filter(
          (c) => resolveConsultationProviderRole(c) == null
        )
      : []

  const medicalConsultationsForSheet = [
    ...medicalConsultations,
    ...unresolvedConsultations,
  ]

  const scopedDocuments = filterDocumentsForScope(
    input.documents.filter((doc) => {
      if (doc.patientRecordId && patientsById.has(doc.patientRecordId)) {
        return true
      }
      if (
        doc.consultationId &&
        consultationsById.has(doc.consultationId) &&
        patientsById.has(
          consultationsById.get(doc.consultationId)!.patientId
        )
      ) {
        return true
      }
      return false
    }),
    consultationsById,
    scope
  )

  const sheets: PatientRecordsExportSheet[] = []

  sheets.push({
    name: EXPORT_SHEET.manifest,
    headers: ["key", "value"],
    rows: [
      ["package_kind", CLINICAL_EXPORT_PACKAGE_KIND],
      ["package_version", "1"],
      ["exported_at", new Date().toISOString()],
      ["export_role", input.designation],
      ["clinical_scope", scope],
      ["patient_count", String(input.patients.length)],
      ["medical_consultation_count", String(medicalConsultationsForSheet.length)],
      ["dental_consultation_count", String(dentalConsultations.length)],
      ["document_count", String(scopedDocuments.length)],
    ],
  })

  sheets.push({
    name: EXPORT_SHEET.patientInformation,
    headers: [...PATIENT_INFO_HEADERS],
    rows: input.patients.map(patientInfoRow),
  })

  if (scope === "all" || scope === "medical") {
    pushSheet(
      sheets,
      sheetOrOmit(
        EXPORT_SHEET.medicalProfile,
        MEDICAL_PROFILE_HEADERS,
        input.patients.map(medicalProfileRow)
      )
    )
  }

  if (scope === "all" || scope === "medical") {
    pushSheet(
      sheets,
      sheetOrOmit(
        EXPORT_SHEET.medicalConsultations,
        CONSULTATION_HEADERS,
        medicalConsultationsForSheet.flatMap((consultation) => {
          const patient = patientsById.get(consultation.patientId)
          return patient ? [consultationRow(patient, consultation)] : []
        })
      )
    )
  }

  if (scope === "all" || scope === "dental") {
    pushSheet(
      sheets,
      sheetOrOmit(
        EXPORT_SHEET.dentalConsultations,
        CONSULTATION_HEADERS,
        dentalConsultations.flatMap((consultation) => {
          const patient = patientsById.get(consultation.patientId)
          return patient ? [consultationRow(patient, consultation)] : []
        })
      )
    )
  }

  const vitalsSource =
    scope === "dental"
      ? dentalConsultations
      : scope === "medical"
        ? medicalConsultationsForSheet
        : scopedConsultations

  const vitalsRows = vitalsSource.flatMap((consultation) => {
    const patient = patientsById.get(consultation.patientId)
    if (!patient) return []
    const row = vitalsRow(patient, consultation)
    return row ? [row] : []
  })

  const vitalsSheetName =
    scope === "dental"
      ? EXPORT_SHEET.dentalVitalSigns
      : scope === "medical"
        ? EXPORT_SHEET.medicalVitalSigns
        : EXPORT_SHEET.vitalSigns

  pushSheet(sheets, sheetOrOmit(vitalsSheetName, VITALS_HEADERS, vitalsRows))

  const documentSheetName =
    scope === "dental"
      ? EXPORT_SHEET.dentalDocuments
      : scope === "medical"
        ? EXPORT_SHEET.medicalDocuments
        : EXPORT_SHEET.documents

  pushSheet(
    sheets,
    sheetOrOmit(
      documentSheetName,
      DOCUMENT_HEADERS,
      scopedDocuments.flatMap((document) => {
        const patientId =
          document.patientRecordId ??
          (document.consultationId
            ? consultationsById.get(document.consultationId)?.patientId
            : null)
        if (!patientId) return []
        const patient = patientsById.get(patientId)
        return patient ? [documentRow(patient, document)] : []
      })
    )
  )

  return {
    filename: patientRecordsExportFilename(
      input.patientTypeFilter ?? "all",
      input.designation
    ),
    sheets,
    patientCount: input.patients.length,
    role: input.designation,
    scope,
  }
}

export function patientRecordsExportFilename(
  patientType: PatientType | "all" = "all",
  designation?: string
): string {
  const day = new Date().toISOString().slice(0, 10)
  const typePart = patientType === "all" ? "all" : patientType
  const rolePart = designation ? `${designation}-` : ""
  return `patient-records-export-${rolePart}${typePart}-${day}.xlsx`
}
