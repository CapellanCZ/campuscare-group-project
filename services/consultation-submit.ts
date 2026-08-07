import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { ConsultationProviderType } from "@/lib/health/consultation-workflow"
import {
  submitAppointmentRequestWithCapacity,
  type SubmitAppointmentRequestResult,
} from "@/services/appointment-submit"

export type SubmitConsultationRequestInput = {
  patientName: string
  studentId?: string | null
  course?: string | null
  yearLevel?: string | null
  email?: string | null
  phone?: string | null
  providerType: ConsultationProviderType
  preferredDate: string
  preferredTime?: string | null
  reason: string
  symptoms?: string | null
  additionalNotes?: string | null
  patientRecordId?: string | null
  patientId?: string | null
  createdBy?: string | null
  doctorId?: string | null
  clinicId?: string | null
}

export type SubmitConsultationRequestResult = {
  requestId: string
  appointmentId: string
  status: "pending" | "waitlisted"
  providerType: ConsultationProviderType
  preferredDate: string
  queueNumber: number | null
  queueTicketId: string | null
  recommendComeEarly: boolean
  messageKeys: string[]
  capacityUsed?: number
  capacityMax?: number
}

function toLegacyResult(
  result: SubmitAppointmentRequestResult
): SubmitConsultationRequestResult {
  return {
    requestId: result.appointmentId,
    appointmentId: result.appointmentId,
    status: result.status,
    providerType: result.providerType,
    preferredDate: result.preferredDate,
    queueNumber: result.queueNumber,
    queueTicketId: result.queueTicketId,
    recommendComeEarly: result.recommendComeEarly,
    messageKeys: result.messageKeys,
    capacityUsed: result.capacityUsed,
    capacityMax: result.capacityMax,
  }
}

/**
 * Submit path for mobile/web: writes appointments (+ ticket if capacity).
 * Prefer admin/service-role client from Edge Function.
 */
export async function submitConsultationRequestWithCapacity(
  input: SubmitConsultationRequestInput,
  client: SupabaseClient
): Promise<SubmitConsultationRequestResult> {
  const result = await submitAppointmentRequestWithCapacity(
    {
      patientId: input.patientId ?? input.patientRecordId ?? null,
      patientName: input.patientName,
      studentId: input.studentId,
      email: input.email,
      phone: input.phone,
      providerType: input.providerType,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      reason: [
        input.reason,
        input.symptoms ? `Symptoms: ${input.symptoms}` : null,
        input.additionalNotes ? `Notes: ${input.additionalNotes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      doctorId: input.doctorId,
      clinicId: input.clinicId,
    },
    client
  )
  return toLegacyResult(result)
}

/** Legacy helper used by consultation_requests reschedule (unused by nurse appointments flow). */
export async function reReserveConsultationRequestDate(
  input: {
    requestId: string
    providerType: ConsultationProviderType
    preferredDate: string
    preferredTime?: string | null
    patientName: string
    studentId?: string | null
    reason: string
    actorId?: string | null
    actorName?: string | null
    patientId?: string | null
  },
  client: SupabaseClient
): Promise<SubmitConsultationRequestResult> {
  const result = await submitAppointmentRequestWithCapacity(
    {
      patientId: input.patientId,
      patientName: input.patientName,
      studentId: input.studentId,
      providerType: input.providerType,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      reason: input.reason,
    },
    client
  )
  return toLegacyResult(result)
}
