import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import { normalizeStudentId } from "@/lib/students/enrolled-dataset"
import {
  campusIdLookupVariants,
  studentIdDigits,
} from "@/lib/students/student-id-input"
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

function sanitizeDirectorySearchTerm(term: string): string {
  return term.replace(/[%,()]/g, " ").trim()
}

/** Prefer campus-ID matching when the query is mostly digits / ID-shaped. */
function isCampusIdSearchQuery(query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return false
  const digits = studentIdDigits(trimmed)
  if (digits.length < 2) return false
  const compact = trimmed.replace(/[\s-]/g, "")
  if (!compact) return false
  return digits.length / compact.length >= 0.7
}

/**
 * Shared text / type filters for directory list + matching-id queries.
 * Intentionally untyped against PostgrestFilterBuilder — Supabase generics
 * recurse past TS limits when passed through a generic helper.
 */
function applyDirectoryFilters(
  // Postgrest filter builders are structurally compatible here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directoryQuery: any,
  params: Pick<PatientRecordListParams, "query" | "patientType">
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let next = directoryQuery
  const patientTypeFilter = params.patientType ?? "all"
  const query = (params.query ?? "").trim()

  if (patientTypeFilter !== "all") {
    next = next.eq("patient_type", patientTypeFilter)
  }

  if (!query) return next

  if (isCampusIdSearchQuery(query)) {
    const filters = directoryIdSearchTerms(query).flatMap((term) => [
      `student_id.ilike.%${term}%`,
      `employee_id.ilike.%${term}%`,
    ])
    if (filters.length > 0) {
      next = next.or(filters.join(","))
    }
    return next
  }

  const tokens = query
    .split(/\s+/)
    .map(sanitizeDirectorySearchTerm)
    .filter((token) => token.length >= 1)
  for (const token of tokens.length > 0
    ? tokens
    : [sanitizeDirectorySearchTerm(query)]) {
    if (!token) continue
    next = next.or(
      [
        `first_name.ilike.%${token}%`,
        `middle_name.ilike.%${token}%`,
        `last_name.ilike.%${token}%`,
        `student_id.ilike.%${token}%`,
        `employee_id.ilike.%${token}%`,
        `course.ilike.%${token}%`,
      ].join(",")
    )
  }
  return next
}

function directoryIdSearchTerms(query: string): string[] {
  const trimmed = query.trim()
  const digits = studentIdDigits(trimmed)
  const terms = new Set<string>()
  for (const term of [
    trimmed,
    normalizeStudentId(trimmed),
    ...campusIdLookupVariants(trimmed),
    digits,
  ]) {
    const safe = sanitizeDirectorySearchTerm(term)
    if (safe) terms.add(safe)
  }
  if (digits.length > 4) {
    terms.add(`${digits.slice(0, 4)}-${digits.slice(4)}`)
  }
  // Allow searching by suffix (common when staff paste/type only the sequence)
  if (digits.length >= 5) {
    terms.add(digits.slice(-6))
    terms.add(digits.slice(-5))
  }
  return [...terms]
}

function matchesQuery(patient: PatientRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const qDigits = studentIdDigits(query)
  const fullName = patientFullName(patient).toLowerCase()
  const sid = studentIdDigits(patient.studentId ?? "")
  const eid = studentIdDigits(patient.employeeId ?? "")

  if (isCampusIdSearchQuery(query) && qDigits.length >= 2) {
    if (sid.includes(qDigits) || eid.includes(qDigits)) return true
    for (const variant of campusIdLookupVariants(query)) {
      const vd = studentIdDigits(variant)
      if (vd && (sid === vd || eid === vd || sid.includes(vd) || eid.includes(vd))) {
        return true
      }
    }
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const fields = [
    patient.firstName,
    patient.middleName ?? "",
    patient.lastName,
    fullName,
    patient.studentId ?? "",
    patient.employeeId ?? "",
    patient.course ?? "",
    patient.patientType,
  ].map((value) => value.toLowerCase())

  // Every token must match at least one field (supports "Juan Cruz", "BSIT 2026")
  return tokens.every((token) => {
    if (fields.some((field) => field.includes(token))) return true
    const tokenDigits = studentIdDigits(token)
    if (tokenDigits.length >= 2) {
      return sid.includes(tokenDigits) || eid.includes(tokenDigits)
    }
    return false
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
  const sortColumn =
    sortBy === "type"
      ? "patient_type"
      : sortBy === "program"
        ? "course"
        : sortBy === "lastVisit"
          ? "last_visit"
          : "last_name"

  const directoryQuery = applyDirectoryFilters(
    supabase
      .from("patient_records")
      .select(`${PATIENT_RECORD_SELECT_COLUMNS}, consultations(count)`, {
        count: "exact",
      })
      .is("archived_at", null),
    { query, patientType: patientTypeFilter }
  )

  const { data, error, count } = await directoryQuery
    .order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false })
    .order("first_name", { ascending: sortDir === "asc" })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not load patient records."
    )
  }

  const items = await attachEditorNames(
    ((data ?? []) as PatientRow[]).map(mapClinical),
    supabase
  )
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(page, totalPages)

  if (safePage !== page) {
    return listDirectoryPatientRecords(
      { ...params, page: safePage, pageSize },
      supabase
    )
  }

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

/**
 * Full filtered directory (no pagination) — used for Excel export.
 */
export async function listAllDirectoryPatientRecords(
  params: Omit<PatientRecordListParams, "page" | "pageSize"> = {},
  client?: SupabaseClient
): Promise<PatientRecord[]> {
  const supabase = client ?? (await createClient())
  const query = (params.query ?? "").trim()
  const patientTypeFilter = params.patientType ?? "all"
  const sortBy = params.sortBy ?? "patient"
  const sortDir = params.sortDir ?? "asc"

  const { data, error } = await supabase
    .from("patient_records")
    .select(`${PATIENT_RECORD_SELECT_COLUMNS}, consultations(count)`)
    .is("archived_at", null)
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
    const qDigits = studentIdDigits(query)
    items = items.filter(
      (item) =>
        matchesQuery(item, query) ||
        (normalizedId &&
          (item.studentId?.includes(normalizedId) ||
            item.employeeId?.includes(normalizedId))) ||
        (qDigits.length >= 2 &&
          (studentIdDigits(item.studentId ?? "").includes(qDigits) ||
            studentIdDigits(item.employeeId ?? "").includes(qDigits)))
    )
  }

  return [...items].sort((a, b) => comparePatients(a, b, sortBy, sortDir))
}

/**
 * Archived patient records for Bin (soft-deleted from the active directory).
 */
export async function listArchivedDirectoryPatientRecords(
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
  const sortColumn =
    sortBy === "type"
      ? "patient_type"
      : sortBy === "program"
        ? "course"
        : sortBy === "lastVisit"
          ? "last_visit"
          : "last_name"

  const directoryQuery = applyDirectoryFilters(
    supabase
      .from("patient_records")
      .select(`${PATIENT_RECORD_SELECT_COLUMNS}, consultations(count)`, {
        count: "exact",
      })
      .not("archived_at", "is", null),
    { query, patientType: patientTypeFilter }
  )

  const { data, error, count } = await directoryQuery
    .order("archived_at", { ascending: false, nullsFirst: false })
    .order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false })
    .order("first_name", { ascending: sortDir === "asc" })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    throw new PatientRecordServiceError(
      "database",
      error.message || "Could not load archived patient records."
    )
  }

  const items = await attachEditorNames(
    ((data ?? []) as PatientRow[]).map(mapClinical),
    supabase
  )
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(page, totalPages)

  if (safePage !== page) {
    return listArchivedDirectoryPatientRecords(
      { ...params, page: safePage, pageSize },
      supabase
    )
  }

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

/**
 * IDs for every patient matching the current directory filters (active or bin).
 * Used for “Select all matching” archive / permanent-delete.
 */
export async function listMatchingPatientRecordIds(
  params: Omit<PatientRecordListParams, "page" | "pageSize"> & {
    archived?: boolean
  } = {},
  client?: SupabaseClient
): Promise<string[]> {
  const supabase = client ?? (await createClient())
  const archived = Boolean(params.archived)
  const ids: string[] = []
  const pageSize = 1000
  let from = 0

  for (;;) {
    // Keep this builder loosely typed — same Postgrest depth issue as above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pageQuery: any = supabase.from("patient_records").select("id")
    pageQuery = archived
      ? pageQuery.not("archived_at", "is", null)
      : pageQuery.is("archived_at", null)
    pageQuery = applyDirectoryFilters(pageQuery, {
      query: params.query,
      patientType: params.patientType,
    })

    const { data, error } = await pageQuery
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new PatientRecordServiceError(
        "database",
        error.message || "Could not load matching patient ids."
      )
    }

    const batch = ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
    ids.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return ids
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
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
      supabase
        .from("patient_records")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .gte("last_visit", start)
        .lt("last_visit", end),
      supabase
        .from("patient_records")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
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
