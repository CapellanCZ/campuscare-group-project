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
