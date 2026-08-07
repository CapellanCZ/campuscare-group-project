import type { SupabaseClient } from "@supabase/supabase-js"

import type { ClinicDesignation } from "@/lib/auth/types"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { canApproveConsultationRequest } from "@/lib/health/roles"
import type { HealthActionResult, SpecialtyStationId } from "@/lib/health/types"
import { createClient } from "@/lib/supabase/server"
import { nextReservedQueueNumber } from "@/services/consultation-capacity"

function manilaDateTimeToIso(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  return new Date(`${date}T${t}+08:00`).toISOString()
}

function manilaServiceDate(startsAt: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startsAt))
}

type AppointmentTicketSource = {
  id: string
  provider_type: string | null
  reason: string | null
  patient_id: string | null
  starts_at: string
}

/** Reserve a daily queue ticket and link it to the appointment. */
async function createAndLinkQueueTicket(params: {
  supabase: SupabaseClient
  appt: AppointmentTicketSource
  staffName: string
  intakeNotes: string
  forceOverCapacity?: boolean
}): Promise<
  | { ok: true; ticketId: string; ticketCode: string; queueNumber: number }
  | { ok: false; error: string }
> {
  const providerType: SpecialtyStationId =
    params.appt.provider_type === "dentist" ? "dentist" : "physician"
  const serviceDate = manilaServiceDate(params.appt.starts_at)

  const { nextNumber, used, max } = await nextReservedQueueNumber(
    providerType,
    serviceDate,
    params.supabase
  )

  if (used >= max && !params.forceOverCapacity) {
    return {
      ok: false,
      error: `Daily capacity full (${used}/${max}). Retry with force to override.`,
    }
  }

  const { data: patient } = params.appt.patient_id
    ? await params.supabase
        .from("patients")
        .select("full_name, student_id, employee_id")
        .eq("id", params.appt.patient_id)
        .maybeSingle()
    : { data: null }

  const ticketCode = `CR-${String(nextNumber).padStart(4, "0")}`
  const now = new Date().toISOString()
  const patientName = patient?.full_name || "Patient"
  const campusId = patient?.student_id ?? patient?.employee_id ?? null

  const { data: ticket, error } = await params.supabase
    .from("health_queue_tickets")
    .insert({
      ticket_code: ticketCode,
      queue_position: nextNumber,
      queue_number: nextNumber,
      estimated_wait_minutes: nextNumber * 10,
      status: "waiting",
      station: "nurse",
      checked_in_at: null,
      service_date: serviceDate,
      patient_id: params.appt.patient_id,
      patient_name: patientName,
      campus_id: campusId,
      consultation_type:
        providerType === "dentist"
          ? "Dental consultation"
          : "General consultation",
      chief_complaint: params.appt.reason,
      appointment_id: params.appt.id,
      provider_type: providerType,
      assigned_staff_name: params.staffName,
      intake_notes: params.intakeNotes,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }

  await params.supabase
    .from("appointments")
    .update({
      queue_ticket_id: ticket.id,
      queue_number: nextNumber,
      waitlisted_at: null,
      updated_at: now,
    })
    .eq("id", params.appt.id)

  return {
    ok: true,
    ticketId: ticket.id as string,
    ticketCode,
    queueNumber: nextNumber,
  }
}

export async function releaseAppointmentReservation(params: {
  appointmentId: string
  ticketId?: string | null
}): Promise<HealthActionResult> {
  const supabase = await createClient()
  let ticketId = params.ticketId
  if (!ticketId) {
    const { data } = await supabase
      .from("appointments")
      .select("queue_ticket_id")
      .eq("id", params.appointmentId)
      .maybeSingle()
    ticketId = (data?.queue_ticket_id as string | null) ?? null
  }

  const now = new Date().toISOString()
  if (ticketId) {
    await supabase
      .from("health_queue_tickets")
      .update({ status: "expired", updated_at: now })
      .eq("id", ticketId)
  }

  await supabase
    .from("appointments")
    .update({
      queue_ticket_id: null,
      queue_number: null,
      updated_at: now,
    })
    .eq("id", params.appointmentId)

  return { ok: true, message: "Reservation released." }
}

export async function approveAppointmentReservation(params: {
  designation: ClinicDesignation
  appointmentId: string
  staffName: string
}): Promise<
  HealthActionResult & {
    ticketCode?: string
    queueNumber?: number | null
    suggestedSpecialty?: SpecialtyStationId
  }
> {
  if (!canApproveConsultationRequest(params.designation)) {
    return { ok: false, error: "Only nurses can approve appointment requests." }
  }

  const supabase = await createClient()
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, queue_ticket_id, queue_number, provider_type, reason, patient_id, starts_at"
    )
    .eq("id", params.appointmentId)
    .maybeSingle()

  if (!appt) return { ok: false, error: "Appointment not found." }
  if (appt.status === "waitlisted") {
    return {
      ok: false,
      error: "This appointment is waitlisted. Use Admit to place it in the queue.",
    }
  }

  const specialty: SpecialtyStationId =
    appt.provider_type === "dentist" ? "dentist" : "physician"

  let ticketId = appt.queue_ticket_id as string | null
  let ticketCode: string | undefined
  let queueNumber: number | null =
    (appt.queue_number as number | null) ?? null
  let createdOnApprove = false

  // Mobile may insert pending appointments without a ticket — reserve one now.
  if (!ticketId) {
    const created = await createAndLinkQueueTicket({
      supabase,
      appt: {
        id: appt.id as string,
        provider_type: appt.provider_type as string | null,
        reason: appt.reason as string | null,
        patient_id: appt.patient_id as string | null,
        starts_at: appt.starts_at as string,
      },
      staffName: params.staffName,
      intakeNotes: `Ticket created on nurse approve for appointment ${params.appointmentId}.`,
      forceOverCapacity: true,
    })
    if (!created.ok) return { ok: false, error: created.error }
    ticketId = created.ticketId
    ticketCode = created.ticketCode
    queueNumber = created.queueNumber
    createdOnApprove = true
  }

  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, ticket_code, queue_number, status")
    .eq("id", ticketId)
    .maybeSingle()

  if (!ticket) {
    const created = await createAndLinkQueueTicket({
      supabase,
      appt: {
        id: appt.id as string,
        provider_type: appt.provider_type as string | null,
        reason: appt.reason as string | null,
        patient_id: appt.patient_id as string | null,
        starts_at: appt.starts_at as string,
      },
      staffName: params.staffName,
      intakeNotes: `Ticket recreated on nurse approve for appointment ${params.appointmentId}.`,
      forceOverCapacity: true,
    })
    if (!created.ok) return { ok: false, error: created.error }
    return {
      ok: true,
      ticketCode: created.ticketCode,
      queueNumber: created.queueNumber,
      suggestedSpecialty: specialty,
      message: `Appointment confirmed. Assigned queue #${created.queueNumber}.`,
    }
  }

  const now = new Date().toISOString()
  await supabase
    .from("health_queue_tickets")
    .update({
      assigned_staff_name: params.staffName,
      intake_notes: `Approved appointment ${params.appointmentId}. Specialty: ${specialty}.`,
      status: ticket.status === "expired" ? "waiting" : ticket.status,
      updated_at: now,
    })
    .eq("id", ticket.id)

  const finalNumber =
    (ticket.queue_number as number | null) ?? queueNumber

  return {
    ok: true,
    ticketCode: ticketCode ?? (ticket.ticket_code as string),
    queueNumber: finalNumber,
    suggestedSpecialty: specialty,
    message: createdOnApprove
      ? `Appointment confirmed. Assigned queue #${finalNumber}.`
      : `Appointment confirmed. Reserved queue #${finalNumber} kept.`,
  }
}

export async function admitWaitlistedAppointment(params: {
  designation: ClinicDesignation
  appointmentId: string
  staffName: string
  force?: boolean
}): Promise<HealthActionResult & { ticketCode?: string; queueNumber?: number }> {
  if (!canApproveConsultationRequest(params.designation)) {
    return { ok: false, error: "Only nurses can admit waitlisted appointments." }
  }

  const supabase = await createClient()
  const { data: appt } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", params.appointmentId)
    .maybeSingle()

  if (!appt) return { ok: false, error: "Appointment not found." }
  if (appt.status !== "waitlisted" && !params.force) {
    return { ok: false, error: "Only waitlisted appointments can be admitted." }
  }

  const created = await createAndLinkQueueTicket({
    supabase,
    appt: {
      id: appt.id as string,
      provider_type: appt.provider_type as string | null,
      reason: appt.reason as string | null,
      patient_id: appt.patient_id as string | null,
      starts_at: appt.starts_at as string,
    },
    staffName: params.staffName,
    intakeNotes: params.force
      ? "Admitted over capacity."
      : "Admitted from waitlist.",
    forceOverCapacity: params.force ?? false,
  })

  if (!created.ok) return { ok: false, error: created.error }

  const now = new Date().toISOString()
  await supabase
    .from("appointments")
    .update({
      status: "pending",
      waitlisted_at: null,
      updated_at: now,
    })
    .eq("id", appt.id)

  return {
    ok: true,
    ticketCode: created.ticketCode,
    queueNumber: created.queueNumber,
    message: `Admitted as ${created.ticketCode} (queue #${created.queueNumber}).`,
  }
}

export async function rescheduleAppointmentReservation(params: {
  appointmentId: string
  preferredDate: string
  preferredTime: string
  reason: string
  staffName: string
}): Promise<HealthActionResult> {
  const supabase = await createClient()
  const { data: appt } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", params.appointmentId)
    .maybeSingle()

  if (!appt) return { ok: false, error: "Appointment not found." }

  await releaseAppointmentReservation({
    appointmentId: params.appointmentId,
    ticketId: appt.queue_ticket_id as string | null,
  })

  const providerType: SpecialtyStationId =
    appt.provider_type === "dentist" ? "dentist" : "physician"
  const startsAt = manilaDateTimeToIso(
    params.preferredDate,
    params.preferredTime
  )
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()
  const serviceDate = params.preferredDate

  const { used, max } = await nextReservedQueueNumber(
    providerType,
    serviceDate,
    supabase
  )
  const now = new Date().toISOString()

  if (used >= max) {
    await supabase
      .from("appointments")
      .update({
        starts_at: startsAt,
        ends_at: endsAt,
        status: "waitlisted",
        waitlisted_at: now,
        queue_ticket_id: null,
        queue_number: null,
        cancellation_reason: null,
        reason: `${appt.reason ?? ""}\nReschedule: ${params.reason}`.trim(),
        updated_at: now,
      })
      .eq("id", params.appointmentId)
    return {
      ok: true,
      message: `Rescheduled to ${serviceDate} but date is full — waitlisted.`,
    }
  }

  // Set new time first so ticket service_date matches the rescheduled day
  await supabase
    .from("appointments")
    .update({
      starts_at: startsAt,
      ends_at: endsAt,
      clinic_id: appt.clinic_id ?? CAMPUS_CLINIC_ID,
      updated_at: now,
    })
    .eq("id", params.appointmentId)

  const created = await createAndLinkQueueTicket({
    supabase,
    appt: {
      id: appt.id as string,
      provider_type: providerType,
      reason: appt.reason as string | null,
      patient_id: appt.patient_id as string | null,
      starts_at: startsAt,
    },
    staffName: params.staffName,
    intakeNotes: `Rescheduled appointment ${params.appointmentId}.`,
    forceOverCapacity: false,
  })

  if (!created.ok) return { ok: false, error: created.error }

  await supabase
    .from("appointments")
    .update({
      status: "rescheduled",
      waitlisted_at: null,
      queue_ticket_id: created.ticketId,
      queue_number: created.queueNumber,
      updated_at: now,
    })
    .eq("id", params.appointmentId)

  return {
    ok: true,
    message: `Rescheduled with queue #${created.queueNumber}.`,
  }
}
