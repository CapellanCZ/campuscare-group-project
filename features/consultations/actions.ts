"use server"

import {
  completeConsultation,
  getConsultationById,
  getConsultations,
  getConsultationStats,
  recordConsultationAssessment,
  updateConsultation,
} from "@/services/consultations"
import {
  ConsultationServiceError,
  type Consultation,
  type ConsultationListParams,
  type ConsultationListResult,
  type ConsultationStats,
  type UpdateConsultationInput,
} from "@/types/consultation"

export type ConsultationActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): ConsultationActionResult<never> {
  if (error instanceof ConsultationServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading consultations.",
    code: "unknown",
  }
}

export async function fetchConsultationsAction(
  params: ConsultationListParams = {}
): Promise<ConsultationActionResult<ConsultationListResult>> {
  try {
    return { ok: true, data: await getConsultations(params) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationStatsAction(): Promise<
  ConsultationActionResult<ConsultationStats>
> {
  try {
    return { ok: true, data: await getConsultationStats() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationByIdAction(
  id: string
): Promise<ConsultationActionResult<Consultation>> {
  try {
    return { ok: true, data: await getConsultationById(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateConsultationAction(
  input: UpdateConsultationInput
): Promise<ConsultationActionResult<Consultation>> {
  try {
    return { ok: true, data: await updateConsultation(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function recordConsultationAssessmentAction(input: {
  id: string
  assessmentNotes: string
  providerName?: string
}): Promise<ConsultationActionResult<Consultation>> {
  try {
    return {
      ok: true,
      data: await recordConsultationAssessment(
        input.id,
        input.assessmentNotes,
        input.providerName
      ),
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function completeConsultationAction(
  id: string
): Promise<ConsultationActionResult<Consultation>> {
  try {
    return { ok: true, data: await completeConsultation(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}
