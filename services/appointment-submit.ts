import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  consultationServiceLabel,
  recommendComeEarly,
  recommendationMessageKeys,
  resolveConsultationProviderType,
  resolveProviderTypeFromBookingBody,
  type ConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import {
  assertNoDoubleBooking,
} from "@/lib/health/appointment-double-booking"
import { normalizeConsultationReason } from "@/lib/health/consultation-display"
import { nextReservedQueueNumber } from "@/services/consultation-capacity"
import { manilaDateTimeToIso } from "@/services/appointment-requests"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyNursesOfScheduledAppointment } from "@/services/staff-appointment-notifications"

export type SubmitAppointmentRequestInput = {
  patientId?: string | null
  patientName: string
  studentId?: string | null
  email?: string | null
  phone?: string | null
  /** Canonical or alias (Dentist, dental, …); normalized before insert. */
  providerType: ConsultationProviderType | string
  /** Optional aliases some mobile builds send instead of / beside providerType. */
  specialty?: string | null
  specialtyType?: string | null
  selectedSpecialty?: string | null
  serviceType?: string | null
  consultationType?: string | null
  service?: string | null
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
  /** Asia/Manila HH:mm wall clock — use this for display, not starts_at UTC digits. */
  preferredTime: string
  startsAt: string
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
  const providerType =
    resolveProviderTypeFromBookingBody({
      providerType: input.providerType,
      specialty: input.specialty,
      specialtyType: input.specialtyType,
      selectedSpecialty: input.selectedSpecialty,
      serviceType: input.serviceType,
      consultationType: input.consultationType,
      service: input.service,
    }) ?? resolveConsultationProviderType(input.providerType)
  if (providerType !== "physician" && providerType !== "dentist") {
    throw new Error("providerType must be physician or dentist.")
  }
  const preferredDate = input.preferredDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    throw new Error("preferredDate must be YYYY-MM-DD.")
  }
  const patientName = input.patientName.trim()
  if (!patientName) throw new Error("patientName is required.")
  const reason = normalizeConsultationReason(input.reason)
  if (!reason) throw new Error("reason is required.")

  const preferredTimeRaw = (input.preferredTime?.trim() || "08:00").trim()
  // Must be Manila HH:mm — sending UTC hours (e.g. from toISOString) shifts display by 8h.
  if (/[TtZz]|[+-]\d{2}/.test(preferredTimeRaw)) {
    throw new Error(
      "preferredTime must be HH:mm in Asia/Manila (do not send UTC/ISO timestamps)."
    )
  }
  const preferredTime = preferredTimeRaw.slice(0, 5)
  if (!/^\d{2}:\d{2}$/.test(preferredTime)) {
    throw new Error("preferredTime must be HH:mm.")
  }
  const startsAt = manilaDateTimeToIso(preferredDate, preferredTime)
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()
  const serviceLabel = consultationServiceLabel(providerType)

  const { nextNumber, used, max } = await nextReservedQueueNumber(
    providerType,
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

  // One open booking per patient + specialty (blocks mobile double-submit races
  // when patient_id / student_id can be resolved).
  await assertNoDoubleBooking(client, {
    clinicId,
    providerType,
    patientId,
    studentId: input.studentId?.trim() || null,
  })

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
        provider_type: providerType,
        waitlisted_at: now,
      })
      .select("id")
      .single()

    if (error) throw error

    const appointmentId = appt.id as string
    try {
      void notifyNursesOfScheduledAppointment(createAdminClient(), {
        clinicId,
        patientName,
        preferredDate,
        preferredTime,
        providerType,
        status: "waitlisted",
        appointmentId,
      })
    } catch {
      /* missing service role in some envs — booking still succeeds */
    }

    return {
      appointmentId,
      status: "waitlisted",
      providerType,
      preferredDate,
      preferredTime,
      startsAt,
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
      provider_type: providerType,
      queue_number: nextNumber,
    })
    .select("id")
    .single()

  if (apptError) throw apptError

  const appointmentId = appt.id as string
  const ticketCode = `CR-${String(nextNumber).padStart(4, "0")}`

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
      consultation_type: serviceLabel,
      chief_complaint: reason,
      appointment_id: appointmentId,
      provider_type: providerType,
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

  try {
    void notifyNursesOfScheduledAppointment(createAdminClient(), {
      clinicId,
      patientName,
      preferredDate,
      preferredTime,
      providerType,
      status: "pending",
      appointmentId,
    })
  } catch {
    /* missing service role in some envs — booking still succeeds */
  }

  return {
    appointmentId,
    status: "pending",
    providerType,
    preferredDate,
    preferredTime,
    startsAt,
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
