/** Shared consultation workflow constants (mobile + web). */
export const EARLY_QUEUE_THRESHOLD = 5
export const WITHIN_FIVE_THRESHOLD = 5
export const THREE_AHEAD_THRESHOLD = 3

export const CONSULTATION_PROVIDER_TYPES = ["physician", "dentist"] as const
export type ConsultationProviderType =
  (typeof CONSULTATION_PROVIDER_TYPES)[number]

export function isConsultationProviderType(
  value: string
): value is ConsultationProviderType {
  return (CONSULTATION_PROVIDER_TYPES as readonly string[]).includes(value)
}

/**
 * Normalize specialty from mobile/web payloads.
 * Accepts case variants and common aliases (dental, doctor, …).
 */
export function parseConsultationProviderType(
  value: unknown
): ConsultationProviderType | null {
  if (value == null) return null
  const raw = String(value).trim().toLowerCase()
  if (!raw) return null

  if (
    raw === "dentist" ||
    raw === "dental" ||
    raw === "dentistry" ||
    raw === "dental consultation" ||
    raw === "dental consult"
  ) {
    return "dentist"
  }
  if (
    raw.includes("dentist") ||
    raw.includes("dental") ||
    raw.includes("odont")
  ) {
    return "dentist"
  }

  if (
    raw === "physician" ||
    raw === "doctor" ||
    raw === "medical" ||
    raw === "general" ||
    raw === "md" ||
    raw === "general consultation" ||
    raw === "general consult" ||
    raw === "medical consultation"
  ) {
    return "physician"
  }
  if (
    raw.includes("physician") ||
    raw.includes("medical") ||
    raw.includes("general consult")
  ) {
    return "physician"
  }

  return null
}

/** First matching specialty, else physician (DB default). */
export function resolveConsultationProviderType(
  ...values: unknown[]
): ConsultationProviderType {
  for (const value of values) {
    const parsed = parseConsultationProviderType(value)
    if (parsed) return parsed
  }
  return "physician"
}

/**
 * Resolve specialty from a booking body.
 * Prefer dedicated specialty fields — mobile sometimes leaves providerType as
 * the physician default while specialty/service correctly says dentist.
 */
export function resolveProviderTypeFromBookingBody(
  body: Record<string, unknown>
): ConsultationProviderType | null {
  const specialtyFirst = parseConsultationProviderType(
    body.specialty ?? body.specialtyType ?? body.selectedSpecialty
  )
  if (specialtyFirst) return specialtyFirst

  const fromService = parseConsultationProviderType(
    body.serviceType ?? body.consultationType ?? body.service
  )
  const fromProvider = parseConsultationProviderType(
    body.providerType ?? body.provider_type
  )

  // Mobile often defaults providerType to "physician" even when the chosen
  // service is dental — prefer an explicit dental service over that default.
  if (fromService === "dentist" && (!fromProvider || fromProvider === "physician")) {
    return "dentist"
  }

  if (fromProvider) return fromProvider
  return fromService
}

export function consultationProviderLabel(
  value: ConsultationProviderType | string | null | undefined
): string {
  return parseConsultationProviderType(value) === "dentist"
    ? "Dentist"
    : "Physician"
}

export function consultationServiceLabel(
  value: ConsultationProviderType | string | null | undefined
): string {
  return parseConsultationProviderType(value) === "dentist"
    ? "Dental consultation"
    : "General consultation"
}

export function recommendComeEarly(queueNumber: number | null | undefined) {
  return queueNumber != null && queueNumber <= EARLY_QUEUE_THRESHOLD
}

export function recommendApproachSoon(patientsAhead: number | null | undefined) {
  return patientsAhead != null && patientsAhead <= WITHIN_FIVE_THRESHOLD
}

export function recommendationMessageKeys(input: {
  queueNumber?: number | null
  patientsAhead?: number | null
  assigned?: boolean
  waitlisted?: boolean
  threeAhead?: boolean
  called?: boolean
}): string[] {
  const keys: string[] = []
  if (input.assigned) keys.push("queue.assigned")
  if (input.waitlisted) keys.push("queue.waitlisted")
  if (recommendComeEarly(input.queueNumber ?? null)) {
    keys.push("recommendation.early_slot")
  }
  if (recommendApproachSoon(input.patientsAhead ?? null)) {
    keys.push("recommendation.within_five")
  }
  if (input.threeAhead) keys.push("queue.three_ahead")
  if (input.called) keys.push("queue.called")
  return keys
}
