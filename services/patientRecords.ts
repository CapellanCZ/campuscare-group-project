import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  PatientRecordServiceError,
  normalizePatientType,
  patientFullName,
  patientRecordFromJson,
  patientRecordToJson,
  type CreatePatientRecordInput,
  type PatientRecord,
  type PatientRecordJson,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type PatientType,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"

const DEFAULT_PAGE_SIZE = 20

const SELECT_COLUMNS = `
  id,
  patient_type,
  student_id,
  employee_id,
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
    message.includes("patient_records_student_id") ||
    message.includes("patient_records_employee_id") ||
    message.includes("duplicate key")
  ) {
    throw new PatientRecordServiceError(
      "duplicate",
      "A patient with this campus ID already exists."
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

function validateRequired(input: CreatePatientRecordInput) {
  const patientType = normalizePatientType(input.patientType)
  if (!patientType) {
    throw new PatientRecordServiceError(
      "validation",
      "Choose student or faculty."
    )
  }
  if (!input.firstName.trim()) {
    throw new PatientRecordServiceError("validation", "First name is required.")
  }
  if (!input.lastName.trim()) {
    throw new PatientRecordServiceError("validation", "Last name is required.")
  }
  if (patientType === "student") {
    if (!input.studentId?.trim()) {
      throw new PatientRecordServiceError(
        "validation",
        "Student ID is required."
      )
    }
    if (!input.course?.trim()) {
      throw new PatientRecordServiceError("validation", "Course is required.")
    }
  } else if (!input.employeeId?.trim()) {
    throw new PatientRecordServiceError(
      "validation",
      "Employee / faculty ID is required."
    )
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
  const patientTypeFilter = params.patientType ?? "all"
  const sortBy = params.sortBy ?? "patient"
  const sortDir = params.sortDir ?? "asc"

  const { data, error } = await supabase
    .from("patient_records")
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })

  if (error) mapError(error)

  let items = ((data ?? []) as PatientRow[]).map(mapPatient)
  if (patientTypeFilter !== "all") {
    items = items.filter((item) => item.patientType === patientTypeFilter)
  }
  if (query) {
    items = items.filter((item) => matchesQuery(item, query))
  }
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

export type ImportPatientRecordsResult = {
  created: number
  failures: string[]
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  }
}

export async function importPatientRecordsFromExcel(
  formData: FormData,
  client?: SupabaseClient
): Promise<ImportPatientRecordsResult> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    throw new PatientRecordServiceError(
      "validation",
      "Choose an Excel file to import."
    )
  }

  const { parseExcelRows } = await import("@/features/admin/lib/excel")
  const rows = await parseExcelRows(await file.arrayBuffer())
  if (rows.length === 0) {
    throw new PatientRecordServiceError(
      "validation",
      "No rows found in the spreadsheet."
    )
  }

  let created = 0
  const failures: string[] = []

  for (const [index, row] of rows.entries()) {
    const patientType =
      normalizePatientType(
        row.patient_type || row.affiliation || row.type || row.category
      ) ?? "student"

    const fromFullName = splitFullName(row.full_name || row.name || "")
    const firstName = (row.first_name || fromFullName.firstName).trim()
    const lastName = (row.last_name || fromFullName.lastName).trim()
    const middleName = (row.middle_name || "").trim()
    const studentId = (row.student_id || "").trim()
    const employeeId = (row.employee_id || row.id_number || "").trim()

    try {
      await createPatientRecord(
        {
          patientType,
          studentId:
            patientType === "student"
              ? studentId || employeeId
              : studentId || null,
          employeeId:
            patientType === "faculty"
              ? employeeId || studentId
              : employeeId || null,
          firstName,
          middleName: middleName || null,
          lastName,
          course: (row.course || row.department || "").trim() || null,
          yearLevel: (row.year_level || "").trim() || null,
          gender: (row.gender || row.sex || "").trim() || null,
          birthDate: (row.birth_date || row.date_of_birth || row.dob || "").trim() || null,
          bloodType: (row.blood_type || "").trim() || null,
          allergies: (row.allergies || "").trim() || null,
          phone: (row.phone || "").trim() || null,
          email: (row.email || "").trim().toLowerCase() || null,
          address: (row.address || "").trim() || null,
          emergencyContactName:
            (row.emergency_contact_name || "").trim() || null,
          emergencyContactPhone:
            (row.emergency_contact_phone || "").trim() || null,
          medicalConditions: (row.medical_conditions || "").trim() || null,
          notes: (row.notes || "").trim() || null,
          lastVisit: (row.last_visit || "").trim() || null,
        },
        client
      )
      created += 1
    } catch (error) {
      const message =
        error instanceof PatientRecordServiceError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error"
      failures.push(`Row ${index + 2}: ${message}`)
    }
  }

  if (created === 0) {
    throw new PatientRecordServiceError(
      "validation",
      failures[0] ??
        "No patients imported. Headers: patient_type, student_id, employee_id, first_name, last_name, course, phone, email"
    )
  }

  return { created, failures }
}

export type { PatientType }
