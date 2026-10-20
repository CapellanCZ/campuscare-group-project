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
 * Specialty defaults written on submit (not the patient's own chief complaint).
 * Prefer `specificReason` whenever the stored type is one of these.
 */
export function isGenericConsultationService(
  type: string | null | undefined
): boolean {
  const t = (type ?? "").trim().toLowerCase()
  if (!t) return false
  return (
    t === "general consultation" ||
    t === "dental consultation" ||
    t === "medical consultation" ||
    t === "physician" ||
    t === "dentist"
  )
}

/**
 * Display label for a consultation/service type.
 * When the type is "Other" or a generic specialty default, prefer the patient's
 * free-text reason (never hide a real chief complaint behind "General consultation").
 */
export function displayConsultationLabel(
  type: string | null | undefined,
  specificReason?: string | null
): string {
  const t = normalizeConsultationReason(type)
  const reason = normalizeConsultationReason(specificReason)
  if (isOtherConsultationType(t) || isGenericConsultationService(t)) {
    if (reason && !isGenericConsultationService(reason)) return reason
    return reason || t || "—"
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

/** Strip mobile/legacy "Consultation request:" wrappers from stored reasons. */
export function stripConsultationRequestPrefix(
  value: string | null | undefined
): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  return raw
    .replace(/^consultation\s+requests?\s*[:\-–—]\s*/i, "")
    .trim()
}

/** Normalize a chief-complaint / reason string for UI display. */
export function normalizeConsultationReason(
  value: string | null | undefined
): string {
  return stripOtherReasonPrefix(stripConsultationRequestPrefix(value))
}
