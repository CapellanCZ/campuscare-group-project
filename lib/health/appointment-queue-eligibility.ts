/**
 * Appointment-based active-queue eligibility (Asia/Manila / stored ISO).
 *
 * Walk-ins and tickets without a scheduled start are always eligible.
 * Scheduled appointments become eligible only when starts_at <= now.
 * Comparisons use absolute instants (ISO / Date), never date-only or time-of-day strings.
 */

export function parseAppointmentStartsAt(
  startsAt: string | Date | null | undefined
): Date | null {
  if (startsAt == null || startsAt === "") return null
  const date = startsAt instanceof Date ? startsAt : new Date(startsAt)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/**
 * True when the patient may enter / appear in the active queue.
 * Missing/invalid startsAt ⇒ treat as unscheduled (eligible).
 */
export function isAppointmentEligibleForQueue(
  startsAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  const start = parseAppointmentStartsAt(startsAt)
  if (!start) return true
  return start.getTime() <= now.getTime()
}

/** Manila-facing message when a scheduled appointment is not yet eligible. */
export function appointmentNotYetEligibleMessage(
  startsAt: string | Date | null | undefined
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
  return `Appointment is scheduled for ${when} (Asia/Manila). Patient cannot enter the active queue before that time.`
}

/** Build ISO instant from Manila calendar date + HH:mm[:ss]. */
export function manilaPreferredStartsAtIso(
  preferredDate: string | null | undefined,
  preferredTime: string | null | undefined
): string | null {
  const date = preferredDate?.trim()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const raw = (preferredTime?.trim() || "00:00").slice(0, 8)
  const time = raw.length === 5 ? `${raw}:00` : raw.length >= 8 ? raw.slice(0, 8) : `${raw}:00`
  const iso = new Date(`${date}T${time}+08:00`)
  if (Number.isNaN(iso.getTime())) return null
  return iso.toISOString()
}

export type QueueEligibilityTicket = {
  appointmentStartsAt?: string | null
  status?: string | null
  checkedInAt?: string | null
}

/**
 * Whether a ticket belongs in the active ops queue right now.
 * Completed tickets stay visible for KPIs. Already called/ongoing stay visible
 * so an in-progress visit is not yanked mid-flow; entry paths must still gate.
 */
export function isTicketEligibleForActiveQueue(
  ticket: QueueEligibilityTicket,
  now: Date = new Date()
): boolean {
  const status = ticket.status ?? ""
  if (status === "completed") return true
  if (status === "called" || status === "ongoing") return true
  // Skipped / no-show must stay listed so staff can rejoin.
  if (status === "no_show" || status === "expired") return true
  return isAppointmentEligibleForQueue(ticket.appointmentStartsAt, now)
}

export function filterActiveQueueTickets<T extends QueueEligibilityTicket>(
  tickets: T[],
  now: Date = new Date()
): T[] {
  return tickets.filter((t) => isTicketEligibleForActiveQueue(t, now))
}
