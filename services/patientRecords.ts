import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  createPatientAuthSyncContext,
  provisionPatientAuthIfNeeded,
  type PatientAuthSyncContext,
} from "@/lib/patients/provision-patient-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import {
  campusIdLookupVariants,
  normalizeEmployeeCampusId,
} from "@/lib/students/student-id-input"
import {
  PatientRecordServiceError,
  allergiesSummaryFromHistory,
  CAMPUS_ID_LABEL,
  campusIdsFromIdNumber,
  isPatientTypeRoleLabel,
  normalizePatientType,
  resolveImportPatientType,
  patientFullName,
  patientRecordFromJson,
  patientRecordToJson,
  parseMedicalHistory,
  parsePhysicalExam,
  type CreatePatientRecordInput,
  type PatientRecord,
  type PatientRecordJson,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type PatientType,
  type UpdatePatientMedicalRecordInput,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"

const DEFAULT_PAGE_SIZE = 20

const SELECT_COLUMNS = PATIENT_RECORD_SELECT_COLUMNS

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

async function resolveEditorName(
  userId: string | null,
  client: SupabaseClient
): Promise<string | null> {
  if (!userId) return null
  const { data } = await client
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle()
  return (data?.full_name as string | null) ?? null
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
      "Choose a valid patient type."
    )
  }
  if (!input.firstName.trim()) {
    throw new PatientRecordServiceError("validation", "First name is required.")
  }
  if (!input.lastName.trim()) {
    throw new PatientRecordServiceError("validation", "Last name is required.")
  }
  if (patientType === "visitor") {
    return
  }
  if (patientType === "student") {
    if (!input.studentId?.trim()) {
      throw new PatientRecordServiceError(
        "validation",
        `${CAMPUS_ID_LABEL} is required.`
      )
    }
    if (!input.course?.trim()) {
      throw new PatientRecordServiceError("validation", "Course is required.")
    }
  } else if (!input.employeeId?.trim()) {
    throw new PatientRecordServiceError(
      "validation",
      `${CAMPUS_ID_LABEL} is required.`
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
  const queryText = params.query?.trim() ?? ""
  const patientTypeFilter = params.patientType ?? "all"
  const sortBy = params.sortBy ?? "patient"
  const sortDir = params.sortDir ?? "asc"

  let request = supabase
    .from("patient_records")
    .select(`${SELECT_COLUMNS}, consultations(count)`, { count: "exact" })
    .is("archived_at", null)

  if (patientTypeFilter !== "all") {
    request = request.eq("patient_type", patientTypeFilter)
  }

  if (queryText) {
    const escaped = queryText.replace(/[%_,]/g, "")
    if (escaped) {
      const pattern = `%${escaped}%`
      request = request.or(
        [
          `first_name.ilike.${pattern}`,
          `last_name.ilike.${pattern}`,
          `middle_name.ilike.${pattern}`,
          `student_id.ilike.${pattern}`,
          `employee_id.ilike.${pattern}`,
          `course.ilike.${pattern}`,
        ].join(",")
      )
    }
  }

  if (sortBy === "type") {
    request = request.order("patient_type", { ascending: sortDir === "asc" })
  } else if (sortBy === "program") {
    request = request.order("course", {
      ascending: sortDir === "asc",
      nullsFirst: false,
    })
  } else if (sortBy === "lastVisit") {
    request = request.order("last_visit", {
      ascending: sortDir === "asc",
      nullsFirst: false,
    })
  } else {
    request = request
      .order("last_name", { ascending: sortDir === "asc" })
      .order("first_name", { ascending: sortDir === "asc" })
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await request.range(from, to)

  if (error) mapError(error)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  return {
    items: ((data ?? []) as PatientRow[]).map(mapPatient),
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

  const mapped = mapPatient(data as PatientRow)
  const editorName = await resolveEditorName(mapped.lastEditedBy, supabase)
  return { ...mapped, lastEditedByName: editorName }
}

export async function getPatientRecordStats(
  client?: SupabaseClient
): Promise<PatientRecordStats> {
  const supabase = await getClient(client)
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

  if (allResult.error) mapError(allResult.error)
  if (visitedResult.error) mapError(visitedResult.error)
  if (allergiesResult.error) mapError(allergiesResult.error)
  if (documentsResult.error) mapError(documentsResult.error)

  return {
    patientsOnFile: allResult.count ?? 0,
    visitedThisMonth: visitedResult.count ?? 0,
    flaggedAllergies: allergiesResult.count ?? 0,
    documents: documentsResult.count ?? 0,
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
  const clinical = mapPatient(data as PatientRow)
  await upsertOperationalPatient(clinical)
  return clinical
}

/**
 * Upsert clinical patient_records by campus ID, then mirror demographics to patients.
 * Does not wipe medical_history / physical_exam on update.
 */
export async function upsertPatientRecord(
  input: CreatePatientRecordInput,
  client?: SupabaseClient,
  syncContext?: PatientAuthSyncContext
): Promise<{ record: PatientRecord; created: boolean }> {
  validateRequired(input)
  const supabase = await getClient(client)
  const payload = patientRecordToJson(input)
  const patientType = normalizePatientType(input.patientType) ?? "student"
  const campusId =
    patientType === "student"
      ? (input.studentId ?? "").trim()
      : patientType === "visitor"
        ? ""
        : normalizeEmployeeCampusId((input.employeeId ?? "").trim())

  if (patientType !== "visitor" && !campusId) {
    throw new PatientRecordServiceError(
      "validation",
      `${CAMPUS_ID_LABEL} is required.`
    )
  }

  let existing: PatientRow | null = null
  if (patientType !== "visitor" && campusId) {
    if (patientType === "student") {
      const { data, error: findError } = await supabase
        .from("patient_records")
        .select(`${SELECT_COLUMNS}, consultations(count)`)
        .eq("student_id", campusId)
        .maybeSingle()
      if (findError) mapError(findError)
      existing = data as PatientRow | null
    } else {
      for (const variant of campusIdLookupVariants(campusId)) {
        const { data, error: findError } = await supabase
          .from("patient_records")
          .select(`${SELECT_COLUMNS}, consultations(count)`)
          .eq("employee_id", variant)
          .maybeSingle()
        if (findError) mapError(findError)
        if (data) {
          existing = data as PatientRow
          break
        }
      }
    }
  }

  if (existing) {
    const { data, error } = await supabase
      .from("patient_records")
      .update({
        patient_type: payload.patient_type,
        student_id: payload.student_id,
        employee_id: payload.employee_id,
        first_name: payload.first_name,
        middle_name: payload.middle_name,
        last_name: payload.last_name,
        course: payload.course,
        year_level: payload.year_level,
        gender: payload.gender,
        birth_date: payload.birth_date,
        civil_status: payload.civil_status,
        religion: payload.religion,
        nationality: payload.nationality,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        emergency_contact_name: payload.emergency_contact_name,
        emergency_contact_phone: payload.emergency_contact_phone,
        blood_type: payload.blood_type,
        family_background:
          payload.family_background ??
          (existing as PatientRow).family_background ??
          null,
        // Keep existing allergies / medical_conditions / notes / chart unless provided
        allergies: payload.allergies ?? (existing as PatientRow).allergies,
        medical_conditions:
          payload.medical_conditions ??
          (existing as PatientRow).medical_conditions,
        notes: payload.notes ?? (existing as PatientRow).notes,
      })
      .eq("id", (existing as PatientRow).id)
      .select(`${SELECT_COLUMNS}, consultations(count)`)
      .single()

    if (error) mapError(error)
    const clinical = mapPatient(data as PatientRow)
    await upsertOperationalPatient(clinical, syncContext)
    return { record: clinical, created: false }
  }

  const { data, error } = await supabase
    .from("patient_records")
    .insert(payload)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .single()

  if (error) mapError(error)
  const clinical = mapPatient(data as PatientRow)
  await upsertOperationalPatient(clinical, syncContext)
  return { record: clinical, created: true }
}

async function upsertOperationalPatient(
  clinical: PatientRecord,
  syncContext?: PatientAuthSyncContext
) {
  const admin = createAdminClient()
  const fullName = patientFullName(clinical)
  const isStudent = clinical.patientType === "student"
  const studentId = isStudent ? clinical.studentId : null
  const employeeId =
    clinical.patientType === "faculty" || clinical.patientType === "employee"
      ? clinical.employeeId
      : null

  let existing: { id: string; auth_user_id: string | null } | null = null
  if (studentId) {
    const { data, error } = await admin
      .from("patients")
      .select("id, auth_user_id")
      .eq("student_id", studentId)
      .limit(1)
      .maybeSingle()
    if (error) mapError(error)
    existing = data
  } else if (employeeId) {
    const { data, error } = await admin
      .from("patients")
      .select("id, auth_user_id")
      .eq("employee_id", employeeId)
      .limit(1)
      .maybeSingle()
    if (error) mapError(error)
    existing = data
  }

  const body = {
    full_name: fullName,
    email: clinical.email,
    phone: clinical.phone,
    date_of_birth: clinical.birthDate,
    sex: clinical.gender,
    patient_type: clinical.patientType,
    affiliation: clinical.patientType,
    student_id: studentId,
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
  }

  if (clinical.patientType === "visitor" && !studentId && !employeeId) {
    return
  }

  let patientId = existing?.id ?? null

  if (existing?.id) {
    const { error } = await admin.from("patients").update(body).eq("id", existing.id)
    if (error) mapError(error)
  } else {
    const { data, error } = await admin
      .from("patients")
      .insert({
        clinic_id: CAMPUS_CLINIC_ID,
        timezone: "Asia/Manila",
        ...body,
      })
      .select("id")
      .single()
    if (error) mapError(error)
    patientId = data.id
  }

  const email = (clinical.email ?? "").trim()
  if (!patientId || !email || existing?.auth_user_id) {
    return
  }

  try {
    await provisionPatientAuthIfNeeded({
      patientId,
      email,
      fullName,
      syncContext,
      admin: syncContext?.admin,
      emailToUserId: syncContext?.emailToUserId,
    })
  } catch (error) {
    console.error(
      "Could not provision patient auth user:",
      error instanceof Error ? error.message : error
    )
  }
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

export async function updatePatientMedicalRecord(
  input: UpdatePatientMedicalRecordInput,
  client?: SupabaseClient
): Promise<PatientRecord> {
  if (!input.id.trim()) {
    throw new PatientRecordServiceError("validation", "Patient ID is required.")
  }

  const supabase = await getClient(client)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new PatientRecordServiceError(
      "permission",
      "You must be signed in to update medical records."
    )
  }

  const { data: existing, error: findError } = await supabase
    .from("patient_records")
    .select("id, patient_type, student_id")
    .eq("id", input.id)
    .maybeSingle()

  if (findError) mapError(findError)
  if (!existing) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }
  if (existing.patient_type !== "student") {
    throw new PatientRecordServiceError(
      "validation",
      "Only student medical records can be updated here."
    )
  }

  const medicalHistory = parseMedicalHistory(input.medicalHistory)
  const physicalExam = parsePhysicalExam(input.physicalExam)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("patient_records")
    .update({
      medical_history: medicalHistory,
      physical_exam: physicalExam,
      allergies: allergiesSummaryFromHistory(medicalHistory),
      last_edited_at: now,
      last_edited_by: user.id,
    })
    .eq("id", input.id)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }

  const mapped = mapPatient(data as PatientRow)
  const editorName = await resolveEditorName(user.id, supabase)
  return {
    ...mapped,
    lastEditedByName: editorName,
  }
}

async function deleteOperationalPatientsForRecords(
  rows: Array<{
    student_id?: string | null
    employee_id?: string | null
  }>
) {
  const studentIds = [
    ...new Set(
      rows
        .map((row) => row.student_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const employeeIds = [
    ...new Set(
      rows
        .map((row) => row.employee_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (studentIds.length === 0 && employeeIds.length === 0) return

  const admin = createAdminClient()

  if (studentIds.length > 0) {
    const { error } = await admin
      .from("patients")
      .delete()
      .in("student_id", studentIds)
    if (error) mapError(error)
  }

  if (employeeIds.length > 0) {
    const { error } = await admin
      .from("patients")
      .delete()
      .in("employee_id", employeeIds)
    if (error) mapError(error)
  }
}

export async function deletePatientRecord(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  if (!id.trim()) {
    throw new PatientRecordServiceError("validation", "Patient ID is required.")
  }

  const supabase = await getClient(client)
  const { data: existing, error: findError } = await supabase
    .from("patient_records")
    .select("id, student_id, employee_id")
    .eq("id", id)
    .maybeSingle()

  if (findError) mapError(findError)
  if (!existing) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }

  const { error, count } = await supabase
    .from("patient_records")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) mapError(error)
  if (!count) {
    throw new PatientRecordServiceError("not_found", "Patient record not found.")
  }

  await deleteOperationalPatientsForRecords([existing])
}

export async function archivePatientRecords(
  ids: string[],
  client?: SupabaseClient
): Promise<{ archived: number }> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) {
    throw new PatientRecordServiceError(
      "validation",
      "Select at least one patient to archive."
    )
  }

  const supabase = await getClient(client)
  const archivedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("patient_records")
    .update({ archived_at: archivedAt })
    .in("id", uniqueIds)
    .is("archived_at", null)
    .select("id")

  if (error) mapError(error)

  const archived = data?.length ?? 0
  if (archived === 0) {
    throw new PatientRecordServiceError(
      "not_found",
      "No matching active patient records were found to archive."
    )
  }

  return { archived }
}

export async function deletePatientRecords(
  ids: string[],
  client?: SupabaseClient
): Promise<{ deleted: number }> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) {
    throw new PatientRecordServiceError(
      "validation",
      "Select at least one patient to delete."
    )
  }

  const supabase = await getClient(client)

  const { data: existing, error: findError } = await supabase
    .from("patient_records")
    .select("id, student_id, employee_id")
    .in("id", uniqueIds)
    .not("archived_at", "is", null)

  if (findError) mapError(findError)
  if (!existing || existing.length === 0) {
    throw new PatientRecordServiceError(
      "not_found",
      "No matching archived patient records were found to delete."
    )
  }

  const { data, error } = await supabase
    .from("patient_records")
    .delete()
    .in(
      "id",
      existing.map((row) => row.id)
    )
    .not("archived_at", "is", null)
    .select("id")

  if (error) mapError(error)

  const deleted = data?.length ?? 0
  if (deleted === 0) {
    throw new PatientRecordServiceError(
      "not_found",
      "No matching archived patient records were found to delete."
    )
  }

  await deleteOperationalPatientsForRecords(existing)

  return { deleted }
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
  updated: number
  failures: string[]
  typeCounts: Record<PatientType, number>
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

/** Reject non-date strings (e.g. nationality mis-mapped into birth_date). */
function sanitizeImportBirthDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
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
  const { bulkImportPatientRecords } = await import(
    "@/features/patients/data/bulk-import-patient-records"
  )
  const rows = await parseExcelRows(await file.arrayBuffer())
  if (rows.length === 0) {
    throw new PatientRecordServiceError(
      "validation",
      "No rows found in the spreadsheet."
    )
  }

  const failures: string[] = []
  const inputs: CreatePatientRecordInput[] = []

  for (const [index, row] of rows.entries()) {
    const patientType = resolveImportPatientType(row)

    const fromFullName = splitFullName(row.full_name || row.name || "")
    const firstName = (
      row.first_name ||
      row.firstname ||
      fromFullName.firstName
    ).trim()
    const lastName = (
      row.last_name ||
      row.lastname ||
      fromFullName.lastName
    ).trim()
    const middleName = (row.middle_name || row.middlename || "").trim()
    const idNumber = (
      row.id_number ||
      row.id_no ||
      row.campus_id ||
      ""
    ).trim()
    const studentId = (
      row.student_id ||
      row.student_id_number ||
      row.nu_quest_id ||
      ""
    ).trim()
    const employeeId = (row.employee_id || "").trim()
    const resolvedIds = campusIdsFromIdNumber(
      patientType,
      idNumber ||
        (patientType === "student"
          ? studentId || employeeId
          : employeeId || studentId)
    )
    if (!resolvedIds.ok) {
      failures.push(`Row ${index + 2}: ${resolvedIds.error}`)
      continue
    }
    if (!firstName || !lastName) {
      failures.push(`Row ${index + 2}: first_name and last_name are required.`)
      continue
    }

    const familyBackground = {
      guardianName:
        (
          row.emergency_contact_name ||
          row.parent_guardian_name ||
          row.guardian_name ||
          ""
        ).trim() || null,
      relationship:
        (row.guardian_relationship || row.relationship || "").trim() || null,
      occupation: (() => {
        const guardian = (row.guardian_occupation || "").trim()
        if (guardian) return guardian
        const occupation = (row.occupation || "").trim()
        if (occupation && isPatientTypeRoleLabel(occupation)) return null
        return occupation || null
      })(),
      address: (row.guardian_address || "").trim() || null,
      mobile:
        (row.emergency_contact_phone || row.guardian_mobile || "").trim() ||
        null,
      email: (row.guardian_email || "").trim().toLowerCase() || null,
    }
    const hasFamily = Object.values(familyBackground).some(Boolean)

    inputs.push({
      patientType,
      studentId: resolvedIds.studentId ?? "",
      employeeId: resolvedIds.employeeId ?? "",
      firstName,
      middleName: middleName || null,
      lastName,
      course:
        patientType === "student" ? (row.course || "").trim() || null : null,
      yearLevel:
        patientType === "student"
          ? (row.year_level || "").trim() || null
          : null,
      gender: (row.gender || row.sex || "").trim() || null,
      birthDate: sanitizeImportBirthDate(
        row.birth_date || row.date_of_birth || row.dob || ""
      ),
      civilStatus: (row.civil_status || "").trim() || null,
      religion: (row.religion || "").trim() || null,
      nationality: (row.nationality || "").trim() || null,
      bloodType: (row.blood_type || "").trim() || null,
      allergies: (row.allergies || "").trim() || null,
      phone: (
        row.phone ||
        row.mobile ||
        row.mobile_number ||
        ""
      ).trim() || null,
      email: (row.email || row.official_email_address || "")
        .trim()
        .toLowerCase() || null,
      address: (row.address || row.present_address || "").trim() || null,
      emergencyContactName: familyBackground.guardianName,
      emergencyContactPhone: familyBackground.mobile,
      medicalConditions: (row.medical_conditions || "").trim() || null,
      notes: (row.notes || "").trim() || null,
      lastVisit: (row.last_visit || "").trim() || null,
      familyBackground: hasFamily ? familyBackground : null,
    })
  }

  if (inputs.length === 0) {
    throw new PatientRecordServiceError(
      "validation",
      failures[0] ??
        "No patients imported. Headers: patient_type, id_number, first_name, last_name, course, phone, email"
    )
  }

  try {
    const result = await bulkImportPatientRecords(inputs, client)
    return {
      created: result.created,
      updated: result.updated,
      failures,
      typeCounts: result.typeCounts,
    }
  } catch (error) {
    if (error instanceof PatientRecordServiceError) throw error
    throw new PatientRecordServiceError(
      "database",
      error instanceof Error ? error.message : "Patient import failed."
    )
  }
}

export type { PatientType }
