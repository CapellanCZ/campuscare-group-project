/** UUID v1–v5 pattern used to find/replace raw ids in intake notes. */
export const INTAKE_NOTES_UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi

/**
 * Build human-readable system intake notes (never embed raw UUIDs).
 * Prefer staff display names; fall back to role labels when only a role is known.
 */
export function systemIntakeNote(parts: {
  action: string
  by?: string | null
  role?: string | null
  detail?: string | null
}): string {
  const actor =
    parts.by?.trim() ||
    (parts.role?.trim() ? formatAccountRoleLabel(parts.role.trim()) : null)
  const base = actor ? `${parts.action} by ${actor}` : parts.action
  const detail = parts.detail?.trim()
  if (!detail) return `${base}.`
  return `${base}: ${detail}`
}

/** Human label for clinic account roles shown in notes. */
export function formatAccountRoleLabel(role: string | null | undefined): string {
  switch ((role ?? "").toLowerCase()) {
    case "physician":
    case "doctor":
      return "Doctor"
    case "dentist":
      return "Dentist"
    case "nurse":
      return "Nurse"
    case "admin":
      return "Admin"
    case "patient":
      return "Patient"
    case "queue_display":
      return "Queue display"
    default:
      return role?.trim()
        ? role.trim().charAt(0).toUpperCase() + role.trim().slice(1)
        : "Staff"
  }
}

export function extractUuidsFromText(text: string): string[] {
  const matches = text.match(INTAKE_NOTES_UUID_RE)
  if (!matches) return []
  return [...new Set(matches.map((id) => id.toLowerCase()))]
}

/**
 * Replace account UUIDs with display name, else role label (Doctor, Nurse, …).
 */
export function resolveIntakeNoteUuids(
  notes: string,
  accountLabels: ReadonlyMap<string, string>
): string {
  return notes.replace(INTAKE_NOTES_UUID_RE, (uuid) => {
    return accountLabels.get(uuid.toLowerCase()) ?? ""
  })
}

/**
 * Clean notes that previously embedded appointment/request/user UUIDs.
 * Leaves free-text notes intact; rewrites known system patterns, resolves
 * account UUIDs to name/role, and strips any leftover raw ids.
 */
export function sanitizeIntakeNotesForDisplay(
  notes: string | null | undefined,
  accountLabels?: ReadonlyMap<string, string>
): string | null {
  if (!notes) return null
  let text = notes.trim()
  if (!text) return null

  // Appointment / request ids in auto-generated phrases (not accounts)
  text = text
    .replace(
      /Rescheduled appointment\s+[0-9a-f-]{36}\.?/gi,
      "Rescheduled appointment."
    )
    .replace(
      /Approved appointment\s+[0-9a-f-]{36}\.?/gi,
      "Approved appointment."
    )
    .replace(/Approved request\s+[0-9a-f-]{36}\.?/gi, "Approved request.")
    .replace(
      /Ticket created on nurse approve for appointment\s+[0-9a-f-]{36}\.?/gi,
      "Ticket created on nurse approve."
    )
    .replace(
      /Ticket recreated on nurse approve for appointment\s+[0-9a-f-]{36}\.?/gi,
      "Ticket recreated on nurse approve."
    )

  if (accountLabels && accountLabels.size > 0) {
    text = resolveIntakeNoteUuids(text, accountLabels)
  }

  // Never show raw UUIDs in Notes
  text = text
    .replace(INTAKE_NOTES_UUID_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\.\s*\./g, ".")
    .trim()

  return text || null
}
