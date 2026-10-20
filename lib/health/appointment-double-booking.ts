import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Open visit / request statuses that block a new patient booking
 * for the same clinic + specialty (real-world: one active request at a time).
 */
export const BLOCK_SUBMIT_STATUSES = [
  "pending",
  "waitlisted",
  "rescheduled",
  "confirmed",
  "in_progress",
] as const

/**
 * Sibling requests still in the nurse triage queue — auto-declined when
 * another request for the same patient + specialty is approved/admitted.
 */
export const DUPLICATE_DECLINE_STATUSES = [
  "pending",
  "waitlisted",
  "rescheduled",
] as const

export const DOUBLE_BOOKING_CODE = "double_booking" as const

export const DUPLICATE_DECLINE_REASON =
  "Duplicate booking — another consultation request for this specialty was already approved."

export type OpenBookingHit = {
  id: string
  status: string
  startsAt: string
  patientId: string | null
}

export class DoubleBookingError extends Error {
  readonly code = DOUBLE_BOOKING_CODE
  readonly existingAppointmentId: string
  readonly existingStatus: string

  constructor(hit: OpenBookingHit) {
    super(doubleBookingUserMessage(hit.status))
    this.name = "DoubleBookingError"
    this.existingAppointmentId = hit.id
    this.existingStatus = hit.status
  }
}

export function doubleBookingUserMessage(existingStatus: string): string {
  switch (existingStatus) {
    case "pending":
      return "You already have a pending consultation request for this specialty. Wait for nurse review or cancel it before booking again."
    case "waitlisted":
      return "You are already on the waitlist for this specialty. Wait for an opening or cancel that request before booking again."
    case "rescheduled":
      return "You already have a rescheduled consultation request for this specialty. Wait for nurse review before booking again."
    case "confirmed":
    case "in_progress":
      return "You already have an active consultation for this specialty. Finish or cancel it before booking again."
    default:
      return "You already have an open consultation request for this specialty."
  }
}

export function isDoubleBookingError(
  error: unknown
): error is DoubleBookingError {
  return (
    error instanceof DoubleBookingError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === DOUBLE_BOOKING_CODE)
  )
}

async function resolvePatientIds(
  client: SupabaseClient,
  params: {
    patientId?: string | null
    studentId?: string | null
  }
): Promise<string[]> {
  const ids = new Set<string>()
  if (params.patientId?.trim()) ids.add(params.patientId.trim())

  const studentId = params.studentId?.trim()
  if (studentId) {
    const { data } = await client
      .from("patients")
      .select("id")
      .or(`student_id.eq.${studentId},employee_id.eq.${studentId}`)
      .limit(5)
    for (const row of data ?? []) {
      if (row?.id) ids.add(row.id as string)
    }
  }

  return [...ids]
}

/**
 * Returns the earliest open booking that would conflict with a new submit.
 */
export async function findConflictingOpenBooking(
  client: SupabaseClient,
  params: {
    clinicId: string
    providerType: string
    patientId?: string | null
    studentId?: string | null
    excludeAppointmentId?: string | null
  }
): Promise<OpenBookingHit | null> {
  const patientIds = await resolvePatientIds(client, params)
  if (patientIds.length === 0) return null

  let query = client
    .from("appointments")
    .select("id, status, starts_at, patient_id")
    .eq("clinic_id", params.clinicId)
    .eq("provider_type", params.providerType)
    .in("status", [...BLOCK_SUBMIT_STATUSES])
    .in("patient_id", patientIds)
    .order("starts_at", { ascending: true })
    .limit(5)

  if (params.excludeAppointmentId) {
    query = query.neq("id", params.excludeAppointmentId)
  }

  const { data, error } = await query
  if (error) throw error
  const row = data?.[0]
  if (!row) return null

  return {
    id: row.id as string,
    status: row.status as string,
    startsAt: row.starts_at as string,
    patientId: (row.patient_id as string | null) ?? null,
  }
}

export async function assertNoDoubleBooking(
  client: SupabaseClient,
  params: {
    clinicId: string
    providerType: string
    patientId?: string | null
    studentId?: string | null
    excludeAppointmentId?: string | null
  }
): Promise<void> {
  const hit = await findConflictingOpenBooking(client, params)
  if (hit) throw new DoubleBookingError(hit)
}

/**
 * When nurse approves/admits one request, cancel other triage-queue duplicates
 * for the same patient + specialty so the queue stays clean.
 */
export async function declineDuplicateOpenBookings(
  client: SupabaseClient,
  params: {
    clinicId: string
    providerType: string
    patientId?: string | null
    keepAppointmentId: string
    reason?: string
  }
): Promise<string[]> {
  if (!params.patientId) return []

  const { data, error } = await client
    .from("appointments")
    .select("id, queue_ticket_id")
    .eq("clinic_id", params.clinicId)
    .eq("provider_type", params.providerType)
    .eq("patient_id", params.patientId)
    .in("status", [...DUPLICATE_DECLINE_STATUSES])
    .neq("id", params.keepAppointmentId)

  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const now = new Date().toISOString()
  const reason = params.reason?.trim() || DUPLICATE_DECLINE_REASON
  const declinedIds: string[] = []

  for (const row of rows) {
    const id = row.id as string
    const ticketId = row.queue_ticket_id as string | null
    if (ticketId) {
      await client
        .from("health_queue_tickets")
        .update({ status: "expired", updated_at: now })
        .eq("id", ticketId)
    }
    const { error: updateError } = await client
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        queue_ticket_id: null,
        queue_number: null,
        updated_at: now,
      })
      .eq("id", id)
    if (!updateError) declinedIds.push(id)
  }

  return declinedIds
}
