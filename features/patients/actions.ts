"use server"

import {
  createPatientRecord,
  deletePatientRecord,
  getPatientRecordById,
  getPatientRecords,
  getPatientRecordStats,
  importPatientRecordsFromExcel,
  listPatientOptions,
  searchPatientRecords,
  updatePatientRecord,
} from "@/services/patientRecords"
import {
  PatientRecordServiceError,
  type CreatePatientRecordInput,
  type PatientRecord,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"
import {
  getConsultationsByPatientId,
} from "@/services/consultations"
import type { Consultation } from "@/types/consultation"

export type PatientRecordActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

export type PatientRecordImportActionResult =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): PatientRecordActionResult<never> {
  if (error instanceof PatientRecordServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return {
        ok: false,
        error: "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading patient records.",
    code: "unknown",
  }
}

export async function fetchPatientRecordsAction(
  params: PatientRecordListParams = {}
): Promise<PatientRecordActionResult<PatientRecordListResult>> {
  try {
    const data = await getPatientRecords(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchPatientRecordsAction(
  query: string,
  params: Omit<PatientRecordListParams, "query"> = {}
): Promise<PatientRecordActionResult<PatientRecordListResult>> {
  try {
    const data = await searchPatientRecords(query, params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientRecordByIdAction(
  id: string
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    const data = await getPatientRecordById(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientRecordStatsAction(): Promise<
  PatientRecordActionResult<PatientRecordStats>
> {
  try {
    const data = await getPatientRecordStats()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function createPatientRecordAction(
  input: CreatePatientRecordInput
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    const data = await createPatientRecord(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updatePatientRecordAction(
  input: UpdatePatientRecordInput
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    const data = await updatePatientRecord(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deletePatientRecordAction(
  id: string
): Promise<PatientRecordActionResult<{ id: string }>> {
  try {
    await deletePatientRecord(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listPatientOptionsAction(
  query = ""
): Promise<PatientRecordActionResult<PatientRecord[]>> {
  try {
    const data = await listPatientOptions(query)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientConsultationHistoryAction(
  patientId: string
): Promise<PatientRecordActionResult<Consultation[]>> {
  try {
    const data = await getConsultationsByPatientId(patientId)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function importPatientRecordsFromExcelAction(
  formData: FormData
): Promise<PatientRecordImportActionResult> {
  try {
    const result = await importPatientRecordsFromExcel(formData)
    return {
      ok: true,
      message: `Imported ${result.created} patient${result.created === 1 ? "" : "s"}.`,
      warning:
        result.failures.length > 0
          ? `${result.failures.length} row(s) failed. ${result.failures.slice(0, 3).join(" · ")}`
          : undefined,
    }
  } catch (error) {
    const failed = toErrorResult(error)
    return { ok: false, error: failed.error, code: failed.code }
  }
}
