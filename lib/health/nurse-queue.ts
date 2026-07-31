import type { QueueTicketRow } from "@/lib/health/types"

export type NurseQueueLane = "needs_intake" | "at_specialty" | "exceptions"

export function needsNurseIntake(row: QueueTicketRow): boolean {
  return (
    row.station === "nurse" &&
    !row.intakeCompletedAt &&
    (row.status === "waiting" || row.status === "called")
  )
}

export function isAtSpecialtyAfterIntake(row: QueueTicketRow): boolean {
  return (
    Boolean(row.intakeCompletedAt) &&
    (row.station === "physician" || row.station === "dentist") &&
    (row.status === "waiting" || row.status === "called")
  )
}

export function isNurseQueueException(row: QueueTicketRow): boolean {
  return row.status === "no_show" || (row.status === "waiting" && row.canRejoin)
}

export function nurseLaneForTicket(row: QueueTicketRow): NurseQueueLane {
  if (needsNurseIntake(row)) return "needs_intake"
  if (isNurseQueueException(row)) return "exceptions"
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
