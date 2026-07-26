import type { StationId, TicketStatus, QueueTicketRow } from "@/lib/health/types"

type RawTicketJoin = {
  id: string
  ticket_code: string
  queue_position: number
  queue_number: number | null
  status: string
  estimated_wait_minutes: number | null
  checked_in_at: string | null
  updated_at: string | null
  created_at: string | null
  appointment_id: string | null
  health_appointment_id: string | null
  appointment?: {
    id: string
    student_id: string | null
    workflow_status: string | null
    provider_queue: string | null
    consultation_type: string | null
    service: string | null
    doctor: string | null
    purpose: string | null
    status: string | null
  } | null
  student?: {
    first_name: string | null
    last_name: string | null
    student_id: string | null
  } | null
}

export function resolveStation(input: {
  providerQueue: string | null | undefined
  workflowStatus: string | null | undefined
}): StationId {
  const pq = (input.providerQueue ?? "").toLowerCase()
  if (pq === "dentist") return "dentist"
  if (pq === "physician") return "physician"

  const wf = (input.workflowStatus ?? "").toLowerCase()
  if (
    wf === "queued_for_nurse" ||
    wf === "checkin_window_open" ||
    wf === "booked" ||
    !pq
  ) {
    return "nurse"
  }

  return "nurse"
}

export function formatPatientName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  publicMode = false
) {
  const first = (firstName ?? "").trim()
  const last = (lastName ?? "").trim()
  if (!first && !last) return "Patient"
  if (publicMode) {
    if (!first) return "Patient"
    return last ? `${first} ${last.charAt(0)}.` : first
  }
  return [first, last].filter(Boolean).join(" ")
}

export function ticketLabel(queueNumber: number | null, ticketCode: string) {
  if (queueNumber != null) {
    return String(queueNumber).padStart(4, "0")
  }
  return ticketCode
}

export function mapTicketRow(
  raw: RawTicketJoin,
  opts?: { publicMode?: boolean }
): QueueTicketRow {
  const appointment = raw.appointment ?? null
  const student = raw.student ?? null
  const station = resolveStation({
    providerQueue: appointment?.provider_queue,
    workflowStatus: appointment?.workflow_status,
  })

  const status = (["waiting", "called", "completed", "expired"].includes(
    raw.status
  )
    ? raw.status
    : "waiting") as TicketStatus

  return {
    ticketId: raw.id,
    appointmentId:
      raw.health_appointment_id ?? raw.appointment_id ?? appointment?.id ?? null,
    ticketCode: raw.ticket_code,
    queueNumber: raw.queue_number,
    queuePosition: raw.queue_position,
    status,
    estimatedWaitMinutes: raw.estimated_wait_minutes,
    checkedInAt: raw.checked_in_at,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
    patientName: formatPatientName(
      student?.first_name,
      student?.last_name,
      opts?.publicMode
    ),
    studentId: appointment?.student_id ?? student?.student_id ?? null,
    consultationType:
      appointment?.consultation_type ??
      appointment?.service ??
      appointment?.purpose ??
      "Consultation",
    service: appointment?.service ?? null,
    providerQueue: (appointment?.provider_queue as StationId | null) ?? null,
    workflowStatus: appointment?.workflow_status ?? null,
    assignedPersonnel: appointment?.doctor ?? null,
    station,
    priority: "normal",
  }
}
