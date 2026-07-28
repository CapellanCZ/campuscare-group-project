import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { manilaDayBounds } from "@/lib/health/time"
import {
  CONSULTATION_REQUEST_STATUSES,
  ConsultationRequestServiceError,
  type ConsultationRequest,
  type ConsultationRequestListParams,
  type ConsultationRequestListResult,
  type ConsultationRequestStats,
  type ConsultationRequestStatus,
  type RescheduleConsultationRequestInput,
} from "@/types/consultationRequest"

type AppointmentRow = {
  id: string
  student_id: string | null
  appointment_date: string | null
  appointment_time: string | null
  status: string | null
  purpose: string | null
  service: string | null
  consultation_type: string | null
  workflow_status: string | null
  created_at: string
}

type StudentRow = {
  student_id: string
  first_name: string | null
  last_name: string | null
}

const DEFAULT_PAGE_SIZE = 10
const REQUEST_STATUSES = new Set<string>(CONSULTATION_REQUEST_STATUSES)

function isRequestStatus(value: string): value is ConsultationRequestStatus {
  return REQUEST_STATUSES.has(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new ConsultationRequestServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new ConsultationRequestServiceError(
      "permission",
      "You do not have permission to manage consultation requests."
    )
  }
  throw new ConsultationRequestServiceError(
    "database",
    error.message || "A database error occurred while loading requests."
  )
}

function patientName(student: StudentRow | null, studentId: string | null) {
  if (!student) return studentId ? `Student ${studentId}` : "Unknown patient"
  const first = student.first_name?.trim() ?? ""
  const last = student.last_name?.trim() ?? ""
  const full = `${first} ${last}`.trim()
  return full || studentId || "Unknown patient"
}

function normalizeStatus(raw: string | null): ConsultationRequestStatus {
  const value = (raw ?? "pending").toLowerCase()
  if (isRequestStatus(value)) return value
  if (value === "confirmed") return "approved"
  return "pending"
}

function mapRequest(row: AppointmentRow, student: StudentRow | null): ConsultationRequest {
  return {
    id: row.id,
    patientName: patientName(student, row.student_id),
    studentId: row.student_id ?? "—",
    service: row.service?.trim() || row.consultation_type?.trim() || "Consultation",
    preferredDate: row.appointment_date ?? "—",
    preferredTime: row.appointment_time ?? "—",
    reason: row.purpose?.trim() || "—",
    status: normalizeStatus(row.status),
    submittedAt: row.created_at,
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

  if (error) mapError(error)
  for (const row of data ?? []) {
    map.set(row.student_id as string, row as StudentRow)
  }
  return map
}

async function fetchRequestRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("health_appointments")
    .select(
      "id, student_id, appointment_date, appointment_time, status, purpose, service, consultation_type, workflow_status, created_at"
    )
    .not("consultation_type", "ilike", "%walk%")
    .order("created_at", { ascending: false })

  if (error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes("schema cache") ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table")
    ) {
      return [] as AppointmentRow[]
    }
    mapError(error)
  }

  return (data ?? []) as AppointmentRow[]
}

export async function getConsultationRequests(
  params: ConsultationRequestListParams = {},
  client?: SupabaseClient
): Promise<ConsultationRequestListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const query = params.query?.trim().toLowerCase() ?? ""
  const status = params.status ?? "all"

  const rows = await fetchRequestRows(supabase)
  const students = await loadStudents(
    supabase,
    [...new Set(rows.map((r) => r.student_id).filter(Boolean) as string[])]
  )

  let items = rows
    .filter((row) => {
      const normalized = normalizeStatus(row.status)
      return REQUEST_STATUSES.has(normalized)
    })
    .map((row) =>
      mapRequest(row, row.student_id ? students.get(row.student_id) ?? null : null)
    )

  if (status !== "all") {
    items = items.filter((item) => item.status === status)
  }

  if (query) {
    items = items.filter((item) => {
      const haystack = [
        item.patientName,
        item.studentId,
        item.service,
        item.reason,
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

export async function getConsultationRequestStats(
  client?: SupabaseClient
): Promise<ConsultationRequestStats> {
  const supabase = await getClient(client)
  const { startIso, endIso } = manilaDayBounds()
  const rows = await fetchRequestRows(supabase)

  let pending = 0
  let approvedToday = 0
  let rescheduled = 0
  let declined = 0

  for (const row of rows) {
    const status = normalizeStatus(row.status)
    if (status === "pending") pending += 1
    if (status === "rescheduled") rescheduled += 1
    if (status === "declined") declined += 1
    if (
      status === "approved" &&
      row.created_at >= startIso &&
      row.created_at <= endIso
    ) {
      approvedToday += 1
    }
  }

  return { pending, approvedToday, rescheduled, declined }
}

async function ensureQueueTicket(
  supabase: SupabaseClient,
  appointmentId: string
) {
  const { data: existing } = await supabase
    .from("health_queue_tickets")
    .select("id")
    .or(
      `health_appointment_id.eq.${appointmentId},appointment_id.eq.${appointmentId}`
    )
    .limit(1)
    .maybeSingle()

  if (existing?.id) return

  const { data: posRows } = await supabase
    .from("health_queue_tickets")
    .select("queue_position, queue_number")
    .in("status", ["waiting", "called"])

  const nextPos =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_position ?? 0)) + 1
  const nextNum =
    Math.max(0, ...(posRows ?? []).map((r) => r.queue_number ?? 0)) + 1

  await supabase.from("health_queue_tickets").insert({
    appointment_id: appointmentId,
    health_appointment_id: appointmentId,
    ticket_code: `RQ-${String(nextNum).padStart(4, "0")}`,
    queue_position: nextPos,
    queue_number: nextNum,
    estimated_wait_minutes: nextPos * 10,
    status: "waiting",
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  })
}

export async function approveConsultationRequest(
  id: string,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const supabase = await getClient(client)
  if (!id) {
    throw new ConsultationRequestServiceError("validation", "Request id is required.")
  }

  const { data, error } = await supabase
    .from("health_appointments")
    .update({
      status: "approved",
      workflow_status: "checkin_window_open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, student_id, appointment_date, appointment_time, status, purpose, service, consultation_type, workflow_status, created_at"
    )
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Request not found.")
  }

  await ensureQueueTicket(supabase, id)

  const students = await loadStudents(
    supabase,
    data.student_id ? [data.student_id] : []
  )

  return mapRequest(
    data as AppointmentRow,
    data.student_id ? students.get(data.student_id) ?? null : null
  )
}

export async function declineConsultationRequest(
  id: string,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const supabase = await getClient(client)
  if (!id) {
    throw new ConsultationRequestServiceError("validation", "Request id is required.")
  }

  const { data, error } = await supabase
    .from("health_appointments")
    .update({
      status: "declined",
      workflow_status: "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, student_id, appointment_date, appointment_time, status, purpose, service, consultation_type, workflow_status, created_at"
    )
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Request not found.")
  }

  const students = await loadStudents(
    supabase,
    data.student_id ? [data.student_id] : []
  )

  return mapRequest(
    data as AppointmentRow,
    data.student_id ? students.get(data.student_id) ?? null : null
  )
}

export async function rescheduleConsultationRequest(
  input: RescheduleConsultationRequestInput,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const supabase = await getClient(client)
  if (!input.id) {
    throw new ConsultationRequestServiceError("validation", "Request id is required.")
  }
  if (!input.appointmentDate.trim()) {
    throw new ConsultationRequestServiceError(
      "validation",
      "Choose a new appointment date."
    )
  }

  const { data, error } = await supabase
    .from("health_appointments")
    .update({
      status: "rescheduled",
      appointment_date: input.appointmentDate.trim(),
      appointment_time: input.appointmentTime.trim() || null,
      workflow_status: "booked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(
      "id, student_id, appointment_date, appointment_time, status, purpose, service, consultation_type, workflow_status, created_at"
    )
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Request not found.")
  }

  const students = await loadStudents(
    supabase,
    data.student_id ? [data.student_id] : []
  )

  return mapRequest(
    data as AppointmentRow,
    data.student_id ? students.get(data.student_id) ?? null : null
  )
}

export async function getConsultationRequestById(
  id: string,
  client?: SupabaseClient
): Promise<ConsultationRequest> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("health_appointments")
    .select(
      "id, student_id, appointment_date, appointment_time, status, purpose, service, consultation_type, workflow_status, created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new ConsultationRequestServiceError("not_found", "Request not found.")
  }

  const students = await loadStudents(
    supabase,
    data.student_id ? [data.student_id as string] : []
  )

  return mapRequest(
    data as AppointmentRow,
    data.student_id
      ? students.get(data.student_id as string) ?? null
      : null
  )
}
