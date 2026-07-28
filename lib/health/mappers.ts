import type {
  QueueTicketRow,
  QueueVitals,
  StationId,
  TicketStatus,
} from "@/lib/health/types"

const TICKET_STATUSES: TicketStatus[] = [
  "waiting",
  "called",
  "completed",
  "expired",
  "no_show",
]

export type RawQueueTicket = {
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
  patient_id: string | null
  station: string | null
  call_count: number | null
  rejoin_count: number | null
  patient_name: string | null
  campus_id: string | null
  consultation_type: string | null
  assigned_staff_name: string | null
  chief_complaint: string | null
  vitals_bp_systolic: number | null
  vitals_bp_diastolic: number | null
  vitals_heart_rate: number | null
  vitals_temperature_c: number | null
  vitals_spo2: number | null
  intake_notes: string | null
  intake_completed_at: string | null
  patients?:
    | {
        id: string
        full_name: string | null
        student_id: string | null
        employee_id: string | null
        patient_type: string | null
      }
    | {
        id: string
        full_name: string | null
        student_id: string | null
        employee_id: string | null
        patient_type: string | null
      }[]
    | null
}

function asStation(value: string | null | undefined): StationId {
  if (value === "physician" || value === "dentist" || value === "nurse") {
    return value
  }
  return "nurse"
}

function asStatus(value: string): TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus)
    ? (value as TicketStatus)
    : "waiting"
}

function patientJoin(raw: RawQueueTicket["patients"]) {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

function campusIdFromPatient(patient: {
  patient_type: string | null
  student_id: string | null
  employee_id: string | null
} | null): string | null {
  if (!patient) return null
  if (patient.patient_type === "faculty") {
    return patient.employee_id ?? patient.student_id
  }
  return patient.student_id ?? patient.employee_id
}

export function formatPatientName(
  fullName: string | null | undefined,
  publicMode = false
) {
  const name = (fullName ?? "").trim()
  if (!name) return "Patient"
  if (!publicMode) return name
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "Patient"
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1]?.charAt(0) ?? ""}.`
}

export function ticketLabel(queueNumber: number | null, ticketCode: string) {
  if (queueNumber != null) {
    return String(queueNumber).padStart(4, "0")
  }
  return ticketCode
}

export function mapTicketRow(
  raw: RawQueueTicket,
  opts?: { publicMode?: boolean }
): QueueTicketRow {
  const patient = patientJoin(raw.patients)
  const station = asStation(raw.station)
  const campusId =
    raw.campus_id ?? campusIdFromPatient(patient) ?? null
  const patientName = opts?.publicMode
    ? campusId || ticketLabel(raw.queue_number, raw.ticket_code)
    : raw.patient_name ||
      formatPatientName(patient?.full_name) ||
      "Patient"

  const vitals: QueueVitals = {
    bpSystolic: raw.vitals_bp_systolic,
    bpDiastolic: raw.vitals_bp_diastolic,
    heartRate: raw.vitals_heart_rate,
    temperatureC:
      raw.vitals_temperature_c == null
        ? null
        : Number(raw.vitals_temperature_c),
    spo2: raw.vitals_spo2,
  }

  const status = asStatus(raw.status)
  const rejoinCount = raw.rejoin_count ?? 0

  return {
    ticketId: raw.id,
    appointmentId:
      raw.health_appointment_id ?? raw.appointment_id ?? null,
    ticketCode: raw.ticket_code,
    queueNumber: raw.queue_number,
    queuePosition: raw.queue_position,
    status,
    estimatedWaitMinutes: raw.estimated_wait_minutes,
    checkedInAt: raw.checked_in_at,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
    patientId: raw.patient_id ?? patient?.id ?? null,
    patientName,
    studentId: campusId,
    campusId,
    consultationType: raw.consultation_type ?? "Consultation",
    service: raw.consultation_type,
    providerQueue: station === "nurse" ? null : station,
    workflowStatus:
      station === "nurse"
        ? "queued_for_nurse"
        : status === "called"
          ? "provider_in_progress"
          : status === "completed"
            ? "completed"
            : "queued_for_specialty",
    assignedPersonnel: raw.assigned_staff_name,
    station,
    callCount: raw.call_count ?? 0,
    rejoinCount,
    canRejoin: status === "no_show" && rejoinCount < 1,
    intakeCompletedAt: raw.intake_completed_at,
    chiefComplaint: raw.chief_complaint,
    vitals,
    intakeNotes: raw.intake_notes,
    priority: "normal",
  }
}

/** @deprecated Station now lives on the ticket; kept for older call sites. */
export function resolveStation(input: {
  providerQueue: string | null | undefined
  workflowStatus: string | null | undefined
}): StationId {
  const pq = (input.providerQueue ?? "").toLowerCase()
  if (pq === "dentist") return "dentist"
  if (pq === "physician") return "physician"
  return "nurse"
}
