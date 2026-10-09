"use server"

import {
  filterCertificatesByScope,
  type ClinicalRecordScope,
} from "@/lib/clinical/record-scope"
import { getStaffAccess } from "@/lib/auth/access"
import { can, canViewModule } from "@/lib/auth/permissions"
import { loadDentalVisitChart } from "@/features/dentist/data/visit-chart"
import type { DentalPatientChart } from "@/features/dentist/types/dental-chart"
import {
  getDirectoryPatientRecordStats,
  listAllDirectoryPatientRecords,
  listArchivedDirectoryPatientRecords,
  listDirectoryPatientRecords,
  listEnrolledPatientOptions,
  listMatchingPatientRecordIds,
} from "@/lib/students/directory"
import {
  ensurePatientFromStudentId,
} from "@/lib/students/ensure-patient"
import {
  campusIdLookupVariants,
  studentIdDigits,
} from "@/lib/students/student-id-input"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import {
  isEnrolledVirtualId,
  studentIdFromVirtualId,
} from "@/lib/students/virtual-id"
import {
  archivePatientRecords,
  createPatientRecord,
  deletePatientRecord,
  deletePatientRecords,
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
import { loadPatientRecordsExportAssociations } from "@/features/patients/data/load-patient-records-export"
import { executeClinicalRestore } from "@/features/patients/data/restore-patient-records"
import {
  buildPatientRecordsExportWorkbook,
  type PatientRecordsExportWorkbook,
} from "@/features/patients/lib/export-patient-records"
import {
  isClinicalExportPackage,
  parseClinicalRestorePackage,
  planClinicalRestore,
} from "@/features/patients/lib/restore-patient-records"
import { parseExcelSheets } from "@/features/admin/lib/excel"
import {
  getConsultationVisitDetail,
  getConsultationsByPatientId,
} from "@/services/consultations"
import { getMedicalCertificatesForPatientRecord } from "@/services/medicalCertificates"
import type { QueueVitals } from "@/lib/health/types"
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

async function requirePatientAccess(
  permission:
    | "patients.search"
    | "patients.edit_information"
    | "patients.update_medical"
) {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    return {
      ok: false as const,
      error: "Sign in with an approved clinic account.",
      code: "permission",
    }
  }
  if (!can(access.designation, permission)) {
    return {
      ok: false as const,
      error: "You do not have permission for this patient action.",
      code: "permission",
    }
  }
  return { ok: true as const, access }
}

export async function fetchPatientRecordsAction(
  params: PatientRecordListParams = {}
): Promise<PatientRecordActionResult<PatientRecordListResult>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const id = studentId.trim()
    if (!id) {
      return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
    }

    const variants = campusIdLookupVariants(id)
    const qDigits = studentIdDigits(id)

    // Exact column match first — avoids false misses from paginated directory search.
    const { createClient } = await import("@/lib/supabase/server")
    const { PATIENT_RECORD_SELECT_COLUMNS } = await import(
      "@/lib/students/patient-record-select"
    )
    const { patientRecordFromJson } = await import("@/types/patientRecord")
    const supabase = await createClient()

    const orParts = new Set<string>()
    for (const variant of variants) {
      const v = variant.trim()
      if (!v) continue
      orParts.add(`student_id.eq.${v}`)
      orParts.add(`employee_id.eq.${v}`)
    }
    if (qDigits.length >= 1 && qDigits.length <= 12) {
      const dashed =
        qDigits.length > 4
          ? `${qDigits.slice(0, 4)}-${qDigits.slice(4)}`
          : qDigits
      orParts.add(`student_id.eq.${dashed}`)
      orParts.add(`employee_id.eq.${dashed}`)
      orParts.add(`student_id.eq.${qDigits}`)
      orParts.add(`employee_id.eq.${qDigits}`)
    }

    if (orParts.size > 0) {
      const { data: exactRows } = await supabase
        .from("patient_records")
        .select(PATIENT_RECORD_SELECT_COLUMNS)
        .is("archived_at", null)
        .or([...orParts].join(","))
        .limit(10)

      const exactHit = (exactRows ?? []).find((row) => {
        const sidDigits = studentIdDigits(
          (row as { student_id?: string | null }).student_id ?? ""
        )
        const eidDigits = studentIdDigits(
          (row as { employee_id?: string | null }).employee_id ?? ""
        )
        if (qDigits.length >= 1 && (sidDigits === qDigits || eidDigits === qDigits)) {
          return true
        }
        return variants.some((variant) => {
          const vd = studentIdDigits(variant)
          return vd.length >= 1 && (sidDigits === vd || eidDigits === vd)
        })
      })

      if (exactHit) {
        return {
          ok: true,
          data: patientRecordFromJson(exactHit as never),
        }
      }
    }

    // Directory fallback for fuzzy/partial matches already in the first page.
    const listed = await listDirectoryPatientRecords({
      query: id,
      page: 1,
      pageSize: 20,
      patientType: "all",
    })
    const listedExact =
      listed.items.find((p) => {
        const sidDigits = studentIdDigits(p.studentId ?? "")
        const eidDigits = studentIdDigits(p.employeeId ?? "")
        if (qDigits.length >= 1 && (sidDigits === qDigits || eidDigits === qDigits)) {
          return true
        }
        return variants.some((variant) => {
          const vd = studentIdDigits(variant)
          return vd.length >= 1 && (sidDigits === vd || eidDigits === vd)
        })
      }) ?? null
    if (listedExact) return { ok: true, data: listedExact }

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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const studentId =
      studentIdFromVirtualId(patient.id) ?? patient.studentId?.trim() ?? ""
    if (studentId) {
      const ensured = await ensurePatientFromStudentId(studentId)
      if (ensured) {
        return { ok: true, data: ensured.clinical }
      }
      if (isEnrolledVirtualId(patient.id)) {
        return { ok: false, error: NO_STUDENT_FOUND, code: "not_found" }
      }
    }
    return { ok: true, data: patient }
  } catch (error) {
    return toErrorResult(error)
  }
}

/** Upsert operational `patients` row from enrollment for certificate / walk-in FKs. */
export async function ensureCertificatePatientByStudentIdAction(
  studentId: string
): Promise<PatientRecordActionResult<MedicalCertificatePatient>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.edit_information")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.edit_information")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.update_medical")
  if (!auth.ok) return auth
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
  const auth = await requirePatientAccess("patients.edit_information")
  if (!auth.ok) return auth
  try {
    await deletePatientRecord(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function archivePatientRecordsAction(
  ids: string[]
): Promise<PatientRecordActionResult<{ archived: number }>> {
  const auth = await requirePatientAccess("patients.edit_information")
  if (!auth.ok) return auth
  try {
    const data = await archivePatientRecords(ids)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listMatchingPatientRecordIdsAction(
  params: Omit<PatientRecordListParams, "page" | "pageSize"> & {
    archived?: boolean
  } = {}
): Promise<PatientRecordActionResult<string[]>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await listMatchingPatientRecordIds(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listArchivedPatientRecordsAction(
  params: PatientRecordListParams = {}
): Promise<PatientRecordActionResult<PatientRecordListResult>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await listArchivedDirectoryPatientRecords(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteArchivedPatientRecordsAction(
  ids: string[]
): Promise<PatientRecordActionResult<{ deleted: number }>> {
  const auth = await requirePatientAccess("patients.edit_information")
  if (!auth.ok) return auth
  try {
    const data = await deletePatientRecords(ids)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listPatientOptionsAction(
  query = ""
): Promise<PatientRecordActionResult<PatientRecord[]>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await listEnrolledPatientOptions(query)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientConsultationHistoryAction(
  patientId: string,
  stationFilter: "dentist" | "physician" | "nurse" | "all" = "all"
): Promise<PatientRecordActionResult<Consultation[]>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await getConsultationsByPatientId(patientId, { stationFilter })
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationVisitDetailAction(
  consultationId: string
): Promise<
  PatientRecordActionResult<{
    consultation: Consultation
    ticketVitals: QueueVitals | null
  }>
> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await getConsultationVisitDetail(consultationId)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchDentalChartPreviewAction(
  appointmentId: string
): Promise<
  PatientRecordActionResult<{
    chart: DentalPatientChart
    patientName: string
    campusId: string | null
  }>
> {
  try {
    const access = await getStaffAccess()
    if (!access || !canViewModule(access.designation, "patient_records")) {
      return {
        ok: false,
        error: "You do not have permission to view dental charts.",
        code: "permission",
      }
    }
    const data = await loadDentalVisitChart({
      appointmentId,
      campusId: null,
    })
    return {
      ok: true,
      data: {
        chart: data.chart,
        patientName: data.patientName,
        campusId: data.campusId,
      },
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchPatientDocumentsAction(
  patient: Pick<PatientRecord, "studentId" | "employeeId">,
  scope: ClinicalRecordScope = "all"
): Promise<PatientRecordActionResult<MedicalCertificate[]>> {
  const auth = await requirePatientAccess("patients.search")
  if (!auth.ok) return auth
  try {
    const data = await getMedicalCertificatesForPatientRecord({
      studentId: patient.studentId,
      employeeId: patient.employeeId,
    })
    return { ok: true, data: filterCertificatesByScope(data, scope) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function exportPatientRecordsAction(params: {
  query?: string
  patientType?: PatientRecordListParams["patientType"]
  sortBy?: PatientRecordListParams["sortBy"]
  sortDir?: PatientRecordListParams["sortDir"]
}): Promise<PatientRecordActionResult<PatientRecordsExportWorkbook>> {
  try {
    const access = await getStaffAccess()
    if (!access || !canViewModule(access.designation, "patient_records")) {
      return {
        ok: false,
        error: "You do not have access to export patient records.",
        code: "permission",
      }
    }
    // Role scope is derived server-side only — never accept client override.
    if (
      access.designation !== "nurse" &&
      access.designation !== "physician" &&
      access.designation !== "dentist"
    ) {
      return {
        ok: false,
        error: "You do not have access to export patient records.",
        code: "permission",
      }
    }

    const patients = await listAllDirectoryPatientRecords({
      query: params.query,
      patientType: params.patientType ?? "all",
      sortBy: params.sortBy ?? "patient",
      sortDir: params.sortDir ?? "asc",
    })

    const { consultations, documents } =
      await loadPatientRecordsExportAssociations(patients)

    const workbook = buildPatientRecordsExportWorkbook({
      designation: access.designation,
      patients,
      consultations,
      documents,
      patientTypeFilter: params.patientType ?? "all",
    })

    return {
      ok: true,
      data: workbook,
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function importPatientRecordsFromExcelAction(
  formData: FormData
): Promise<PatientRecordImportActionResult> {
  try {
    const access = await getStaffAccess()
    if (!access?.hasClinicMembership) {
      return {
        ok: false,
        error: "Sign in with an approved clinic account.",
        code: "permission",
      }
    }

    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return {
        ok: false,
        error: "Choose an Excel file to import.",
        code: "validation",
      }
    }

    const buffer = await file.arrayBuffer()
    const sheets = await parseExcelSheets(buffer)

    // CampusCare clinical export (multi-sheet) → import personal + clinical data.
    if (isClinicalExportPackage(sheets)) {
      if (!canViewModule(access.designation, "patient_records")) {
        return {
          ok: false,
          error: "You do not have access to import patient records.",
          code: "permission",
        }
      }
      if (
        access.designation !== "nurse" &&
        access.designation !== "physician" &&
        access.designation !== "dentist"
      ) {
        return {
          ok: false,
          error: "You do not have access to import clinical patient records.",
          code: "permission",
        }
      }

      const parsed = parseClinicalRestorePackage(sheets)
      const plan = planClinicalRestore({
        designation: access.designation,
        package: parsed,
      })
      if (plan.blockingErrors.length > 0) {
        return {
          ok: false,
          error: plan.blockingErrors.slice(0, 3).join(" · "),
          code: "validation",
        }
      }

      const result = await executeClinicalRestore({
        plan,
        issuedByUserId: access.userId,
      })

      const parts: string[] = []
      if (result.patientsCreated > 0) {
        parts.push(`${result.patientsCreated} patients created`)
      }
      if (result.patientsUpdated > 0) {
        parts.push(`${result.patientsUpdated} patients updated`)
      }
      if (result.profilesUpdated > 0) {
        parts.push(`${result.profilesUpdated} medical profiles`)
      }
      if (result.consultationsCreated > 0) {
        parts.push(`${result.consultationsCreated} consultations`)
      }
      if (result.vitalsUpdated > 0) {
        parts.push(`${result.vitalsUpdated} vitals`)
      }
      if (result.documentsCreated > 0) {
        parts.push(`${result.documentsCreated} documents`)
      }

      const warningParts: string[] = []
      if (result.counts.ignoredSheets.length > 0) {
        warningParts.push(
          `Outside your role scope (skipped): ${result.counts.ignoredSheets.join(", ")}.`
        )
      }
      if (result.failures.length > 0) {
        warningParts.push(
          `${result.failures.length} row(s) failed. ${result.failures.slice(0, 3).join(" · ")}`
        )
      }

      return {
        ok: true,
        message:
          parts.length > 0
            ? `Import complete: ${parts.join(", ")}.`
            : "Import finished.",
        warning: warningParts.length > 0 ? warningParts.join(" ") : undefined,
      }
    }

    // Roster / campus template → demographics upsert only.
    if (!can(access.designation, "patients.edit_information")) {
      return {
        ok: false,
        error: "You do not have permission for this patient action.",
        code: "permission",
      }
    }

    const result = await importPatientRecordsFromExcel(formData)
    const parts: string[] = []
    if (result.created > 0) {
      parts.push(`${result.created} created`)
    }
    if (result.updated > 0) {
      parts.push(`${result.updated} updated`)
    }
    const typeSummary = [
      result.typeCounts.faculty > 0
        ? `${result.typeCounts.faculty} faculty`
        : null,
      result.typeCounts.employee > 0
        ? `${result.typeCounts.employee} employee`
        : null,
      result.typeCounts.student > 0
        ? `${result.typeCounts.student} student`
        : null,
      result.typeCounts.visitor > 0
        ? `${result.typeCounts.visitor} visitor`
        : null,
    ]
      .filter(Boolean)
      .join(", ")

    return {
      ok: true,
      message:
        parts.length > 0
          ? `Import complete: ${parts.join(", ")}${typeSummary ? ` (${typeSummary})` : ""}.`
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
