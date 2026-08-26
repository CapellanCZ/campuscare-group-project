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

/** Patient was called and still needs check-in verification. */
export function needsCheckInVerify(row: QueueTicketRow): boolean {
  return row.status === "called" && !row.checkedInAt
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
  const waiting = ticketsInNurseLane(tickets, "needs_intake")
  const called = waiting.find((row) => row.status === "called")
  return called ?? waiting[0] ?? null
}
