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

export function canOpenNurseIntake(row: QueueTicketRow): boolean {
  return (
    needsNurseIntake(row) &&
    (!isScheduledTicket(row) || Boolean(row.checkedInAt))
  )
}

/** Patient still needs check-in verification before intake. */
export function needsCheckInVerify(row: QueueTicketRow): boolean {
  if (row.status === "completed" || row.status === "no_show" || row.status === "expired") {
    return false
  }
  if (isScheduledTicket(row) && !row.checkedInAt) return true
  return row.status === "called" && !row.checkedInAt
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
  | "assign_number"
  | "transfer"

export function queueActionsForTicket(row: QueueTicketRow): Set<QueueActionKey> {
  if (row.status === "completed") {
    return new Set(["view_details"])
  }
  if (row.status === "no_show") {
    return new Set(["rejoin", "skip", "reschedule"])
  }
  const actions = new Set<QueueActionKey>([
    "call",
    "start",
    "complete",
    "skip",
    "no_show",
    "assign_number",
    "transfer",
  ])
  if (needsCheckInVerify(row)) actions.add("verify")
  if (canOpenNurseIntake(row)) actions.add("intake")
  if (row.canRejoin) actions.add("rejoin")
  return actions
}

export function isAtSpecialtyAfterIntake(row: QueueTicketRow): boolean {
  return (
    Boolean(row.intakeCompletedAt) &&
    (row.station === "physician" || row.station === "dentist") &&
    (row.status === "waiting" || row.status === "called" || row.status === "ongoing")
  )
}

export function isNurseQueueException(row: QueueTicketRow): boolean {
  return row.status === "no_show" || (row.status === "waiting" && row.canRejoin)
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

export function nextNurseIntakeTicket(
  tickets: QueueTicketRow[]
): QueueTicketRow | null {
  const waiting = ticketsInNurseLane(tickets, "needs_intake").filter(
    canOpenNurseIntake
  )
  const called = waiting.find((row) => row.status === "called")
  return called ?? waiting[0] ?? null
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
