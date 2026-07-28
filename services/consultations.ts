import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"
import {
  CONSULTATION_STATUSES,
  ConsultationServiceError,
  type Consultation,
  type ConsultationListParams,
  type ConsultationListResult,
  type ConsultationStation,
  type ConsultationStats,
  type ConsultationStatus,
  type UpdateConsultationInput,
} from "@/types/consultation"

type ConsultationRow = {
  id: string
  appointment_id: string | null
  student_id: string | null
  visit_date: string
  station: string
  chief_complaint: string | null
  status: string
  provider_name: string | null
  assessment_notes: string | null
  diagnosis: string | null
  treatment_notes: string | null
  prescription: string | null
  started_at: string | null
  completed_at: string | null
}

type StudentRow = {
  student_id: string
  first_name: string | null
  last_name: string | null
}

const DEFAULT_PAGE_SIZE = 10
const STATUS_SET = new Set<string>(CONSULTATION_STATUSES)
const STATIONS = new Set<string>(["nurse", "physician", "dentist"])

function isStatus(value: string): value is ConsultationStatus {
  return STATUS_SET.has(value)
}

function isStation(value: string): value is ConsultationStation {
  return STATIONS.has(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new ConsultationServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new ConsultationServiceError(
      "permission",
      "You do not have permission to access consultations."
    )
  }
  throw new ConsultationServiceError(
    "database",
    error.message || "A database error occurred while loading consultations."
  )
}

function patientName(student: StudentRow | null, studentId: string | null) {
  if (!student) return studentId ? `Student ${studentId}` : "Unknown patient"
  const first = student.first_name?.trim() ?? ""
  const last = student.last_name?.trim() ?? ""
  const full = `${first} ${last}`.trim()
  return full || studentId || "Unknown patient"
}

function mapConsultation(
  row: ConsultationRow,
  student: StudentRow | null
): Consultation {
  const status = isStatus(row.status) ? row.status : "awaiting_assessment"
  const station = isStation(row.station) ? row.station : "nurse"

  return {
    id: row.id,
    appointmentId: row.appointment_id,
    patientName: patientName(student, row.student_id),
    studentId: row.student_id ?? "—",
    station,
    chiefComplaint: row.chief_complaint?.trim() || "—",
    status,
    startedAt: row.started_at,
    provider: row.provider_name?.trim() || "—",
    hasAssessment: Boolean(row.assessment_notes?.trim()),
    hasDiagnosis: Boolean(row.diagnosis?.trim()),
    hasPrescription: Boolean(row.prescription?.trim()),
    assessmentNotes: row.assessment_notes,
    diagnosis: row.diagnosis,
    treatmentNotes: row.treatment_notes,
    prescription: row.prescription,
  }
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
    .select("student_id, first_name, last_name")
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

async function fetchConsultationRows(
  supabase: SupabaseClient,
  visitDate: string
) {
  const { data, error } = await supabase
    .from("health_consultations")
    .select(
      "id, appointment_id, student_id, visit_date, station, chief_complaint, status, provider_name, assessment_notes, diagnosis, treatment_notes, prescription, started_at, completed_at"
    )
    .eq("visit_date", visitDate)
    .order("started_at", { ascending: false, nullsFirst: false })

  if (error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes("schema cache") ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table")
    ) {
      return [] as ConsultationRow[]
    }
    mapError(error)
  }

  return (data ?? []) as ConsultationRow[]
}

export async function getConsultations(
  params: ConsultationListParams = {},
  client?: SupabaseClient
): Promise<ConsultationListResult> {
  const supabase = await getClient(client)
  const { ymd } = manilaDayBounds()
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim().toLowerCase() ?? ""
  const status = params.status ?? "all"
  const station = params.station ?? "all"

  const rows = await fetchConsultationRows(supabase, ymd)
  const students = await loadStudents(
    supabase,
    [...new Set(rows.map((r) => r.student_id).filter(Boolean) as string[])]
  )

  let items = rows.map((row) =>
    mapConsultation(
      row,
      row.student_id ? students.get(row.student_id) ?? null : null
    )
  )

  if (status !== "all") {
    items = items.filter((item) => item.status === status)
  }
  if (station !== "all") {
    items = items.filter((item) => item.station === station)
  }
  if (query) {
    items = items.filter((item) => {
      const haystack = [
        item.patientName,
        item.studentId,
        item.chiefComplaint,
        item.provider,
        item.status,
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

export async function getConsultationStats(
  client?: SupabaseClient
): Promise<ConsultationStats> {
  const supabase = await getClient(client)
  const { ymd } = manilaDayBounds()
  const rows = await fetchConsultationRows(supabase, ymd)

  let awaitingAssessment = 0
  let inProgress = 0
  let completedToday = 0

  for (const row of rows) {
    if (row.status === "awaiting_assessment") awaitingAssessment += 1
    if (row.status === "in_progress") inProgress += 1
    if (row.status === "completed") completedToday += 1
  }

  return {
    openToday: rows.length,
    awaitingAssessment,
    inProgress,
    completedToday,
  }
}

export async function getConsultationById(
  id: string,
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("health_consultations")
    .select(
      "id, appointment_id, student_id, visit_date, station, chief_complaint, status, provider_name, assessment_notes, diagnosis, treatment_notes, prescription, started_at, completed_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationServiceError("not_found", "Consultation not found.")
  }

  const students = await loadStudents(
    supabase,
    data.student_id ? [data.student_id as string] : []
  )

  return mapConsultation(
    data as ConsultationRow,
    data.student_id
      ? students.get(data.student_id as string) ?? null
      : null
  )
}

export async function updateConsultation(
  input: UpdateConsultationInput,
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  if (!input.id) {
    throw new ConsultationServiceError("validation", "Consultation id is required.")
  }

  const patch: Record<string, string | null> = {}
  if (input.assessmentNotes !== undefined) {
    patch.assessment_notes = input.assessmentNotes?.trim() || null
  }
  if (input.diagnosis !== undefined) {
    patch.diagnosis = input.diagnosis?.trim() || null
  }
  if (input.treatmentNotes !== undefined) {
    patch.treatment_notes = input.treatmentNotes?.trim() || null
  }
  if (input.prescription !== undefined) {
    patch.prescription = input.prescription?.trim() || null
  }
  if (input.providerName !== undefined) {
    patch.provider_name = input.providerName?.trim() || null
  }
  if (input.status !== undefined) {
    patch.status = input.status
    if (input.status === "in_progress") {
      patch.started_at = new Date().toISOString()
    }
    if (input.status === "completed") {
      patch.completed_at = new Date().toISOString()
    }
  }

  if (input.assessmentNotes?.trim()) {
    patch.status = patch.status ?? "in_progress"
  }

  const { error } = await supabase
    .from("health_consultations")
    .update(patch)
    .eq("id", input.id)

  if (error) mapError(error)

  return getConsultationById(input.id, supabase)
}

export async function recordConsultationAssessment(
  id: string,
  assessmentNotes: string,
  providerName?: string,
  client?: SupabaseClient
): Promise<Consultation> {
  return updateConsultation(
    {
      id,
      assessmentNotes,
      providerName,
      status: "in_progress",
    },
    client
  )
}

export async function completeConsultation(
  id: string,
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  const consultation = await getConsultationById(id, supabase)

  const { error } = await supabase
    .from("health_consultations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) mapError(error)

  if (consultation.appointmentId) {
    await supabase
      .from("health_appointments")
      .update({
        status: "completed",
        workflow_status: "completed",
        consultation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", consultation.appointmentId)
  }

  return getConsultationById(id, supabase)
}

/** Creates or returns today's consultation row for a queue appointment. */
export async function ensureConsultationForAppointment(
  params: {
    appointmentId: string
    studentId?: string | null
    station?: ConsultationStation
    chiefComplaint?: string | null
    providerName?: string | null
  },
  client?: SupabaseClient
): Promise<Consultation> {
  const supabase = await getClient(client)
  const { ymd } = manilaDayBounds()

  const { data: existing } = await supabase
    .from("health_consultations")
    .select("id")
    .eq("appointment_id", params.appointmentId)
    .eq("visit_date", ymd)
    .maybeSingle()

  if (existing?.id) {
    return getConsultationById(existing.id as string, supabase)
  }

  const { data, error } = await supabase
    .from("health_consultations")
    .insert({
      appointment_id: params.appointmentId,
      student_id: params.studentId ?? null,
      visit_date: ymd,
      station: params.station ?? "nurse",
      chief_complaint: params.chiefComplaint?.trim() || null,
      status: "awaiting_assessment",
      provider_name: params.providerName?.trim() || null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) mapError(error)
  return getConsultationById(data.id as string, supabase)
}
