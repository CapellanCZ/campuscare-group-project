import {
  isAppointmentEligibleForQueue,
  isUpcomingScheduledAppointment,
} from "@/lib/health/appointment-queue-eligibility"
import { isTicketReleasedToQueue } from "@/lib/health/queue-ready"
import type { QueueTicketRow } from "@/lib/health/types"

export type NurseQueueLane = "needs_intake" | "at_specialty" | "exceptions"

/**
 * Nurse-station patients who still need vitals / specialty assign.
 * Do not require checkedInAt: appointment/waitlist tickets arrive unchecked-in,
 * and verifyCheckIn moves status to ongoing while intake is still pending.
 */
export function needsNurseIntake(row: QueueTicketRow): boolean {
  return (
    row.station === "nurse" &&
    !row.intakeCompletedAt &&
    (row.status === "waiting" ||
      row.status === "called" ||
      row.status === "ongoing")
  )
}

export function isWalkInTicket(row: QueueTicketRow): boolean {
  return (row.consultationType ?? "").toLowerCase().includes("walk")
}

export function isScheduledTicket(row: QueueTicketRow): boolean {
  return Boolean(row.appointmentId) && !isWalkInTicket(row)
}

/**
 * Timed appointment (e.g. 11:15). Walk-ins / unscheduled tickets have null startsAt.
 */
export function hasScheduledStartTime(
  row: Pick<QueueTicketRow, "appointmentStartsAt">
): boolean {
  return Boolean(row.appointmentStartsAt)
}

/**
 * Scheduled start is inside the Waiting window (startsAt − earlyEntryMinutes ≤ now).
 */
export function isScheduledStartDue(
  row: Pick<QueueTicketRow, "appointmentStartsAt">,
  now: Date = new Date(),
  earlyEntryMinutes?: number
): boolean {
  return (
    hasScheduledStartTime(row) &&
    isAppointmentEligibleForQueue(
      row.appointmentStartsAt,
      now,
      earlyEntryMinutes
    )
  )
}

/**
 * Timed appointments still in Upcoming (before the early-entry window).
 * At the window they leave this list and appear under Waiting for verify.
 */
export function isUpcomingScheduledNurseAppointment(
  row: QueueTicketRow,
  now: Date = new Date(),
  earlyEntryMinutes?: number
): boolean {
  // Nurse already placed them in Waiting — leave Upcoming.
  if (isTicketReleasedToQueue(row.intakeNotes)) return false
  return (
    needsNurseIntake(row) &&
    hasScheduledStartTime(row) &&
    !isWalkInTicket(row) &&
    isUpcomingScheduledAppointment(
      row.appointmentStartsAt,
      now,
      earlyEntryMinutes
    )
  )
}

/**
 * @deprecated Prefer isUpcomingScheduledNurseAppointment — Upcoming is not “due intake”.
 */
export function needsDueScheduledNurseIntake(
  row: QueueTicketRow,
  now: Date = new Date(),
  earlyEntryMinutes?: number
): boolean {
  return isUpcomingScheduledNurseAppointment(row, now, earlyEntryMinutes)
}

/** Waiting window, walk-in, or nurse released the ticket early. */
export function isQueueTimeEligible(
  row: Pick<QueueTicketRow, "appointmentStartsAt" | "intakeNotes">,
  now: Date = new Date(),
  earlyEntryMinutes?: number
): boolean {
  if (isTicketReleasedToQueue(row.intakeNotes)) return true
  return isAppointmentEligibleForQueue(
    row.appointmentStartsAt,
    now,
    earlyEntryMinutes
  )
}

export function canOpenNurseIntake(
  row: QueueTicketRow,
  now: Date = new Date()
): boolean {
  // Emergencies skip check-in — intake must stay one tap away.
  // Walk-ins and scheduled visits need verify first (Patients panel).
  const checkInOk =
    row.priority === "urgent" || Boolean(row.checkedInAt)
  return (
    needsNurseIntake(row) &&
    isQueueTimeEligible(row, now) &&
    checkInOk
  )
}

/** Nurse has called / recalled this ticket at least once. */
export function hasNurseCalledPatient(row: QueueTicketRow): boolean {
  return row.callCount >= 1 || row.status === "called"
}

/** Patient still needs check-in verification before intake. */
export function needsCheckInVerify(
  row: QueueTicketRow,
  now: Date = new Date()
): boolean {
  if (row.checkedInAt) return false
  if (!needsNurseIntake(row)) return false
  if (!isQueueTimeEligible(row, now)) return false
  // Button shows in Waiting; stays disabled until the nurse has called.
  return true
}

/**
 * Verified patients live in the Patients panel (not Waiting / Emergencies).
 * Walk-ins start in Waiting until check-in is verified.
 */
export function isVerifiedNursePatient(row: QueueTicketRow): boolean {
  return Boolean(row.checkedInAt) && needsNurseIntake(row)
}

/** Stable person key for nurse-list dedupe (patient id → campus id → name). */
export function nursePatientDedupeKey(row: QueueTicketRow): string {
  return (
    row.patientId ||
    row.campusId ||
    row.studentId ||
    row.patientName
  )
    .trim()
    .toLowerCase()
}

/** Drop exact ticket-id clones from local SoT / fetch merges. */
export function dedupeTicketsById(rows: QueueTicketRow[]): QueueTicketRow[] {
  const byId = new Map<string, QueueTicketRow>()
  for (const row of rows) {
    if (!row.ticketId) continue
    byId.set(row.ticketId, row)
  }
  return [...byId.values()]
}

/**
 * One row per person — keep the newest ticket if they were registered twice.
 * Use on Patients / Waiting / Emergencies so doubles never surface in the UI.
 */
export function nursePatientRecencyIso(row: QueueTicketRow): string {
  return row.checkedInAt ?? row.updatedAt ?? row.createdAt ?? ""
}

/** Emergencies first, then oldest verified/check-in first (FIFO). */
export function compareNursePatientsOldestFirst(
  a: QueueTicketRow,
  b: QueueTicketRow
): number {
  if (a.priority !== b.priority) {
    return a.priority === "urgent" ? -1 : 1
  }
  const byRecency = nursePatientRecencyIso(a).localeCompare(
    nursePatientRecencyIso(b)
  )
  if (byRecency !== 0) return byRecency
  return (a.queueNumber ?? 0) - (b.queueNumber ?? 0)
}

export function dedupeNursePatientsByPerson(
  rows: QueueTicketRow[]
): QueueTicketRow[] {
  const byKey = new Map<string, QueueTicketRow>()
  for (const row of rows) {
    const key = nursePatientDedupeKey(row)
    if (!key) {
      byKey.set(row.ticketId, row)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, row)
      continue
    }
    const existingTs = nursePatientRecencyIso(existing)
    const nextTs = nursePatientRecencyIso(row)
    if (nextTs >= existingTs) byKey.set(key, row)
  }
  return [...byKey.values()].sort(compareNursePatientsOldestFirst)
}

export type QueueActionKey =
  | "verify"
  | "intake"
  | "view_details"
  | "rejoin"
  | "skip"
  | "reschedule"
  | "call"
  | "start"
  | "complete"
  | "no_show"

export function queueActionsForTicket(row: QueueTicketRow): Set<QueueActionKey> {
  if (row.status === "completed") {
    return new Set(["view_details"])
  }
  if (row.status === "no_show" || row.status === "expired") {
    const actions = new Set<QueueActionKey>(["view_details", "reschedule"])
    if (row.canRejoin) actions.add("rejoin")
    return actions
  }
  // Pre-intake nurse tickets: Intake & assign specialty is the workflow —
  // do not offer Start/Complete (conflicts with incomplete intake).
  const awaitingIntake = needsNurseIntake(row)
  const actions = new Set<QueueActionKey>([
    "view_details",
    "call",
    "skip",
    "no_show",
  ])
  if (!awaitingIntake) {
    actions.add("start")
    actions.add("complete")
  }
  if (needsCheckInVerify(row)) actions.add("verify")
  if (canOpenNurseIntake(row)) actions.add("intake")
  return actions
}

export function isAtSpecialtyAfterIntake(row: QueueTicketRow): boolean {
  return (
    Boolean(row.intakeCompletedAt) &&
    (row.station === "physician" || row.station === "dentist") &&
    (row.status === "waiting" || row.status === "called" || row.status === "ongoing")
  )
}

/**
 * Nurse finished intake for this ticket (sent to specialty or visit closed).
 * Powers the nurse Completed status table — not the same as ticket status "completed".
 */
export function isNurseIntakeCompleted(row: QueueTicketRow): boolean {
  return Boolean(row.intakeCompletedAt)
}

export function compareNurseIntakeCompletedOrder(
  a: QueueTicketRow,
  b: QueueTicketRow
): number {
  const aAt = a.intakeCompletedAt ?? ""
  const bAt = b.intakeCompletedAt ?? ""
  if (aAt !== bAt) return bAt.localeCompare(aAt)
  return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
}

/**
 * Keep local intake handoffs when a soft reload races ahead of Supabase.
 */
export function preserveNurseIntakeHandoffs(
  serverRows: QueueTicketRow[],
  localRows: QueueTicketRow[]
): QueueTicketRow[] {
  if (localRows.length === 0) return serverRows
  const localById = new Map(localRows.map((row) => [row.ticketId, row]))
  return serverRows.map((row) => {
    const local = localById.get(row.ticketId)
    if (!local?.intakeCompletedAt || row.intakeCompletedAt) return row
    return {
      ...row,
      intakeCompletedAt: local.intakeCompletedAt,
      station: local.station,
    }
  })
}

export function isNurseQueueException(row: QueueTicketRow): boolean {
  return (
    row.status === "no_show" ||
    row.status === "expired" ||
    (row.status === "waiting" && row.canRejoin)
  )
}

export function nurseLaneForTicket(row: QueueTicketRow): NurseQueueLane {
  if (needsNurseIntake(row)) return "needs_intake"
  if (isNurseQueueException(row)) return "exceptions"
  if (isAtSpecialtyAfterIntake(row)) return "at_specialty"
  return "at_specialty"
}

export function ticketsInNurseLane(
  tickets: QueueTicketRow[],
  lane: NurseQueueLane
): QueueTicketRow[] {
  return tickets.filter((row) => nurseLaneForTicket(row) === lane)
}

/** Emergency / urgent first, then called, then queue position. */
export function compareNurseIntakeOrder(
  a: QueueTicketRow,
  b: QueueTicketRow
): number {
  if (a.priority !== b.priority) {
    return a.priority === "urgent" ? -1 : 1
  }
  const statusRank = (status: QueueTicketRow["status"]) => {
    if (status === "called") return 0
    if (status === "ongoing") return 1
    return 2
  }
  const byStatus = statusRank(a.status) - statusRank(b.status)
  if (byStatus !== 0) return byStatus
  if (a.queuePosition !== b.queuePosition) {
    return a.queuePosition - b.queuePosition
  }
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
}

export function compareDueScheduledAppointmentOrder(
  a: QueueTicketRow,
  b: QueueTicketRow
): number {
  const aStart = a.appointmentStartsAt ?? ""
  const bStart = b.appointmentStartsAt ?? ""
  if (aStart !== bStart) return aStart.localeCompare(bStart)
  return compareNurseIntakeOrder(a, b)
}

/** Upcoming scheduled appointments (not yet in Waiting / early-entry window). */
export function listUpcomingScheduledNurseAppointments(
  tickets: QueueTicketRow[],
  now: Date = new Date(),
  earlyEntryMinutes?: number
): QueueTicketRow[] {
  return tickets
    .filter((row) =>
      isUpcomingScheduledNurseAppointment(row, now, earlyEntryMinutes)
    )
    .sort(compareDueScheduledAppointmentOrder)
}

/** @deprecated Use listUpcomingScheduledNurseAppointments */
export function listDueScheduledNurseIntakeTickets(
  tickets: QueueTicketRow[],
  now: Date = new Date(),
  earlyEntryMinutes?: number
): QueueTicketRow[] {
  return listUpcomingScheduledNurseAppointments(
    tickets,
    now,
    earlyEntryMinutes
  )
}

/** Next patient ready for intake from the full nurse lane (any ticket type). */
export function nextNurseIntakeTicket(
  tickets: QueueTicketRow[]
): QueueTicketRow | null {
  const waiting = ticketsInNurseLane(tickets, "needs_intake")
    .filter((row) => canOpenNurseIntake(row))
    .sort(compareNurseIntakeOrder)
  return waiting[0] ?? null
}

/** Earliest upcoming scheduled appointment (preview only — not for Start intake). */
export function nextDueScheduledNurseIntakeTicket(
  tickets: QueueTicketRow[],
  now: Date = new Date()
): QueueTicketRow | null {
  return listUpcomingScheduledNurseAppointments(tickets, now)[0] ?? null
}

/**
 * "Now serving" when multiple patients may be active at a station
 * (nurse can call another while intake continues on a prior patient).
 * Uses the most recently updated called/ongoing ticket so Call next and
 * Call/Recall always refresh the public board + TTS for that patient.
 */
export function pickNowServingTicket(
  tickets: QueueTicketRow[]
): QueueTicketRow | null {
  const serving = tickets.filter(
    (t) => t.status === "called" || t.status === "ongoing"
  )
  if (serving.length === 0) return null

  return (
    [...serving].sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
    )[0] ?? null
  )
}
