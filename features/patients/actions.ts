"use server"

import {
  getPatientRecordById,
  getPatientRecords,
  getPatientRecordStats,
  updatePatientRecord,
} from "@/services/patientRecords"
import {
  PatientRecordServiceError,
  type PatientRecord,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"

export type PatientActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): PatientActionResult<never> {
  if (error instanceof PatientRecordServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
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
): Promise<PatientActionResult<PatientRecordListResult>> {
  try {
    return { ok: true, data: await getPatientRecords(params) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientRecordStatsAction(): Promise<
  PatientActionResult<PatientRecordStats>
> {
  try {
    return { ok: true, data: await getPatientRecordStats() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientRecordByIdAction(
  id: string
): Promise<PatientActionResult<PatientRecord>> {
  try {
    return { ok: true, data: await getPatientRecordById(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updatePatientRecordAction(
  input: UpdatePatientRecordInput
): Promise<PatientActionResult<PatientRecord>> {
  try {
    return { ok: true, data: await updatePatientRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}
