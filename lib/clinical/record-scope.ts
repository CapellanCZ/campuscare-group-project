import type { Consultation } from "@/types/consultation"
import {
  consultationMatchesProviderRole,
  resolveConsultationProviderRole,
} from "@/types/consultation"
import type { MedicalCertificate } from "@/types/medicalCertificate"

export type ClinicalRecordScope = "dental" | "medical" | "all"

export type HistoryStationFilter = "dentist" | "physician" | "nurse" | "all"

export function clinicalScopeForDesignation(
  designation: string
): ClinicalRecordScope {
  if (designation === "dentist") return "dental"
  if (designation === "physician") return "medical"
  return "all"
}

export function historyStationFilterForDesignation(
  designation: string
): HistoryStationFilter {
  if (designation === "dentist") return "dentist"
  if (designation === "physician") return "physician"
  return "all"
}

/** Classify a row as medical or dental using station / certificate type text. */
export function consultationTypeOf(
  station: string | null | undefined,
  certificateType?: string | null
): "medical" | "dental" {
  const hay = `${station ?? ""} ${certificateType ?? ""}`.toLowerCase()
  return hay.includes("dent") ? "dental" : "medical"
}

export function filterConsultationsByStation(
  rows: Consultation[],
  stationFilter: HistoryStationFilter
): Consultation[] {
  if (!stationFilter || stationFilter === "all" || stationFilter === "nurse") {
    return rows
  }
  return rows.filter((row) => consultationMatchesProviderRole(row, stationFilter))
}

export function filterCertificatesByScope(
  rows: MedicalCertificate[],
  scope: ClinicalRecordScope
): MedicalCertificate[] {
  if (scope === "all") return rows
  return rows.filter(
    (row) => consultationTypeOf(null, row.certificateType) === scope
  )
}

export function patientMatchesSearchQuery(
  fullName: string,
  studentId: string | null | undefined,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = fullName.toLowerCase()
  const id = (studentId ?? "").toLowerCase()
  return name.includes(q) || id.includes(q)
}
