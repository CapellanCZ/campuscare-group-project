/** Persisted in `intake_notes` so Supabase remains the source of truth. */
export const QUEUE_READY_MARKER = "[[queue_ready]]"

export function isTicketReleasedToQueue(
  intakeNotes: string | null | undefined
): boolean {
  return (intakeNotes ?? "").includes(QUEUE_READY_MARKER)
}

/** Append the ready marker once (idempotent). */
export function withQueueReadyMarker(
  intakeNotes: string | null | undefined
): string {
  const current = (intakeNotes ?? "").trim()
  if (current.includes(QUEUE_READY_MARKER)) return current
  return current
    ? `${current}\n${QUEUE_READY_MARKER}`
    : QUEUE_READY_MARKER
}
