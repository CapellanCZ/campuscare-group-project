"use server"

import {
  admitAppointmentRequestRecord,
  approveAppointmentRequestRecord,
  getAppointmentRequestById,
  getAppointmentRequests,
  getAppointmentRequestStats,
  listAssignableDoctorsForAppointments,
  declineAppointmentRequestRecord,
  rescheduleAppointmentRequestRecord,
} from "@/services/appointment-requests"
import {
  AppointmentRequestServiceError,
  type AdmitAppointmentRequestInput,
  type AppointmentRequest,
  type AppointmentRequestListParams,
  type AppointmentRequestListResult,
  type AppointmentRequestStats,
  type ApproveAppointmentRequestInput,
  type DeclineAppointmentRequestInput,
  type RescheduleAppointmentRequestInput,
} from "@/types/appointmentRequest"

export type AppointmentRequestActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

/** @deprecated Use AppointmentRequestActionResult */
export type ConsultationRequestActionResult<T> =
  AppointmentRequestActionResult<T>

function toErrorResult(
  error: unknown
): AppointmentRequestActionResult<never> {
  if (error instanceof AppointmentRequestServiceError) {
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
    error: "Something went wrong while loading appointment requests.",
    code: "unknown",
  }
}

export async function fetchConsultationRequestsAction(
  params: AppointmentRequestListParams = {}
): Promise<AppointmentRequestActionResult<AppointmentRequestListResult>> {
  try {
    return { ok: true, data: await getAppointmentRequests(params) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestStatsAction(): Promise<
  AppointmentRequestActionResult<AppointmentRequestStats>
> {
  try {
    return { ok: true, data: await getAppointmentRequestStats() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchConsultationRequestByIdAction(
  id: string
): Promise<AppointmentRequestActionResult<AppointmentRequest>> {
  try {
    return { ok: true, data: await getAppointmentRequestById(id) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function listAssignableDoctorsAction(): Promise<
  AppointmentRequestActionResult<
    { id: string; fullName: string; email: string | null }[]
  >
> {
  try {
    return { ok: true, data: await listAssignableDoctorsForAppointments() }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function approveConsultationRequestAction(
  input: ApproveAppointmentRequestInput & {
    consultationRoom?: string | null
  }
): Promise<AppointmentRequestActionResult<AppointmentRequest>> {
  try {
    return {
      ok: true,
      data: await approveAppointmentRequestRecord({
        id: input.id,
        doctorId: input.doctorId,
        doctorName: input.doctorName,
        scheduleAt: input.scheduleAt,
        location: input.location ?? input.consultationRoom ?? null,
        notes: input.notes,
      }),
    }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function admitConsultationRequestAction(
  id: string,
  force = true
): Promise<AppointmentRequestActionResult<AppointmentRequest>> {
  try {
    const input: AdmitAppointmentRequestInput = { id, force }
    return { ok: true, data: await admitAppointmentRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function declineConsultationRequestAction(
  input: DeclineAppointmentRequestInput
): Promise<AppointmentRequestActionResult<AppointmentRequest>> {
  try {
    return { ok: true, data: await declineAppointmentRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function rescheduleConsultationRequestAction(
  input: RescheduleAppointmentRequestInput
): Promise<AppointmentRequestActionResult<AppointmentRequest>> {
  try {
    return { ok: true, data: await rescheduleAppointmentRequestRecord(input) }
  } catch (error) {
    return toErrorResult(error)
  }
}
