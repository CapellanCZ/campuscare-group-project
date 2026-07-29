import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  listEnrolledStudents,
  lookupEnrolledStudentById,
  normalizeStudentId,
} from "@/lib/students/enrolled-dataset"
import { enrolledToPatientRecord } from "@/lib/students/map-enrolled-student"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
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

async function loadClinicalByStudentId(
  client: SupabaseClient
): Promise<Map<string, PatientRecord>> {
  const { data, error } = await client
    .from("patient_records")
    .select(`${PATIENT_RECORD_SELECT_COLUMNS}, consultations(count)`)
    .eq("patient_type", "student")

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not load clinical patient records."
    )
  }

  const mapped = ((data ?? []) as PatientRow[]).map(mapClinical)
  const withNames = await attachEditorNames(mapped, client)
  const map = new Map<string, PatientRecord>()
  for (const clinical of withNames) {
    const studentId = clinical.studentId?.trim()
    if (studentId) map.set(studentId, clinical)
  }
  return map
}

/**
 * Patient directory: enrolled CSV students only (faculty / non-teaching out of scope).
 * Optional query = Student ID partial match (includes) while typing.
 */
export async function listDirectoryPatientRecords(
  params: PatientRecordListParams = {},
  client?: SupabaseClient
): Promise<PatientRecordListResult> {
  const supabase = client ?? (await createClient())
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = normalizeStudentId(params.query ?? "")
  const sortBy = params.sortBy ?? "patient"
  const sortDir = params.sortDir ?? "asc"

  const [enrolledAll, clinicalMap] = await Promise.all([
    listEnrolledStudents(),
    loadClinicalByStudentId(supabase),
  ])

  const enrolled = query
    ? enrolledAll.filter((student) => student.studentId.includes(query))
    : enrolledAll

  if (query && enrolled.length === 0) {
    throw new PatientRecordServiceError("not_found", NO_STUDENT_FOUND)
  }

  let items = enrolled.map((student) =>
    enrolledToPatientRecord(student, clinicalMap.get(student.studentId) ?? null)
  )
  items = [...items].sort((a, b) => comparePatients(a, b, sortBy, sortDir))

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
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

  const [enrolled, visitedResult, allergiesResult] = await Promise.all([
    listEnrolledStudents(),
    supabase
      .from("patient_records")
      .select("id", { count: "exact", head: true })
      .eq("patient_type", "student")
      .gte("last_visit", start)
      .lt("last_visit", end),
    supabase
      .from("patient_records")
      .select("id", { count: "exact", head: true })
      .eq("patient_type", "student")
      .not("allergies", "is", null)
      .neq("allergies", ""),
  ])

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

  return {
    patientsOnFile: enrolled.length,
    visitedThisMonth: visitedResult.count ?? 0,
    flaggedAllergies: allergiesResult.count ?? 0,
    documents: 0,
  }
}

export async function listEnrolledPatientOptions(
  query = "",
  client?: SupabaseClient
): Promise<PatientRecord[]> {
  const id = normalizeStudentId(query)
  if (!id) {
    const result = await listDirectoryPatientRecords(
      { page: 1, pageSize: 50, patientType: "student" },
      client
    )
    return result.items
  }

  const enrolled = await lookupEnrolledStudentById(id)
  if (!enrolled) {
    throw new PatientRecordServiceError("not_found", NO_STUDENT_FOUND)
  }

  const supabase = client ?? (await createClient())
  const clinicalMap = await loadClinicalByStudentId(supabase)
  return [
    enrolledToPatientRecord(
      enrolled,
      clinicalMap.get(enrolled.studentId) ?? null
    ),
  ]
}
