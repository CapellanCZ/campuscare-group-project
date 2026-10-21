import type { SupabaseClient } from "@supabase/supabase-js"

import type { ClinicDesignation } from "@/lib/auth/types"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import {
  consultationServiceLabel,
  parseConsultationProviderType,
  resolveConsultationProviderType,
} from "@/lib/health/consultation-workflow"
import { canApproveConsultationRequest } from "@/lib/health/roles"
import { systemIntakeNote } from "@/lib/health/intake-notes"
import { assertAppointmentEligibleForQueueEntry } from "@/lib/health/ticket-schedule"
import type { HealthActionResult, SpecialtyStationId } from "@/lib/health/types"
import { createClient } from "@/lib/supabase/server"
import { nextReservedQueueNumber } from "@/services/consultation-capacity"
import {
  ensureConsultationFromAppointment,
  formatClinicQueueCode,
} from "@/lib/health/consultation-lifecycle"

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
  doctor_id?: string | null
}

/**
 * Specialty for queue routing. Prefer the assigned doctor's primary_role when
 * it is physician/dentist — mobile bookings historically omitted provider_type
 * and inherited the DB default 'physician'.
 */
async function resolveAppointmentSpecialty(
  supabase: SupabaseClient,
  appt: { provider_type: string | null; doctor_id?: string | null }
): Promise<SpecialtyStationId> {
  let doctorRole: string | null = null
  if (appt.doctor_id) {
    const { data: doctor } = await supabase
      .from("users")
      .select("primary_role")
      .eq("id", appt.doctor_id)
      .maybeSingle()
    doctorRole = (doctor?.primary_role as string | null) ?? null
  }

  const fromDoctor = parseConsultationProviderType(doctorRole)
  if (fromDoctor) return fromDoctor

  return resolveConsultationProviderType(appt.provider_type)
}

/** Keep appointments.provider_type aligned with the resolved specialty. */
async function syncAppointmentProviderType(params: {
  supabase: SupabaseClient
  appointmentId: string
  specialty: SpecialtyStationId
  current: string | null
}): Promise<void> {
  if (params.current === params.specialty) return
  await params.supabase
    .from("appointments")
    .update({
      provider_type: params.specialty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.appointmentId)
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
  const providerType = await resolveAppointmentSpecialty(
    params.supabase,
    params.appt
  )
  await syncAppointmentProviderType({
    supabase: params.supabase,
    appointmentId: params.appt.id,
    specialty: providerType,
    current: params.appt.provider_type,
  })
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

  const ticketCode = formatClinicQueueCode(providerType, nextNumber)
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
      consultation_type: consultationServiceLabel(providerType),
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
      "id, status, queue_ticket_id, queue_number, provider_type, reason, patient_id, starts_at, doctor_id"
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

  const specialty = await resolveAppointmentSpecialty(supabase, {
    provider_type: appt.provider_type as string | null,
    doctor_id: appt.doctor_id as string | null,
  })
  await syncAppointmentProviderType({
    supabase,
    appointmentId: appt.id as string,
    specialty,
    current: appt.provider_type as string | null,
  })

  let ticketId = appt.queue_ticket_id as string | null
  let ticketCode: string | undefined
  let queueNumber: number | null =
    (appt.queue_number as number | null) ?? null
  let createdOnApprove = false

  const ticketApptSource = {
    id: appt.id as string,
    provider_type: specialty,
    reason: appt.reason as string | null,
    patient_id: appt.patient_id as string | null,
    starts_at: appt.starts_at as string,
    doctor_id: appt.doctor_id as string | null,
  }

  // Mobile may insert pending appointments without a ticket — reserve one now.
  if (!ticketId) {
    const created = await createAndLinkQueueTicket({
      supabase,
      appt: ticketApptSource,
      staffName: params.staffName,
      intakeNotes: systemIntakeNote({
        action: "Ticket created on nurse approve",
        by: params.staffName,
      }),
      forceOverCapacity: true,
    })
    if (!created.ok) return { ok: false, error: created.error }
    ticketId = created.ticketId
    ticketCode = created.ticketCode
    queueNumber = created.queueNumber
    createdOnApprove = true
  }

  if (!ticketId) {
    return { ok: false, error: "Could not assign a queue ticket." }
  }

  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, ticket_code, queue_number, status")
    .eq("id", ticketId)
    .maybeSingle()

  if (!ticket) {
    const created = await createAndLinkQueueTicket({
      supabase,
      appt: ticketApptSource,
      staffName: params.staffName,
      intakeNotes: systemIntakeNote({
        action: "Ticket recreated on nurse approve",
        by: params.staffName,
      }),
      forceOverCapacity: true,
    })
    if (!created.ok) return { ok: false, error: created.error }
    ticketId = created.ticketId
    ticketCode = created.ticketCode
    queueNumber = created.queueNumber
    createdOnApprove = true
  }

  const { data: resolvedTicket } = await supabase
    .from("health_queue_tickets")
    .select("id, ticket_code, queue_number, status")
    .eq("id", ticketId)
    .maybeSingle()

  const now = new Date().toISOString()
  const correctedTicketCode = formatClinicQueueCode(
    specialty,
    Number(resolvedTicket?.queue_number ?? queueNumber ?? 1)
  )
  await supabase
    .from("health_queue_tickets")
    .update({
      assigned_staff_name: params.staffName,
      provider_type: specialty,
      ticket_code: correctedTicketCode,
      consultation_type: consultationServiceLabel(specialty),
      intake_notes: systemIntakeNote({
        action: "Approved appointment",
        by: params.staffName,
        detail: `Specialty: ${specialty}`,
      }),
      status:
        resolvedTicket?.status === "expired"
          ? "waiting"
          : resolvedTicket?.status ?? "waiting",
      updated_at: now,
    })
    .eq("id", ticketId)

  await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      updated_at: now,
    })
    .eq("id", params.appointmentId)

  const finalNumber =
    (resolvedTicket?.queue_number as number | null) ?? queueNumber

  const ensured = await ensureConsultationFromAppointment({
    appointmentId: params.appointmentId,
    ticketId,
    queueNumber: finalNumber,
    staffName: params.staffName,
    client: supabase,
  })
  if ("error" in ensured) {
    return { ok: false, error: ensured.error }
  }

  const displayCode =
    correctedTicketCode ||
    ticketCode ||
    (resolvedTicket?.ticket_code as string | undefined) ||
    "queue"

  return {
    ok: true,
    ticketCode: displayCode,
    queueNumber: finalNumber,
    suggestedSpecialty: specialty,
    message: createdOnApprove
      ? `Appointment confirmed. Assigned ${displayCode}.`
      : `Appointment confirmed. Reserved ${displayCode} kept.`,
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

  const scheduleGate = await assertAppointmentEligibleForQueueEntry(
    appt.starts_at as string
  )
  if (!scheduleGate.ok) return scheduleGate

  const created = await createAndLinkQueueTicket({
    supabase,
    appt: {
      id: appt.id as string,
      provider_type: appt.provider_type as string | null,
      reason: appt.reason as string | null,
      patient_id: appt.patient_id as string | null,
      starts_at: appt.starts_at as string,
      doctor_id: appt.doctor_id as string | null,
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
      status: "confirmed",
      waitlisted_at: null,
      updated_at: now,
    })
    .eq("id", appt.id)

  const ensured = await ensureConsultationFromAppointment({
    appointmentId: appt.id as string,
    ticketId: created.ticketId,
    queueNumber: created.queueNumber,
    staffName: params.staffName,
    client: supabase,
  })
  if ("error" in ensured) {
    return { ok: false, error: ensured.error }
  }

  return {
    ok: true,
    ticketCode: created.ticketCode,
    queueNumber: created.queueNumber,
    message: `Admitted as ${created.ticketCode}.`,
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

  const preferredDate = params.preferredDate.trim()
  const preferredTime = params.preferredTime.trim().slice(0, 5)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return { ok: false, error: "preferredDate must be YYYY-MM-DD." }
  }
  if (!/^\d{2}:\d{2}$/.test(preferredTime)) {
    return { ok: false, error: "preferredTime must be HH:mm." }
  }

  await releaseAppointmentReservation({
    appointmentId: params.appointmentId,
    ticketId: appt.queue_ticket_id as string | null,
  })

  const providerType = await resolveAppointmentSpecialty(supabase, {
    provider_type: appt.provider_type as string | null,
    doctor_id: appt.doctor_id as string | null,
  })
  await syncAppointmentProviderType({
    supabase,
    appointmentId: appt.id as string,
    specialty: providerType,
    current: appt.provider_type as string | null,
  })
  const startsAt = manilaDateTimeToIso(preferredDate, preferredTime)
  const endsAt = new Date(
    new Date(startsAt).getTime() + 30 * 60 * 1000
  ).toISOString()
  const serviceDate = preferredDate
  const reasonNote = `${appt.reason ?? ""}\nReschedule: ${params.reason}`.trim()

  const { used, max } = await nextReservedQueueNumber(
    providerType,
    serviceDate,
    supabase
  )
  const now = new Date().toISOString()

  if (used >= max) {
    const { error } = await supabase
      .from("appointments")
      .update({
        starts_at: startsAt,
        ends_at: endsAt,
        status: "waitlisted",
        waitlisted_at: now,
        queue_ticket_id: null,
        queue_number: null,
        cancellation_reason: null,
        reason: reasonNote,
        clinic_id: appt.clinic_id ?? CAMPUS_CLINIC_ID,
        updated_at: now,
      })
      .eq("id", params.appointmentId)
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      message: `Rescheduled to ${serviceDate} but date is full — waitlisted.`,
    }
  }

  // Persist new schedule + status before linking a ticket so list/UI always
  // reflect the updated preferred date/time even if ticket creation races.
  const { error: scheduleError } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt,
      ends_at: endsAt,
      status: "rescheduled",
      waitlisted_at: null,
      queue_ticket_id: null,
      queue_number: null,
      cancellation_reason: null,
      reason: reasonNote,
      clinic_id: appt.clinic_id ?? CAMPUS_CLINIC_ID,
      updated_at: now,
    })
    .eq("id", params.appointmentId)

  if (scheduleError) return { ok: false, error: scheduleError.message }

  const created = await createAndLinkQueueTicket({
    supabase,
    appt: {
      id: appt.id as string,
      provider_type: providerType,
      reason: reasonNote,
      patient_id: appt.patient_id as string | null,
      starts_at: startsAt,
    },
    staffName: params.staffName,
    intakeNotes: systemIntakeNote({
      action: "Rescheduled appointment",
      by: params.staffName,
      detail: params.reason,
    }),
    forceOverCapacity: false,
  })

  if (!created.ok) {
    // Capacity race after release — keep schedule, move to waitlist.
    if (/capacity|full/i.test(created.error)) {
      await supabase
        .from("appointments")
        .update({
          status: "waitlisted",
          waitlisted_at: now,
          queue_ticket_id: null,
          queue_number: null,
          updated_at: now,
        })
        .eq("id", params.appointmentId)
      return {
        ok: true,
        message: `Rescheduled to ${serviceDate} but date is full — waitlisted.`,
      }
    }
    // Schedule already saved; surface ticket error without rolling back time.
    return {
      ok: true,
      message: `Rescheduled, but queue ticket was not created: ${created.error}`,
    }
  }

  return {
    ok: true,
    message: `Rescheduled with queue #${created.queueNumber}.`,
  }
}
