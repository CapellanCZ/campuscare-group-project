"use server"

import {
  createConsultation,
  deleteConsultation,
  getConsultationById,
  getConsultations,
  getConsultationStats,
  listConsultationFilterOptions,
  searchConsultations,
  updateConsultation,
} from "@/services/consultations"
import {
  ConsultationServiceError,
  type Consultation,
  type ConsultationListParams,
  type ConsultationListResult,
  type ConsultationStats,
  type CreateConsultationInput,
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
    const message = error.message.toLowerCase()
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return {
        ok: false,
        error: "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
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
    const data = await getConsultations(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchConsultationsAction(
  query: string,
  params: Omit<ConsultationListParams, "query"> = {}
): Promise<ConsultationActionResult<ConsultationListResult>> {
  try {
    const data = await searchConsultations(query, params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationByIdAction(
  id: string
): Promise<ConsultationActionResult<Consultation>> {
  try {
    const data = await getConsultationById(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationStatsAction(): Promise<
  ConsultationActionResult<ConsultationStats>
> {
  try {
    const data = await getConsultationStats()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function createConsultationAction(
  input: CreateConsultationInput
): Promise<ConsultationActionResult<Consultation>> {
  try {
    const data = await createConsultation(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateConsultationAction(
  input: UpdateConsultationInput
): Promise<ConsultationActionResult<Consultation>> {
  try {
    const data = await updateConsultation(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteConsultationAction(
  id: string
): Promise<ConsultationActionResult<{ id: string }>> {
  try {
    await deleteConsultation(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listConsultationFilterOptionsAction(): Promise<
  ConsultationActionResult<{ providers: string[]; stations: string[] }>
> {
  try {
    const data = await listConsultationFilterOptions()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}
