import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { getStaffAccess } from "@/lib/auth/access"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { can } from "@/lib/auth/permissions"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  recommendComeEarly,
  type ConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import { createClient } from "@/lib/supabase/server"
import {
  admitWaitlistedAppointment,
  approveAppointmentReservation,
  releaseAppointmentReservation,
  rescheduleAppointmentReservation,
} from "@/lib/health/appointment-queue-actions"
import {
  APPOINTMENT_REQUEST_STATUSES,
  AppointmentRequestServiceError,
  type AdmitAppointmentRequestInput,
  type AppointmentRequest,
  type AppointmentRequestListParams,
  type AppointmentRequestListResult,
  type AppointmentRequestStats,
  type AppointmentRequestStatus,
  type ApproveAppointmentRequestInput,
  type DeclineAppointmentRequestInput,
  type RescheduleAppointmentRequestInput,
} from "@/types/appointmentRequest"

const DEFAULT_PAGE_SIZE = 20

type AppointmentRow = {
  id: string
  clinic_id: string | null
  doctor_id: string | null
  patient_id: string | null
  starts_at: string
  ends_at: string
  status: string
  reason: string | null
  location: string | null
  cancellation_reason: string | null
  provider_type: string | null
  queue_number: number | null
  queue_ticket_id: string | null
  waitlisted_at: string | null
  created_at: string
  updated_at: string
  patients:
    | {
        full_name: string | null
        student_id: string | null
        employee_id: string | null
        patient_type: string | null
        email: string | null
        phone: string | null
      }
    | {
        full_name: string | null
        student_id: string | null
        employee_id: string | null
        patient_type: string | null
        email: string | null
        phone: string | null
      }[]
    | null
  doctor:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null
}

function patientJoin(value: AppointmentRow["patients"]) {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function doctorJoin(value: AppointmentRow["doctor"]) {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function isStatus(value: string): value is AppointmentRequestStatus {
  return (APPOINTMENT_REQUEST_STATUSES as readonly string[]).includes(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new AppointmentRequestServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new AppointmentRequestServiceError(
      "permission",
      "You do not have permission to manage appointment requests."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new AppointmentRequestServiceError(
      "not_found",
      "Appointment request not found."
    )
  }
  throw new AppointmentRequestServiceError(
    "database",
    error.message || "A database error occurred."
  )
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function requireStaffActor() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    throw new AppointmentRequestServiceError(
      "permission",
      "You must be signed in as clinic staff."
    )
  }
  if (!can(access.designation, "requests.table")) {
    throw new AppointmentRequestServiceError(
      "permission",
      "You do not have permission to manage consultation requests."
    )
  }
  return {
    userId: access.userId,
    fullName: access.fullName || access.email || "Clinic staff",
    designation: access.designation,
  }
}

function manilaParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
  return { date, time }
}

function mapRow(row: AppointmentRow): AppointmentRequest {
  if (!isStatus(row.status)) {
    throw new AppointmentRequestServiceError(
      "database",
      `Unexpected appointment status: ${row.status}`
    )
  }
  const patient = patientJoin(row.patients)
  const doctor = doctorJoin(row.doctor)
  const providerType: ConsultationProviderType =
    row.provider_type === "dentist" ? "dentist" : "physician"
  const campusId =
    patient?.patient_type === "faculty"
      ? (patient.employee_id ?? patient.student_id)
      : (patient?.student_id ?? patient?.employee_id ?? null)
  const { date, time } = manilaParts(row.starts_at)

  return {
    id: row.id,
    clinicId: row.clinic_id,
    doctorId: row.doctor_id,
    doctorName: doctor?.full_name ?? null,
    patientId: row.patient_id,
    patientName: patient?.full_name?.trim() || "Unknown patient",
    studentId: campusId,
    email: patient?.email ?? null,
    phone: patient?.phone ?? null,
    providerType,
    service:
      providerType === "dentist" ? "Dental consultation" : "General consultation",
    preferredDate: date,
    preferredTime: time,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason?.trim() || "",
    status: row.status,
    location: row.location,
    cancellationReason: row.cancellation_reason,
    queueTicketId: row.queue_ticket_id,
    queueNumber: row.queue_number,
    waitlistedAt: row.waitlisted_at,
    recommendComeEarly: recommendComeEarly(row.queue_number),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const SELECT_WITH_JOINS = `
  id, clinic_id, doctor_id, patient_id, starts_at, ends_at, status, reason,
  location, cancellation_reason, provider_type, queue_number, queue_ticket_id,
  waitlisted_at, created_at, updated_at,
  patients:patient_id ( full_name, student_id, employee_id, patient_type, email, phone ),
  doctor:users!doctor_id ( full_name, email )
`

function matchesQuery(item: AppointmentRequest, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    item.patientName,
    item.studentId,
    item.email,
    item.phone,
    item.service,
    item.reason,
    item.doctorName,
    item.status,
    item.queueNumber != null ? String(item.queueNumber) : "",
  ]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q))
}

export async function getAppointmentRequests(
  params: AppointmentRequestListParams = {},
  client?: SupabaseClient
): Promise<AppointmentRequestListResult> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const status = params.status ?? "all"

  let request = supabase
    .from("appointments")
    .select(SELECT_WITH_JOINS)
    .order("starts_at", { ascending: false })

  if (status !== "all") {
    request = request.eq("status", status)
  }

  const { data, error } = await request
  if (error) mapError(error)

  let items = (data ?? []).map((row) => mapRow(row as unknown as AppointmentRow))
  if (params.query?.trim()) {
    items = items.filter((item) => matchesQuery(item, params.query!))
  }

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export async function getAppointmentRequestStats(
  client?: SupabaseClient
): Promise<AppointmentRequestStats> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase.from("appointments").select("status")
  if (error) mapError(error)

  const stats: AppointmentRequestStats = {
    pending: 0,
    confirmed: 0,
    waitlisted: 0,
    rescheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    total: (data ?? []).length,
  }

  for (const row of data ?? []) {
    const status = row.status as AppointmentRequestStatus
    if (status in stats && status !== ("total" as never)) {
      stats[status] += 1
    }
  }
  return stats
}

export async function getAppointmentRequestById(
  id: string,
  client?: SupabaseClient
): Promise<AppointmentRequest> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new AppointmentRequestServiceError(
      "not_found",
      "Appointment request not found."
    )
  }
  return mapRow(data as unknown as AppointmentRow)
}

export async function approveAppointmentRequestRecord(
  input: ApproveAppointmentRequestInput,
  client?: SupabaseClient
): Promise<AppointmentRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.approve")) {
    throw new AppointmentRequestServiceError(
      "permission",
      "Only nurses can approve appointment requests."
    )
  }

  const supabase = await getClient(client)
  const existing = await getAppointmentRequestById(input.id, supabase)

  const queueResult = await approveAppointmentReservation({
    designation: actor.designation as "nurse",
    appointmentId: existing.id,
    staffName: actor.fullName,
  })

  if (!queueResult.ok) {
    throw new AppointmentRequestServiceError(
      "database",
      queueResult.error || "Failed to approve the appointment."
    )
  }

  const patch: Record<string, unknown> = {
    status: "confirmed",
    location: input.location?.trim() || existing.location,
    updated_at: new Date().toISOString(),
  }
  if (input.doctorId) patch.doctor_id = input.doctorId
  if (input.scheduleAt) {
    const start = new Date(input.scheduleAt)
    patch.starts_at = start.toISOString()
    patch.ends_at = new Date(start.getTime() + 30 * 60 * 1000).toISOString()
  }

  const { error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", input.id)

  if (error) mapError(error)
  return getAppointmentRequestById(input.id, supabase)
}

export async function declineAppointmentRequestRecord(
  input: DeclineAppointmentRequestInput,
  client?: SupabaseClient
): Promise<AppointmentRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.decline")) {
    throw new AppointmentRequestServiceError(
      "permission",
      "Only nurses can decline appointment requests."
    )
  }
  const reason = input.reason.trim()
  if (!reason) {
    throw new AppointmentRequestServiceError(
      "validation",
      "A decline reason is required."
    )
  }

  const supabase = await getClient(client)
  const existing = await getAppointmentRequestById(input.id, supabase)
  await releaseAppointmentReservation({
    appointmentId: existing.id,
    ticketId: existing.queueTicketId,
  })

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      queue_ticket_id: null,
      queue_number: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) mapError(error)
  return getAppointmentRequestById(input.id, supabase)
}

export async function rescheduleAppointmentRequestRecord(
  input: RescheduleAppointmentRequestInput,
  client?: SupabaseClient
): Promise<AppointmentRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.reschedule")) {
    throw new AppointmentRequestServiceError(
      "permission",
      "Only nurses can reschedule appointment requests."
    )
  }
  const reason = input.reason.trim()
  if (!reason) {
    throw new AppointmentRequestServiceError(
      "validation",
      "A reschedule reason is required."
    )
  }
  if (!input.preferredDate.trim() || !input.preferredTime.trim()) {
    throw new AppointmentRequestServiceError(
      "validation",
      "New date and time are required."
    )
  }

  const supabase = await getClient(client)
  const result = await rescheduleAppointmentReservation({
    appointmentId: input.id,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    reason,
    staffName: actor.fullName,
  })

  if (!result.ok) {
    throw new AppointmentRequestServiceError(
      "database",
      result.error || "Failed to reschedule."
    )
  }

  return getAppointmentRequestById(input.id, supabase)
}

export async function admitAppointmentRequestRecord(
  input: AdmitAppointmentRequestInput,
  client?: SupabaseClient
): Promise<AppointmentRequest> {
  const actor = await requireStaffActor()
  if (!can(actor.designation as ClinicDesignation, "requests.approve")) {
    throw new AppointmentRequestServiceError(
      "permission",
      "Only nurses can admit waitlisted appointments."
    )
  }

  const supabase = await getClient(client)
  const result = await admitWaitlistedAppointment({
    designation: actor.designation as "nurse",
    appointmentId: input.id,
    staffName: actor.fullName,
    force: input.force ?? true,
  })

  if (!result.ok) {
    throw new AppointmentRequestServiceError(
      "database",
      result.error || "Failed to admit waitlisted appointment."
    )
  }

  return getAppointmentRequestById(input.id, supabase)
}

export async function listAssignableDoctorsForAppointments(
  client?: SupabaseClient
): Promise<{ id: string; fullName: string; email: string | null }[]> {
  await requireStaffActor()
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("primary_role", ["physician", "dentist"])
    .order("full_name", { ascending: true })

  if (error) mapError(error)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: (row.full_name as string) || (row.email as string),
    email: (row.email as string | null) ?? null,
  }))
}

export async function ensureCampusClinicId() {
  return CAMPUS_CLINIC_ID
}

/** Build starts_at / ends_at ISO from Manila date + HH:mm */
export function manilaDateTimeToIso(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}+08:00`).toISOString()
}
