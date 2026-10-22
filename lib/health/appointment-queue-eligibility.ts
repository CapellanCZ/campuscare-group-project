/**
 * Appointment-based active-queue eligibility (Asia/Manila / stored ISO).
 *
 * Walk-ins and tickets without a scheduled start are always eligible.
 * Scheduled appointments become eligible 15 minutes before starts_at.
 * Comparisons use absolute instants (ISO / Date), never date-only or time-of-day strings.
 */

/** Default how early a scheduled patient may appear in Waiting for nurse verify. */
export const QUEUE_EARLY_ENTRY_MINUTES = 15

/** How far ahead Upcoming appointments stay visible in nurse ops. */
export const UPCOMING_HORIZON_HOURS = 12

const UPCOMING_HORIZON_MS = UPCOMING_HORIZON_HOURS * 60 * 60 * 1000

function earlyEntryMs(minutes: number = QUEUE_EARLY_ENTRY_MINUTES): number {
  const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : QUEUE_EARLY_ENTRY_MINUTES
  return safe * 60 * 1000
}

export function parseAppointmentStartsAt(
  startsAt: string | Date | null | undefined
): Date | null {
  if (startsAt == null || startsAt === "") return null
  const date = startsAt instanceof Date ? startsAt : new Date(startsAt)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/**
 * True when the patient may enter / appear in the active queue (Waiting).
 * Missing/invalid startsAt ⇒ treat as unscheduled (eligible).
 * Scheduled ⇒ eligible from (starts_at − earlyEntryMinutes).
 */
export function isAppointmentEligibleForQueue(
  startsAt: string | Date | null | undefined,
  now: Date = new Date(),
  earlyEntryMinutes: number = QUEUE_EARLY_ENTRY_MINUTES
): boolean {
  const start = parseAppointmentStartsAt(startsAt)
  if (!start) return true
  return start.getTime() - earlyEntryMs(earlyEntryMinutes) <= now.getTime()
}

/**
 * Timed appointment still in the Upcoming window (not yet in Waiting).
 * More than earlyEntryMinutes before start, within the next 12 hours.
 */
export function isUpcomingScheduledAppointment(
  startsAt: string | Date | null | undefined,
  now: Date = new Date(),
  earlyEntryMinutes: number = QUEUE_EARLY_ENTRY_MINUTES
): boolean {
  const start = parseAppointmentStartsAt(startsAt)
  if (!start) return false
  const startMs = start.getTime()
  const nowMs = now.getTime()
  const eligibleAt = startMs - earlyEntryMs(earlyEntryMinutes)
  return nowMs < eligibleAt && startMs <= nowMs + UPCOMING_HORIZON_MS
}

/** Manila-facing message when a scheduled appointment is not yet eligible. */
export function appointmentNotYetEligibleMessage(
  startsAt: string | Date | null | undefined,
  earlyEntryMinutes: number = QUEUE_EARLY_ENTRY_MINUTES
): string {
  const start = parseAppointmentStartsAt(startsAt)
  if (!start) {
    return "This appointment is not yet eligible for the active queue."
  }
  const when = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(start)
  return `Appointment is scheduled for ${when} (Asia/Manila). Patient can enter Waiting from ${earlyEntryMinutes} minutes before that time.`
}

/** Build ISO instant from Manila calendar date + HH:mm[:ss]. */
export function manilaPreferredStartsAtIso(
  preferredDate: string | null | undefined,
  preferredTime: string | null | undefined
): string | null {
  const date = preferredDate?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const raw = (preferredTime?.trim() || "00:00").slice(0, 8)
  const time =
    raw.length === 5 ? `${raw}:00` : raw.length >= 8 ? raw.slice(0, 8) : `${raw}:00`
  const iso = new Date(`${date}T${time}+08:00`)
  if (Number.isNaN(iso.getTime())) return null
  return iso.toISOString()
}

export type QueueEligibilityTicket = {
  appointmentStartsAt?: string | null
  status?: string | null
  checkedInAt?: string | null
  /** When set with [[queue_ready]], nurse released the ticket early. */
  intakeNotes?: string | null
}

function isReleasedEarly(ticket: QueueEligibilityTicket): boolean {
  return (ticket.intakeNotes ?? "").includes("[[queue_ready]]")
}

/**
 * Whether a ticket belongs in nurse/staff ops lists right now.
 * Active Waiting requires eligibility (early window) or nurse release.
 * Upcoming scheduled waiting tickets stay loaded until promotion.
 */
export function isTicketEligibleForActiveQueue(
  ticket: QueueEligibilityTicket,
  now: Date = new Date(),
  earlyEntryMinutes: number = QUEUE_EARLY_ENTRY_MINUTES
): boolean {
  const status = ticket.status ?? ""
  if (status === "completed") return true
  if (status === "called" || status === "ongoing") return true
  // Skipped / no-show must stay listed so staff can rejoin.
  if (status === "no_show" || status === "expired") return true
  if (isReleasedEarly(ticket)) return true
  if (
    isAppointmentEligibleForQueue(
      ticket.appointmentStartsAt,
      now,
      earlyEntryMinutes
    )
  ) {
    return true
  }
  // Keep future scheduled waiting tickets in the local source of truth
  // until they promote into Waiting at the early-entry window.
  if (
    (status === "waiting" || status === "") &&
    isUpcomingScheduledAppointment(
      ticket.appointmentStartsAt,
      now,
      earlyEntryMinutes
    )
  ) {
    return true
  }
  return false
}

export function filterActiveQueueTickets<T extends QueueEligibilityTicket>(
  tickets: T[],
  now: Date = new Date(),
  earlyEntryMinutes: number = QUEUE_EARLY_ENTRY_MINUTES
): T[] {
  return tickets.filter((t) =>
    isTicketEligibleForActiveQueue(t, now, earlyEntryMinutes)
  )
}
