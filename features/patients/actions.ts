"use server"

import {
  getDirectoryPatientRecordStats,
  listDirectoryPatientRecords,
  listEnrolledPatientOptions,
} from "@/lib/students/directory"
import {
  ensurePatientFromStudentId,
} from "@/lib/students/ensure-patient"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import {
  isEnrolledVirtualId,
  studentIdFromVirtualId,
} from "@/lib/students/virtual-id"
import {
  createPatientRecord,
  deletePatientRecord,
  getPatientRecordById,
  importPatientRecordsFromExcel,
  updatePatientMedicalRecord,
  updatePatientRecord,
} from "@/services/patientRecords"
import {
  PatientRecordServiceError,
  patientFullName,
  type CreatePatientRecordInput,
  type PatientRecord,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type UpdatePatientMedicalRecordInput,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"
import {
  getConsultationsByPatientId,
} from "@/services/consultations"
import { getMedicalCertificatesForPatientRecord } from "@/services/medicalCertificates"
import type { Consultation } from "@/types/consultation"
import type {
  MedicalCertificate,
  MedicalCertificatePatient,
} from "@/types/medicalCertificate"

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
    const data = await listDirectoryPatientRecords(params)
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
    const data = await listDirectoryPatientRecords({ ...params, query })
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchPatientByStudentIdAction(
  studentId: string
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    const id = studentId.trim()
    if (!id) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }

    const listed = await listDirectoryPatientRecords({
      query: id,
      page: 1,
      pageSize: 5,
      patientType: "all",
    })
    const exact =
      listed.items.find(
        (p) =>
          p.studentId?.toLowerCase() === id.toLowerCase() ||
          p.employeeId?.toLowerCase() === id.toLowerCase()
      ) ?? listed.items[0]
    if (exact) return { ok: true, data: exact }

    // Optional legacy fallback: enrollment bucket ensure for walk-ins not yet imported
    const ensured = await ensurePatientFromStudentId(id)
    if (!ensured) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }
    return { ok: true, data: ensured.clinical }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function ensurePatientRecordAction(
  patient: PatientRecord
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    if (!isEnrolledVirtualId(patient.id)) {
      return { ok: true, data: patient }
    }
    const studentId =
      studentIdFromVirtualId(patient.id) ?? patient.studentId?.trim() ?? ""
    const ensured = await ensurePatientFromStudentId(studentId)
    if (!ensured) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }
    return { ok: true, data: ensured.clinical }
  } catch (error) {
    return toErrorResult(error)
  }
}

/** Upsert operational `patients` row from enrollment for certificate / walk-in FKs. */
export async function ensureCertificatePatientByStudentIdAction(
  studentId: string
): Promise<PatientRecordActionResult<MedicalCertificatePatient>> {
  try {
    const id = studentId.trim()
    if (!id) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }
    const ensured = await ensurePatientFromStudentId(id)
    if (!ensured) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }
    return {
      ok: true,
      data: {
        id: ensured.operational.id,
        fullName: ensured.operational.fullName,
        studentId: ensured.operational.studentId,
        email: ensured.operational.email,
      },
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

/** Imported roster for certificate patient picker. */
export async function listEnrolledCertificatePatientsAction(): Promise<
  PatientRecordActionResult<MedicalCertificatePatient[]>
> {
  try {
    const listed = await listDirectoryPatientRecords({
      page: 1,
      pageSize: 50,
      patientType: "all",
    })
    return {
      ok: true,
      data: listed.items.map((patient) => ({
        id: patient.id,
        fullName: patientFullName(patient),
        studentId: patient.studentId ?? patient.employeeId,
        email: patient.email,
      })),
    }
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
    const data = await getDirectoryPatientRecordStats()
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

export async function updatePatientMedicalRecordAction(
  input: UpdatePatientMedicalRecordInput
): Promise<PatientRecordActionResult<PatientRecord>> {
  try {
    const data = await updatePatientMedicalRecord(input)
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
    const data = await listEnrolledPatientOptions(query)
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

export async function fetchPatientDocumentsAction(
  patient: Pick<PatientRecord, "studentId" | "employeeId">
): Promise<PatientRecordActionResult<MedicalCertificate[]>> {
  try {
    const data = await getMedicalCertificatesForPatientRecord({
      studentId: patient.studentId,
      employeeId: patient.employeeId,
    })
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
    const parts: string[] = []
    if (result.created > 0) {
      parts.push(
        `${result.created} created`
      )
    }
    if (result.updated > 0) {
      parts.push(`${result.updated} updated`)
    }
    return {
      ok: true,
      message:
        parts.length > 0
          ? `Import complete: ${parts.join(", ")}.`
          : "Import finished.",
      warning:
        result.failures.length > 0
          ? `${result.failures.length} row(s) failed. ${result.failures.slice(0, 3).join(" · ")}`
          : undefined,
    }
  } catch (error) {
    const failed = toErrorResult(error)
    if (!failed.ok) {
      return { ok: false, error: failed.error, code: failed.code }
    }
    return { ok: false, error: "Import failed.", code: "unknown" }
  }
}
