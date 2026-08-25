import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { PATIENT_RECORD_SELECT_COLUMNS } from "@/lib/students/patient-record-select"
import {
  PatientRecordServiceError,
  allergiesSummaryFromHistory,
  normalizePatientType,
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
  client?: SupabaseClient
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
        : (input.employeeId ?? "").trim()

  if (patientType !== "visitor" && !campusId) {
    throw new PatientRecordServiceError(
      "validation",
      patientType === "student"
        ? "Student ID is required."
        : "Employee / faculty ID is required."
    )
  }

  let existing: PatientRow | null = null
  if (patientType !== "visitor" && campusId) {
    let existingQuery = supabase
      .from("patient_records")
      .select(`${SELECT_COLUMNS}, consultations(count)`)

    existingQuery =
      patientType === "student"
        ? existingQuery.eq("student_id", campusId)
        : existingQuery.eq("employee_id", campusId)

    const { data, error: findError } = await existingQuery.maybeSingle()
    if (findError) mapError(findError)
    existing = data as PatientRow | null
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
    await upsertOperationalPatient(clinical)
    return { record: clinical, created: false }
  }

  const { data, error } = await supabase
    .from("patient_records")
    .insert(payload)
    .select(`${SELECT_COLUMNS}, consultations(count)`)
    .single()

  if (error) mapError(error)
  const clinical = mapPatient(data as PatientRow)
  await upsertOperationalPatient(clinical)
  return { record: clinical, created: true }
}

async function upsertOperationalPatient(clinical: PatientRecord) {
  const admin = createAdminClient()
  const fullName = patientFullName(clinical)
  const isStudent = clinical.patientType === "student"
  const studentId = isStudent ? clinical.studentId : null
  const employeeId =
    clinical.patientType === "faculty" || clinical.patientType === "employee"
      ? clinical.employeeId
      : null

  let existing: { id: string } | null = null
  if (studentId) {
    const { data, error } = await admin
      .from("patients")
      .select("id")
      .eq("student_id", studentId)
      .limit(1)
      .maybeSingle()
    if (error) mapError(error)
    existing = data
  } else if (employeeId) {
    const { data, error } = await admin
      .from("patients")
      .select("id")
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

  if (existing?.id) {
    const { error } = await admin.from("patients").update(body).eq("id", existing.id)
    if (error) mapError(error)
    return
  }

  const { error } = await admin.from("patients").insert({
    clinic_id: CAMPUS_CLINIC_ID,
    timezone: "Asia/Manila",
    ...body,
  })
  if (error) mapError(error)
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
  updated: number
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
  let updated = 0
  const failures: string[] = []

  for (const [index, row] of rows.entries()) {
    const patientType =
      normalizePatientType(
        row.patient_type || row.affiliation || row.type || row.category
      ) ?? "student"

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
    const studentId = (
      row.student_id ||
      row.student_id_number ||
      row.nu_quest_id ||
      ""
    ).trim()
    const employeeId = (row.employee_id || row.id_number || "").trim()

    try {
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
        occupation: (row.guardian_occupation || row.occupation || "").trim() || null,
        address: (row.guardian_address || "").trim() || null,
        mobile:
          (
            row.emergency_contact_phone ||
            row.guardian_mobile ||
            ""
          ).trim() || null,
        email: (row.guardian_email || "").trim().toLowerCase() || null,
      }
      const hasFamily = Object.values(familyBackground).some(Boolean)

      const result = await upsertPatientRecord(
        {
          patientType,
          studentId:
            patientType === "student"
              ? studentId || employeeId
              : studentId || null,
          employeeId:
            patientType === "faculty" || patientType === "employee"
              ? employeeId || studentId
              : employeeId || null,
          firstName,
          middleName: middleName || null,
          lastName,
          course: (row.course || "").trim() || null,
          yearLevel: (row.year_level || "").trim() || null,
          gender: (row.gender || row.sex || "").trim() || null,
          birthDate:
            (
              row.birth_date ||
              row.date_of_birth ||
              row.dob ||
              ""
            ).trim() || null,
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
          email: (
            row.email ||
            row.official_email_address ||
            ""
          )
            .trim()
            .toLowerCase() || null,
          address: (row.address || row.present_address || "").trim() || null,
          emergencyContactName: familyBackground.guardianName,
          emergencyContactPhone: familyBackground.mobile,
          medicalConditions: (row.medical_conditions || "").trim() || null,
          notes: (row.notes || "").trim() || null,
          lastVisit: (row.last_visit || "").trim() || null,
          familyBackground: hasFamily ? familyBackground : null,
        },
        client
      )
      if (result.created) created += 1
      else updated += 1
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

  if (created === 0 && updated === 0) {
    throw new PatientRecordServiceError(
      "validation",
      failures[0] ??
        "No patients imported. Headers: patient_type, student_id, employee_id, first_name, last_name, course, phone, email"
    )
  }

  return { created, updated, failures }
}

export type { PatientType }
