import type { QueueTicketRow } from "@/lib/health/types"

const SAMPLE_PREFIX = "sample-upcoming-"

/** Session-stable sample appointments (relative times fixed at first call). */
let sessionSamples: QueueTicketRow[] | null = null

export function isSampleScheduledTicketId(ticketId: string): boolean {
  return ticketId.startsWith(SAMPLE_PREFIX)
}

function emptyVitals(): QueueTicketRow["vitals"] {
  return {
    bpSystolic: null,
    bpDiastolic: null,
    heartRate: null,
    temperatureC: null,
    spo2: null,
    heightCm: null,
    weightKg: null,
    respiratoryRate: null,
  }
}

function sampleTicket(
  index: number,
  startsAt: Date,
  patientName: string,
  campusId: string,
  providerType: "physician" | "dentist",
  queuePosition: number
): QueueTicketRow {
  const iso = startsAt.toISOString()
  return {
    ticketId: `${SAMPLE_PREFIX}${index}`,
    appointmentId: `${SAMPLE_PREFIX}appt-${index}`,
    appointmentStartsAt: iso,
    ticketCode: `S-${100 + index}`,
    queueNumber: 100 + index,
    queuePosition,
    status: "waiting",
    estimatedWaitMinutes: Math.max(
      0,
      Math.round((startsAt.getTime() - Date.now()) / 60_000)
    ),
    checkedInAt: null,
    updatedAt: iso,
    createdAt: iso,
    patientId: null,
    patientName,
    patientAvatarUrl: null,
    patientType: "student",
    studentId: campusId,
    campusId,
    consultationType: "Scheduled consultation",
    service: providerType === "dentist" ? "Dental" : "Medical",
    providerQueue: "nurse",
    workflowStatus: "waiting",
    assignedPersonnel: null,
    station: "nurse",
    callCount: 0,
    rejoinCount: 0,
    canRejoin: false,
    intakeCompletedAt: null,
    chiefComplaint: null,
    vitals: emptyVitals(),
    intakeNotes: "Sample scheduled appointment (demo)",
    priority: "normal",
    consultationRequestId: null,
    consultationId: null,
    providerType,
  }
}

/**
 * Demo scheduled rows for Upcoming → Waiting (T−15) local flow.
 * Times are relative to the first call in this browser session.
 */
export function getSessionSampleScheduledAppointments(
  now: Date = new Date()
): QueueTicketRow[] {
  if (sessionSamples) return sessionSamples

  const base = now.getTime()
  sessionSamples = [
    // Already inside the 15-minute window → Waiting / Needs verification
    sampleTicket(
      1,
      new Date(base + 5 * 60_000),
      "Aria Mendoza",
      "2024-100101",
      "physician",
      901
    ),
    // Upcoming (promotes later)
    sampleTicket(
      2,
      new Date(base + 25 * 60_000),
      "Luis Navarro",
      "2024-100102",
      "physician",
      902
    ),
    sampleTicket(
      3,
      new Date(base + 45 * 60_000),
      "Sofia Reyes",
      "2023-100203",
      "dentist",
      903
    ),
    sampleTicket(
      4,
      new Date(base + 90 * 60_000),
      "Ethan Cruz",
      "2022-100304",
      "physician",
      904
    ),
  ]
  return sessionSamples
}

/** Merge session samples into fetched tickets (samples win on id clash). */
export function mergeSampleScheduledAppointments(
  tickets: QueueTicketRow[],
  now: Date = new Date()
): QueueTicketRow[] {
  const samples = getSessionSampleScheduledAppointments(now)
  const withoutSamples = tickets.filter(
    (row) => !isSampleScheduledTicketId(row.ticketId)
  )
  return [...withoutSamples, ...samples]
}
