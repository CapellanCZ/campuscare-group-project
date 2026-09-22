import {
  patientCampusId,
  type PatientRecord,
  type PatientType,
} from "@/types/patientRecord"

/** Same columns as the Patient Records import template for round-trip export. */
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

export type PatientRecordExportRow = string[]

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

export function patientRecordsExportFilename(
  patientType: PatientType | "all" = "all"
): string {
  const day = new Date().toISOString().slice(0, 10)
  const typePart = patientType === "all" ? "all" : patientType
  return `patient-records-export-${typePart}-${day}.xlsx`
}
