import { OTHER_SELECT_VALUE } from "@/lib/health/form-options"

/** True when the stored consultation/service type is the free-text "Other" choice. */
export function isOtherConsultationType(
  type: string | null | undefined
): boolean {
  const t = (type ?? "").trim()
  if (!t) return false
  if (t === OTHER_SELECT_VALUE) return true
  return /^other$/i.test(t)
}

/**
 * Display label for a consultation/service type.
 * When the type is "Other", return only the specific reason (never "Other" alone
 * or "Other — reason"). Preset types (Medical, Dental, …) pass through unchanged.
 */
export function displayConsultationLabel(
  type: string | null | undefined,
  specificReason?: string | null
): string {
  const t = (type ?? "").trim()
  const reason = (specificReason ?? "").trim()
  if (isOtherConsultationType(t)) {
    return reason || t
  }
  return t || reason || "—"
}

/** Strip a leading "Other:" / "Other -" prefix from free-text reasons on hydrate. */
export function stripOtherReasonPrefix(value: string | null | undefined): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  const stripped = raw.replace(/^other\s*[:\-–—]\s*/i, "").trim()
  if (/^other$/i.test(stripped)) return ""
  return stripped || raw
}
