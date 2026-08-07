import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  isConsultationProviderType,
  recommendComeEarly,
  recommendationMessageKeys,
  type ConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import { nextReservedQueueNumber } from "@/services/consultation-capacity"
import { manilaDateTimeToIso } from "@/services/appointment-requests"

export type SubmitAppointmentRequestInput = {
  patientId?: string | null
  patientName: string
  studentId?: string | null
  email?: string | null
  phone?: string | null
  providerType: ConsultationProviderType
  preferredDate: string
  preferredTime?: string | null
  reason: string
  doctorId?: string | null
  clinicId?: string | null
}

export type SubmitAppointmentRequestResult = {
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

/**
 * Create an appointment reservation (+ queue ticket if capacity allows).
 * Prefer admin/service-role client from Edge Function.
 */
export async function submitAppointmentRequestWithCapacity(
  input: SubmitAppointmentRequestInput,
  client: SupabaseClient
): Promise<SubmitAppointmentRequestResult> {
  if (!isConsultationProviderType(input.providerType)) {
    throw new Error("providerType must be physician or dentist.")
  }
  const preferredDate = input.preferredDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    throw new Error("preferredDate must be YYYY-MM-DD.")
  }
  const patientName = input.patientName.trim()
  if (!patientName) throw new Error("patientName is required.")
  const reason = input.reason.trim()
  if (!reason) throw new Error("reason is required.")

  const preferredTime = (input.preferredTime?.trim() || "08:00").slice(0, 5)
  const startsAt = manilaDateTimeToIso(preferredDate, preferredTime)
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()

  const { nextNumber, used, max } = await nextReservedQueueNumber(
    input.providerType,
    preferredDate,
    client
  )
  const now = new Date().toISOString()
  const clinicId = input.clinicId ?? CAMPUS_CLINIC_ID

  // Resolve / create minimal patient if needed
  let patientId = input.patientId ?? null
  if (!patientId && input.studentId?.trim()) {
    const { data: byStudent } = await client
      .from("patients")
      .select("id")
      .or(
        `student_id.eq.${input.studentId.trim()},employee_id.eq.${input.studentId.trim()}`
      )
      .limit(1)
      .maybeSingle()
    patientId = (byStudent?.id as string | undefined) ?? null
  }

  if (!patientId) {
    const { data: created, error: createPatientError } = await client
      .from("patients")
      .insert({
        full_name: patientName,
        student_id: input.studentId?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        clinic_id: clinicId,
        patient_type: "student",
      })
      .select("id")
      .single()
    if (createPatientError) {
      // Patients insert may fail on missing columns — continue without patient FK
      patientId = null
    } else {
      patientId = created.id as string
    }
  }

  if (used >= max) {
    const { data: appt, error } = await client
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        doctor_id: input.doctorId ?? null,
        patient_id: patientId,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "waitlisted",
        reason,
        provider_type: input.providerType,
        waitlisted_at: now,
      })
      .select("id")
      .single()

    if (error) throw error

    return {
      appointmentId: appt.id as string,
      status: "waitlisted",
      providerType: input.providerType,
      preferredDate,
      queueNumber: null,
      queueTicketId: null,
      recommendComeEarly: false,
      messageKeys: recommendationMessageKeys({ waitlisted: true }),
      capacityUsed: used,
      capacityMax: max,
    }
  }

  const { data: appt, error: apptError } = await client
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      doctor_id: input.doctorId ?? null,
      patient_id: patientId,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "pending",
      reason,
      provider_type: input.providerType,
      queue_number: nextNumber,
    })
    .select("id")
    .single()

  if (apptError) throw apptError

  const appointmentId = appt.id as string
  const ticketCode = `CR-${String(nextNumber).padStart(4, "0")}`
  const service =
    input.providerType === "dentist"
      ? "Dental consultation"
      : "General consultation"

  const { data: ticket, error: ticketError } = await client
    .from("health_queue_tickets")
    .insert({
      ticket_code: ticketCode,
      queue_position: nextNumber,
      queue_number: nextNumber,
      estimated_wait_minutes: nextNumber * 10,
      status: "waiting",
      station: "nurse",
      service_date: preferredDate,
      patient_id: patientId,
      patient_name: patientName,
      campus_id: input.studentId?.trim() || null,
      consultation_type: service,
      chief_complaint: reason,
      appointment_id: appointmentId,
      provider_type: input.providerType,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single()

  if (ticketError) {
    await client.from("appointments").delete().eq("id", appointmentId)
    throw ticketError
  }

  await client
    .from("appointments")
    .update({
      queue_ticket_id: ticket.id,
      queue_number: nextNumber,
      updated_at: now,
    })
    .eq("id", appointmentId)

  return {
    appointmentId,
    status: "pending",
    providerType: input.providerType,
    preferredDate,
    queueNumber: nextNumber,
    queueTicketId: ticket.id as string,
    recommendComeEarly: recommendComeEarly(nextNumber),
    messageKeys: recommendationMessageKeys({
      assigned: true,
      queueNumber: nextNumber,
    }),
    capacityUsed: used + 1,
    capacityMax: max,
  }
}
