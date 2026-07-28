import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"
import {
  PatientRecordServiceError,
  type PatientAffiliation,
  type PatientRecord,
  type PatientRecordListParams,
  type PatientRecordListResult,
  type PatientRecordStats,
  type UpdatePatientRecordInput,
} from "@/types/patientRecord"

type PatientRow = {
  id: string
  full_name: string
  email: string | null
  student_id: string | null
  phone: string | null
  date_of_birth: string | null
  sex: string | null
  affiliation: string | null
  blood_type: string | null
  allergies: string | null
  course: string | null
  year_level: string | null
  updated_at: string | null
}

type StudentRow = {
  student_id: string
  course: string | null
  year_level: string | null
  blood_type: string | null
  allergies: string | null
}

const DEFAULT_PAGE_SIZE = 10

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
  throw new PatientRecordServiceError(
    "database",
    error.message || "A database error occurred while loading patients."
  )
}

function normalizeAffiliation(value: string | null): PatientAffiliation | null {
  const raw = (value ?? "").trim().toLowerCase()
  if (raw === "student" || raw === "faculty") return raw
  return null
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function loadStudents(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, StudentRow>> {
  const map = new Map<string, StudentRow>()
  if (!studentIds.length) return map

  const { data, error } = await supabase
    .from("students")
    .select("student_id, course, year_level, blood_type, allergies")
    .in("student_id", studentIds)

  if (error) {
    const msg = error.message.toLowerCase()
    if (!msg.includes("does not exist") && !msg.includes("schema cache")) {
      mapError(error)
    }
    return map
  }

  for (const row of data ?? []) {
    map.set(row.student_id as string, row as StudentRow)
  }
  return map
}

async function loadConsultationCounts(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!studentIds.length) return map

  const { data, error } = await supabase
    .from("health_consultations")
    .select("student_id")
    .in("student_id", studentIds)

  if (error) {
    const msg = error.message.toLowerCase()
    if (!msg.includes("does not exist") && !msg.includes("schema cache")) {
      return map
    }
    return map
  }

  for (const row of data ?? []) {
    const id = row.student_id as string
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

async function loadLastVisits(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!studentIds.length) return map

  const { data, error } = await supabase
    .from("health_consultations")
    .select("student_id, visit_date, completed_at")
    .in("student_id", studentIds)
    .order("visit_date", { ascending: false })

  if (error) return map

  for (const row of data ?? []) {
    const id = row.student_id as string
    if (map.has(id)) continue
    map.set(
      id,
      (row.completed_at as string | null) ??
        (row.visit_date as string) ??
        ""
    )
  }
  return map
}

function mapPatient(
  row: PatientRow,
  student: StudentRow | null,
  consultationsCount: number,
  lastVisit: string | null
): PatientRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    studentId: row.student_id,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    sex: row.sex,
    affiliation: normalizeAffiliation(row.affiliation),
    course: row.course?.trim() || student?.course?.trim() || null,
    yearLevel: row.year_level?.trim() || student?.year_level?.trim() || null,
    bloodType: row.blood_type?.trim() || student?.blood_type?.trim() || "—",
    allergies: row.allergies?.trim() || student?.allergies?.trim() || "None",
    lastVisit: lastVisit?.slice(0, 10) ?? row.updated_at?.slice(0, 10) ?? "—",
    consultationsCount,
    documentsCount: 0,
  }
}

export async function getPatientRecords(
  params: PatientRecordListParams = {},
  client?: SupabaseClient
): Promise<PatientRecordListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim().toLowerCase() ?? ""
  const affiliation = params.affiliation ?? "all"

  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, full_name, email, student_id, phone, date_of_birth, sex, affiliation, blood_type, allergies, course, year_level, updated_at"
    )
    .order("full_name")

  if (error) mapError(error)

  const rows = (data ?? []) as PatientRow[]
  const studentIds = [
    ...new Set(rows.map((r) => r.student_id).filter(Boolean) as string[]),
  ]
  const [students, consultCounts, lastVisits] = await Promise.all([
    loadStudents(supabase, studentIds),
    loadConsultationCounts(supabase, studentIds),
    loadLastVisits(supabase, studentIds),
  ])

  let items = rows.map((row) =>
    mapPatient(
      row,
      row.student_id ? students.get(row.student_id) ?? null : null,
      row.student_id ? consultCounts.get(row.student_id) ?? 0 : 0,
      row.student_id ? lastVisits.get(row.student_id) ?? null : null
    )
  )

  if (affiliation !== "all") {
    items = items.filter((item) => item.affiliation === affiliation)
  }

  if (query) {
    items = items.filter((item) => {
      const haystack = [
        item.fullName,
        item.studentId ?? "",
        item.course ?? "",
        item.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
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

export async function getPatientRecordStats(
  client?: SupabaseClient
): Promise<PatientRecordStats> {
  const supabase = await getClient(client)
  const { ymd } = manilaDayBounds()

  const { data, error } = await supabase
    .from("patients")
    .select("id, allergies, student_id")

  if (error) mapError(error)

  const rows = data ?? []
  const studentIds = rows
    .map((r) => r.student_id as string | null)
    .filter(Boolean) as string[]

  let visitedThisMonth = 0
  if (studentIds.length) {
    const monthPrefix = ymd.slice(0, 7)
    const { count } = await supabase
      .from("health_consultations")
      .select("id", { count: "exact", head: true })
      .gte("visit_date", `${monthPrefix}-01`)
      .lte("visit_date", ymd)

    visitedThisMonth = count ?? 0
  }

  const flaggedAllergies = rows.filter((row) => {
    const value = (row.allergies as string | null)?.trim().toLowerCase()
    return Boolean(value && value !== "none" && value !== "n/a")
  }).length

  return {
    total: rows.length,
    visitedThisMonth,
    flaggedAllergies,
    documents: 0,
  }
}

export async function getPatientRecordById(
  id: string,
  client?: SupabaseClient
): Promise<PatientRecord> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, full_name, email, student_id, phone, date_of_birth, sex, affiliation, blood_type, allergies, course, year_level, updated_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new PatientRecordServiceError("not_found", "Patient not found.")
  }

  const row = data as PatientRow
  const students = row.student_id
    ? await loadStudents(supabase, [row.student_id])
    : new Map<string, StudentRow>()
  const consultCounts = row.student_id
    ? await loadConsultationCounts(supabase, [row.student_id])
    : new Map<string, number>()
  const lastVisits = row.student_id
    ? await loadLastVisits(supabase, [row.student_id])
    : new Map<string, string>()

  return mapPatient(
    row,
    row.student_id ? students.get(row.student_id) ?? null : null,
    row.student_id ? consultCounts.get(row.student_id) ?? 0 : 0,
    row.student_id ? lastVisits.get(row.student_id) ?? null : null
  )
}

export async function updatePatientRecord(
  input: UpdatePatientRecordInput,
  client?: SupabaseClient
): Promise<PatientRecord> {
  const supabase = await getClient(client)
  if (!input.id) {
    throw new PatientRecordServiceError("validation", "Patient id is required.")
  }

  const patch: Record<string, string | null> = {}
  if (input.fullName !== undefined) {
    const name = input.fullName.trim()
    if (!name) {
      throw new PatientRecordServiceError(
        "validation",
        "Patient full name is required."
      )
    }
    patch.full_name = name
  }
  if (input.email !== undefined) patch.email = input.email?.trim() || null
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
  if (input.dateOfBirth !== undefined) {
    patch.date_of_birth = input.dateOfBirth?.trim() || null
  }
  if (input.sex !== undefined) patch.sex = input.sex?.trim() || null
  if (input.bloodType !== undefined) {
    patch.blood_type = input.bloodType?.trim() || null
  }
  if (input.allergies !== undefined) {
    patch.allergies = input.allergies?.trim() || null
  }
  if (input.course !== undefined) patch.course = input.course?.trim() || null
  if (input.yearLevel !== undefined) {
    patch.year_level = input.yearLevel?.trim() || null
  }
  patch.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from("patients")
    .update(patch)
    .eq("id", input.id)

  if (error) mapError(error)

  return getPatientRecordById(input.id, supabase)
}
