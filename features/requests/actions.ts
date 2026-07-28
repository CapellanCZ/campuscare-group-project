"use server"

import {
  approveConsultationRequest,
  declineConsultationRequest,
  getConsultationRequestById,
  getConsultationRequests,
  getConsultationRequestStats,
  rescheduleConsultationRequest,
} from "@/services/consultationRequests"
import {
  ConsultationRequestServiceError,
  type ConsultationRequest,
  type ConsultationRequestListParams,
  type ConsultationRequestListResult,
  type ConsultationRequestStats,
  type RescheduleConsultationRequestInput,
} from "@/types/consultationRequest"

export type RequestActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): RequestActionResult<never> {
  if (error instanceof ConsultationRequestServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading consultation requests.",
    code: "unknown",
  }
}

export async function fetchConsultationRequestsAction(
  params: ConsultationRequestListParams = {}
): Promise<RequestActionResult<ConsultationRequestListResult>> {
  try {
    return { ok: true, data: await getConsultationRequests(params) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestStatsAction(): Promise<
  RequestActionResult<ConsultationRequestStats>
> {
  try {
    return { ok: true, data: await getConsultationRequestStats() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestByIdAction(
  id: string
): Promise<RequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await getConsultationRequestById(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function approveConsultationRequestAction(
  id: string
): Promise<RequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await approveConsultationRequest(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function declineConsultationRequestAction(
  id: string
): Promise<RequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await declineConsultationRequest(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function rescheduleConsultationRequestAction(
  input: RescheduleConsultationRequestInput
): Promise<RequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await rescheduleConsultationRequest(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}
