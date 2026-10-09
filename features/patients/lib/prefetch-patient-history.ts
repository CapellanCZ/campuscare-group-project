"use client"

import {
  fetchPatientConsultationHistoryAction,
  fetchPatientDocumentsAction,
} from "@/features/patients/actions"
import type { ClinicalRecordScope } from "@/lib/clinical/record-scope"
import {
  patientHistoryCacheKey,
  staffCacheGet,
  staffCacheLoad,
} from "@/lib/ui/staff-data-cache"
import type { Consultation } from "@/types/consultation"
import type { MedicalCertificate } from "@/types/medicalCertificate"
import type { PatientRecord } from "@/types/patientRecord"

export type PatientHistoryEntry =
  | { kind: "consultation"; date: string; row: Consultation }
  | { kind: "report"; date: string; row: MedicalCertificate }

export type PatientHistoryBundle = {
  entries: PatientHistoryEntry[]
}

function buildKey(
  patient: Pick<PatientRecord, "id">,
  stationFilter: string,
  documentScope: ClinicalRecordScope
) {
  return patientHistoryCacheKey(patient.id, stationFilter, documentScope)
}

export function getCachedPatientHistory(
  patient: Pick<PatientRecord, "id">,
  stationFilter: string,
  documentScope: ClinicalRecordScope
): PatientHistoryBundle | null {
  return staffCacheGet<PatientHistoryBundle>(
    buildKey(patient, stationFilter, documentScope)
  )
}

export async function loadPatientHistoryBundle(
  patient: Pick<PatientRecord, "id" | "studentId" | "employeeId">,
  stationFilter: "dentist" | "physician" | "nurse" | "all",
  documentScope: ClinicalRecordScope,
  options?: { force?: boolean }
): Promise<PatientHistoryBundle> {
  const key = buildKey(patient, stationFilter, documentScope)
  return staffCacheLoad(
    key,
    async () => {
      const [consultResult, docResult] = await Promise.all([
        fetchPatientConsultationHistoryAction(patient.id, stationFilter),
        fetchPatientDocumentsAction(
          {
            studentId: patient.studentId,
            employeeId: patient.employeeId,
          },
          documentScope
        ),
      ])

      if (!consultResult.ok) {
        throw new Error(consultResult.error)
      }

      const entries: PatientHistoryEntry[] = [
        ...consultResult.data.map(
          (row) =>
            ({
              kind: "consultation" as const,
              date: row.consultationDate,
              row,
            }) satisfies PatientHistoryEntry
        ),
        ...(docResult.ok ? docResult.data : []).map(
          (row) =>
            ({
              kind: "report" as const,
              date: row.issuedAt ?? row.createdAt,
              row,
            }) satisfies PatientHistoryEntry
        ),
      ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

      return { entries }
    },
    options
  )
}

/** Warm history before the dialog opens (hover / focus). */
export function prefetchPatientHistory(
  patient: Pick<PatientRecord, "id" | "studentId" | "employeeId">,
  stationFilter: "dentist" | "physician" | "nurse" | "all",
  documentScope: ClinicalRecordScope
) {
  void loadPatientHistoryBundle(patient, stationFilter, documentScope)
}
