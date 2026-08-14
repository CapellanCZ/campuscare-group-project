import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import { normalizeStudentId } from "@/lib/students/enrolled-dataset"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import { createClient } from "@/lib/supabase/server"
import {
  PatientRecordServiceError,
  patientFullName,
  patientRecordFromJson,
  type PatientRecord,
  type PatientRecordJson,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
} from "@/types/patientRecord"

const DEFAULT_PAGE_SIZE = 20

type CountJoin = { count: number | null } | { count: number | null }[] | null

type PatientRow = PatientRecordJson & {
  consultations?: CountJoin
}

function consultationCount(value: CountJoin): number {
  if (!value) return 0
  if (Array.isArray(value)) return value[0]?.count ?? 0
  return value.count ?? 0
}

function mapClinical(row: PatientRow): PatientRecord {
  return patientRecordFromJson({
    ...row,
    consultations_count: consultationCount(row.consultations ?? null),
    documents_count: 0,
  })
}

function matchesQuery(patient: PatientRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    patient.firstName,
    patient.middleName ?? "",
    patient.lastName,
    patient.studentId ?? "",
    patient.employeeId ?? "",
    patient.course ?? "",
    patient.patientType,
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

function comparePatients(
  a: PatientRecord,
  b: PatientRecord,
  sortBy: PatientRecordListParams["sortBy"],
  sortDir: "asc" | "desc"
) {
  const direction = sortDir === "desc" ? -1 : 1
  const left = (value: string | null | undefined) => (value ?? "").toLowerCase()

  let result = 0
  if (sortBy === "type") {
    result = left(a.patientType).localeCompare(left(b.patientType))
  } else if (sortBy === "program") {
    result = left(a.course).localeCompare(left(b.course))
  } else if (sortBy === "lastVisit") {
    result = left(a.lastVisit).localeCompare(left(b.lastVisit))
  } else {
    result = left(patientFullName(a)).localeCompare(left(patientFullName(b)))
  }

  if (result !== 0) return result * direction
  return left(patientFullName(a)).localeCompare(left(patientFullName(b))) * direction
}

function manilaMonthBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const start = `${year}-${month}-01`
  const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1
  const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year)
  const endMonth = String(nextMonth).padStart(2, "0")
  const end = `${nextYear}-${endMonth}-01`
  return { start, end }
}

async function attachEditorNames(
  records: PatientRecord[],
  client: SupabaseClient
): Promise<PatientRecord[]> {
  const ids = [
    ...new Set(
      records
        .map((record) => record.lastEditedBy)
        .filter((id): id is string => Boolean(id?.trim()))
    ),
  ]
  if (ids.length === 0) return records

  const { data } = await client.from("users").select("id, full_name").in("id", ids)
  const names = new Map(
    (data ?? []).map((row) => [row.id as string, (row.full_name as string) || null])
  )

  return records.map((record) => ({
    ...record,
    lastEditedByName: record.lastEditedBy
      ? names.get(record.lastEditedBy) ?? record.lastEditedByName
      : null,
  }))
}

/**
 * Patient directory from `patient_records` (imported roster).
 * Optional query matches campus ID / name / course.
 */
export async function listDirectoryPatientRecords(
  params: PatientRecordListParams = {},
  client?: SupabaseClient
): Promise<PatientRecordListResult> {
  const supabase = client ?? (await createClient())
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = (params.query ?? "").trim()
  const patientTypeFilter = params.patientType ?? "all"
  const sortBy = params.sortBy ?? "patient"
  const sortDir = params.sortDir ?? "asc"

  const { data, error } = await supabase
    .from("patient_records")
    .select(`${PATIENT_RECORD_SELECT_COLUMNS}, consultations(count)`)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not load patient records."
    )
  }

  let items = ((data ?? []) as PatientRow[]).map(mapClinical)
  items = await attachEditorNames(items, supabase)

  if (patientTypeFilter !== "all") {
    items = items.filter((item) => item.patientType === patientTypeFilter)
  }
  if (query) {
    const normalizedId = normalizeStudentId(query)
    items = items.filter(
      (item) =>
        matchesQuery(item, query) ||
        (normalizedId &&
          (item.studentId?.includes(normalizedId) ||
            item.employeeId?.includes(normalizedId)))
    )
  }

  items = [...items].sort((a, b) => comparePatients(a, b, sortBy, sortDir))

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function getDirectoryPatientRecordStats(
  client?: SupabaseClient
): Promise<PatientRecordStats> {
  const supabase = client ?? (await createClient())
  const { start, end } = manilaMonthBounds()

  const [allResult, visitedResult, allergiesResult, documentsResult] =
    await Promise.all([
      supabase
        .from("patient_records")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("patient_records")
        .select("id", { count: "exact", head: true })
        .gte("last_visit", start)
        .lt("last_visit", end),
      supabase
        .from("patient_records")
        .select("id", { count: "exact", head: true })
        .not("allergies", "is", null)
        .neq("allergies", ""),
      supabase
        .from("medical_certificates")
        .select("id", { count: "exact", head: true }),
    ])

  if (allResult.error) {
    throw new PatientRecordServiceError(
      "database",
      allResult.error.message || "Could not load patient stats."
    )
  }
  if (visitedResult.error) {
    throw new PatientRecordServiceError(
      "database",
      visitedResult.error.message || "Could not load visit stats."
    )
  }
  if (allergiesResult.error) {
    throw new PatientRecordServiceError(
      "database",
      allergiesResult.error.message || "Could not load allergy stats."
    )
  }
  if (documentsResult.error) {
    throw new PatientRecordServiceError(
      "database",
      documentsResult.error.message || "Could not load document stats."
    )
  }

  return {
    patientsOnFile: allResult.count ?? 0,
    visitedThisMonth: visitedResult.count ?? 0,
    flaggedAllergies: allergiesResult.count ?? 0,
    documents: documentsResult.count ?? 0,
  }
}

/** Options for pickers — from imported patient_records only. */
export async function listEnrolledPatientOptions(
  query = "",
  client?: SupabaseClient
): Promise<PatientRecord[]> {
  const result = await listDirectoryPatientRecords(
    {
      page: 1,
      pageSize: 50,
      query,
      patientType: "all",
    },
    client
  )
  if (query.trim() && result.items.length === 0) {
    throw new PatientRecordServiceError("not_found", NO_STUDENT_FOUND)
  }
  return result.items
}
