import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  PatientRecordServiceError,
  patientRecordFromJson,
  patientRecordToJson,
  type CreatePatientRecordInput,
  type PatientRecord,
  type PatientRecordJson,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"

const DEFAULT_PAGE_SIZE = 20

const SELECT_COLUMNS = `
  id,
  student_id,
  first_name,
  middle_name,
  last_name,
  course,
  year_level,
  gender,
  birth_date,
  blood_type,
  allergies,
  phone,
  email,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  medical_conditions,
  notes,
  last_visit,
  created_at,
  updated_at
`

type CountJoin = { count: number | null } | { count: number | null }[] | null

type PatientRow = PatientRecordJson & {
  consultations?: CountJoin
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new PatientRecordServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new PatientRecordServiceError(
      "permission",
      "You do not have permission to access patient records."
    )
  }
  if (
    error.code === "23505" ||
    message.includes("patient_records_student_id_key") ||
    message.includes("duplicate key")
  ) {
    throw new PatientRecordServiceError(
      "duplicate",
      "A patient with this Student ID already exists."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new PatientRecordServiceError(
      "not_found",
      "Patient record not found."
    )
  }
  throw new PatientRecordServiceError(
    "database",
    error.message || "A database error occurred while loading patient records."
  )
}

function consultationCount(value: CountJoin): number {
  if (!value) return 0
  if (Array.isArray(value)) return value[0]?.count ?? 0
  return value.count ?? 0
}

function mapPatient(row: PatientRow): PatientRecord {
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
    patient.studentId,
    patient.course,
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
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

function validateRequired(input: CreatePatientRecordInput) {
  if (!input.studentId.trim()) {
    throw new PatientRecordServiceError("validation", "Student ID is required.")
  }
  if (!input.firstName.trim()) {
    throw new PatientRecordServiceError("validation", "First name is required.")
  }
  if (!input.lastName.trim()) {
    throw new PatientRecordServiceError("validation", "Last name is required.")
  }
  if (!input.course.trim()) {
    throw new PatientRecordServiceError("validation", "Course is required.")
  }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

export async function getPatientRecords(
  params: PatientRecordListParams = {},
  client?: SupabaseClient
): Promise<PatientRecordListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim() ?? ""

  const { data, error } = await supabase
    .from("patient_records")
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })

  if (error) mapError(error)

  let items = ((data ?? []) as PatientRow[]).map(mapPatient)
  if (query) {
    items = items.filter((item) => matchesQuery(item, query))
  }

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

export async function searchPatientRecords(
  query: string,
  params: Omit<PatientRecordListParams, "query"> = {},
  client?: SupabaseClient
): Promise<PatientRecordListResult> {
  return getPatientRecords({ ...params, query }, client)
}

export async function getPatientRecordById(
  id: string,
  client?: SupabaseClient
): Promise<PatientRecord> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("patient_records")
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }

  return mapPatient(data as PatientRow)
}

export async function getPatientRecordStats(
  client?: SupabaseClient
): Promise<PatientRecordStats> {
  const supabase = await getClient(client)
  const { start, end } = manilaMonthBounds()

  const [allResult, visitedResult, allergiesResult] = await Promise.all([
    supabase.from("patient_records").select("id", { count: "exact", head: true }),
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
  ])

  if (allResult.error) mapError(allResult.error)
  if (visitedResult.error) mapError(visitedResult.error)
  if (allergiesResult.error) mapError(allergiesResult.error)

  return {
    patientsOnFile: allResult.count ?? 0,
    visitedThisMonth: visitedResult.count ?? 0,
    flaggedAllergies: allergiesResult.count ?? 0,
    documents: 0,
  }
}

export async function createPatientRecord(
  input: CreatePatientRecordInput,
  client?: SupabaseClient
): Promise<PatientRecord> {
  validateRequired(input)
  const supabase = await getClient(client)
  const payload = patientRecordToJson(input)

  const { data, error } = await supabase
    .from("patient_records")
    .insert(payload)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .single()

  if (error) mapError(error)
  return mapPatient(data as PatientRow)
}

export async function updatePatientRecord(
  input: UpdatePatientRecordInput,
  client?: SupabaseClient
): Promise<PatientRecord> {
  if (!input.id.trim()) {
    throw new PatientRecordServiceError("validation", "Patient ID is required.")
  }
  validateRequired(input)

  const supabase = await getClient(client)
  const payload = patientRecordToJson(input)

  const { data, error } = await supabase
    .from("patient_records")
    .update(payload)
    .eq("id", input.id)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }

  return mapPatient(data as PatientRow)
}

export async function deletePatientRecord(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  if (!id.trim()) {
    throw new PatientRecordServiceError("validation", "Patient ID is required.")
  }

  const supabase = await getClient(client)
  const { error, count } = await supabase
    .from("patient_records")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) mapError(error)
  if (!count) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }
}

export async function listPatientOptions(
  query = "",
  client?: SupabaseClient
): Promise<PatientRecord[]> {
  const result = await getPatientRecords(
    { query, page: 1, pageSize: 50 },
    client
  )
  return result.items
}
