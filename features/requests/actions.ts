"use server"

import {
  addConsultationRequestNote,
  approveConsultationRequestRecord,
  declineConsultationRequestRecord,
  deleteConsultationRequestNote,
  getConsultationRequestById,
  getConsultationRequests,
  getConsultationRequestStats,
  listAssignableDoctors,
  rescheduleConsultationRequestRecord,
  updateConsultationRequestNote,
  updateConsultationRequestStatus,
} from "@/services/consultation-requests"
import {
  ConsultationRequestServiceError,
  type ApproveConsultationRequestInput,
  type ConsultationRequest,
  type ConsultationRequestListParams,
  type ConsultationRequestListResult,
  type ConsultationRequestNote,
  type ConsultationRequestStats,
  type DeclineConsultationRequestInput,
  type RescheduleConsultationRequestInput,
  type UpdateConsultationRequestStatusInput,
} from "@/types/consultationRequest"

export type ConsultationRequestActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(
  error: unknown
): ConsultationRequestActionResult<never> {
  if (error instanceof ConsultationRequestServiceError) {
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
        error:
          "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
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
): Promise<ConsultationRequestActionResult<ConsultationRequestListResult>> {
  try {
    return { ok: true, data: await getConsultationRequests(params) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestStatsAction(): Promise<
  ConsultationRequestActionResult<ConsultationRequestStats>
> {
  try {
    return { ok: true, data: await getConsultationRequestStats() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestByIdAction(
  id: string
): Promise<ConsultationRequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await getConsultationRequestById(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listAssignableDoctorsAction(): Promise<
  ConsultationRequestActionResult<
    { id: string; fullName: string; email: string | null }[]
  >
> {
  try {
    return { ok: true, data: await listAssignableDoctors() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function approveConsultationRequestAction(
  input: ApproveConsultationRequestInput
): Promise<ConsultationRequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await approveConsultationRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function declineConsultationRequestAction(
  input: DeclineConsultationRequestInput
): Promise<ConsultationRequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await declineConsultationRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function rescheduleConsultationRequestAction(
  input: RescheduleConsultationRequestInput
): Promise<ConsultationRequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await rescheduleConsultationRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateConsultationRequestStatusAction(
  input: UpdateConsultationRequestStatusInput
): Promise<ConsultationRequestActionResult<ConsultationRequest>> {
  try {
    return { ok: true, data: await updateConsultationRequestStatus(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function addConsultationRequestNoteAction(
  requestId: string,
  body: string
): Promise<ConsultationRequestActionResult<ConsultationRequestNote>> {
  try {
    return { ok: true, data: await addConsultationRequestNote(requestId, body) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateConsultationRequestNoteAction(
  noteId: string,
  body: string
): Promise<ConsultationRequestActionResult<ConsultationRequestNote>> {
  try {
    return {
      ok: true,
      data: await updateConsultationRequestNote(noteId, body),
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteConsultationRequestNoteAction(
  noteId: string
): Promise<
  ConsultationRequestActionResult<{ id: string; requestId: string }>
> {
  try {
    return { ok: true, data: await deleteConsultationRequestNote(noteId) }
  } catch (error) {
    return toErrorResult(error)
  }
}
