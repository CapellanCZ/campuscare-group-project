import "server-only"

import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import { createClient } from "@/lib/supabase/server"

type EnsureResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string }

type TicketRow = {
  id: string
  appointment_id: string | null
  health_appointment_id: string | null
  patient_id: string | null
  patient_name: string | null
  campus_id: string | null
  chief_complaint: string | null
  consultation_type: string | null
  provider_type: string | null
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

const VISIT_DURATION_MS = 30 * 60 * 1000

function isScheduleOverlapError(message: string | undefined): boolean {
  if (!message) return false
  return (
    message.includes("appointments_no_doctor_overlap") ||
    message.toLowerCase().includes("exclusion constraint") ||
    message.includes("23P01")
  )
}

function friendlyScheduleError(message: string | undefined): string {
  if (isScheduleOverlapError(message)) {
    return "This visit overlaps another appointment on your schedule. Finish or complete the other consultation, then try again."
  }
  return message ?? "Could not create visit appointment."
}

/**
 * appointments_no_doctor_overlap blocks any non-cancelled / non-no_show row
 * (including completed). Place queue visits strictly after the latest end.
 */
async function nextFreeVisitWindow(
  supabase: SupabaseServer,
  doctorId: string,
  excludeAppointmentId?: string
): Promise<{ startsAt: Date; endsAt: Date }> {
  const nowMs = Date.now()

  const { data: rows } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status")
    .eq("doctor_id", doctorId)
    .not("status", "in", "(cancelled,no_show)")

  let latestEndMs = nowMs

  for (const row of rows ?? []) {
    if (row.id === excludeAppointmentId) continue
    const endMs = new Date(row.ends_at as string).getTime()
    if (Number.isFinite(endMs) && endMs > latestEndMs) {
      latestEndMs = endMs
    }
  }

  // 1s buffer so tstzrange [start, end) never touches the previous end.
  const startsAt = new Date(latestEndMs + 1000)
  const endsAt = new Date(startsAt.getTime() + VISIT_DURATION_MS)
  return { startsAt, endsAt }
}

/**
 * Shrink open in-progress windows that still cover "now" so a new queue visit
 * can be claimed without fighting a stuck earlier consultation.
 */
async function releaseOpenVisitWindows(
  supabase: SupabaseServer,
  doctorId: string,
  excludeAppointmentId?: string
) {
  const nowIso = new Date().toISOString()
  let query = supabase
    .from("appointments")
    .update({ ends_at: nowIso, updated_at: nowIso })
    .eq("doctor_id", doctorId)
    .eq("status", "in_progress")
    .gt("ends_at", nowIso)
    .lt("starts_at", nowIso)

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId)
  }

  await query
}

/**
 * Ensure a row exists in `appointments` for this queue ticket and claim it for
 * the current physician. Queue tickets may lack appointment_id (walk-ins) or
 * point at unassigned appointments — both previously 404'd the visit chart.
 */
export async function ensureVisitAppointmentForTicket(params: {
  ticketId: string
  doctorId: string
  providerType?: "physician" | "dentist"
}): Promise<EnsureResult> {
  const supabase = await createClient()

  const { data: ticket, error: ticketError } = await supabase
    .from("health_queue_tickets")
    .select(
      `
      id,
      appointment_id,
      health_appointment_id,
      patient_id,
      patient_name,
      campus_id,
      chief_complaint,
      consultation_type,
      provider_type
    `
    )
    .eq("id", params.ticketId)
    .maybeSingle()

  if (ticketError) return { ok: false, error: ticketError.message }
  if (!ticket) return { ok: false, error: "Ticket not found." }

  const row = ticket as TicketRow
  const providerType: "physician" | "dentist" =
    params.providerType ??
    (row.provider_type === "dentist" ? "dentist" : "physician")
  const now = new Date()

  async function claimAppointment(appointmentId: string): Promise<EnsureResult> {
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, status, clinic_id, starts_at, ends_at")
      .eq("id", appointmentId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message }
    if (!appt) return { ok: false, error: "Appointment not found." }

    if (appt.doctor_id && appt.doctor_id !== params.doctorId) {
      return {
        ok: false,
        error: "This visit is assigned to another clinician.",
      }
    }

    if (
      appt.status === "cancelled" ||
      appt.status === "no_show" ||
      appt.status === "completed"
    ) {
      return {
        ok: false,
        error: `Cannot start consultation for a ${String(appt.status).replace("_", " ")} appointment.`,
      }
    }

    // Already owned + in progress — open the chart without rescheduling.
    if (appt.doctor_id === params.doctorId && appt.status === "in_progress") {
      if (row.appointment_id !== appointmentId) {
        await supabase
          .from("health_queue_tickets")
          .update({
            appointment_id: appointmentId,
            updated_at: now.toISOString(),
          })
          .eq("id", row.id)
      }
      return { ok: true, appointmentId }
    }

    await releaseOpenVisitWindows(supabase, params.doctorId, appointmentId)
    const window = await nextFreeVisitWindow(
      supabase,
      params.doctorId,
      appointmentId
    )

    const patch = {
      doctor_id: params.doctorId,
      status: "in_progress" as const,
      queue_ticket_id: row.id,
      provider_type: providerType,
      starts_at: window.startsAt.toISOString(),
      ends_at: window.endsAt.toISOString(),
      updated_at: now.toISOString(),
    }

    let { error: updateError } = await supabase
      .from("appointments")
      .update(patch)
      .eq("id", appointmentId)

    // Rare race: recompute further out and retry once.
    if (updateError && isScheduleOverlapError(updateError.message)) {
      await releaseOpenVisitWindows(supabase, params.doctorId, appointmentId)
      const retryWindow = await nextFreeVisitWindow(
        supabase,
        params.doctorId,
        appointmentId
      )
      const retry = await supabase
        .from("appointments")
        .update({
          ...patch,
          starts_at: new Date(retryWindow.startsAt.getTime() + 60_000).toISOString(),
          ends_at: new Date(
            retryWindow.startsAt.getTime() + 60_000 + VISIT_DURATION_MS
          ).toISOString(),
        })
        .eq("id", appointmentId)
      updateError = retry.error
    }

    if (updateError) {
      return { ok: false, error: friendlyScheduleError(updateError.message) }
    }

    if (row.appointment_id !== appointmentId) {
      await supabase
        .from("health_queue_tickets")
        .update({
          appointment_id: appointmentId,
          updated_at: now.toISOString(),
        })
        .eq("id", row.id)
    }

    return { ok: true, appointmentId }
  }

  // 1) Prefer explicit appointments.id on the ticket.
  if (row.appointment_id) {
    const claimed = await claimAppointment(row.appointment_id)
    if (claimed.ok) return claimed
    // Only recreate when the linked row is missing; surface other errors.
    if (claimed.error !== "Appointment not found.") {
      return claimed
    }
  }

  // 2) Appointment already linked via queue_ticket_id.
  const { data: byTicket } = await supabase
    .from("appointments")
    .select("id")
    .eq("queue_ticket_id", row.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byTicket?.id) {
    return claimAppointment(byTicket.id as string)
  }

  // 2b) Same patient already in progress with this clinician today — reuse.
  if (row.patient_id) {
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const { data: ongoing } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", params.doctorId)
      .eq("patient_id", row.patient_id)
      .eq("status", "in_progress")
      .gte("starts_at", dayStart.toISOString())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ongoing?.id) {
      return claimAppointment(ongoing.id as string)
    }
  }

  // 3) Create a visit appointment from the ticket (walk-ins / unlinked).
  let patientId = row.patient_id
  if (!patientId) {
    const { data: createdPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: CAMPUS_CLINIC_ID,
        full_name: row.patient_name?.trim() || "Walk-in patient",
        student_id: row.campus_id,
        patient_type: "student",
      })
      .select("id")
      .single()

    if (patientError || !createdPatient) {
      return {
        ok: false,
        error:
          patientError?.message ??
          "Patient is required before starting a consultation.",
      }
    }
    patientId = createdPatient.id as string
    await supabase
      .from("health_queue_tickets")
      .update({ patient_id: patientId, updated_at: now.toISOString() })
      .eq("id", row.id)
  }

  const reason =
    row.chief_complaint?.trim() ||
    row.consultation_type?.trim() ||
    "Walk-in consultation"

  await releaseOpenVisitWindows(supabase, params.doctorId)
  let window = await nextFreeVisitWindow(supabase, params.doctorId)

  let { data: created, error: createError } = await supabase
    .from("appointments")
    .insert({
      clinic_id: CAMPUS_CLINIC_ID,
      doctor_id: params.doctorId,
      patient_id: patientId,
      starts_at: window.startsAt.toISOString(),
      ends_at: window.endsAt.toISOString(),
      status: "in_progress",
      reason,
      provider_type: providerType,
      queue_ticket_id: row.id,
    })
    .select("id")
    .single()

  if (createError && isScheduleOverlapError(createError.message)) {
    await releaseOpenVisitWindows(supabase, params.doctorId)
    window = await nextFreeVisitWindow(supabase, params.doctorId)
    const retryStarts = new Date(window.startsAt.getTime() + 60_000)
    const retry = await supabase
      .from("appointments")
      .insert({
        clinic_id: CAMPUS_CLINIC_ID,
        doctor_id: params.doctorId,
        patient_id: patientId,
        starts_at: retryStarts.toISOString(),
        ends_at: new Date(
          retryStarts.getTime() + VISIT_DURATION_MS
        ).toISOString(),
        status: "in_progress",
        reason,
        provider_type: providerType,
        queue_ticket_id: row.id,
      })
      .select("id")
      .single()
    created = retry.data
    createError = retry.error
  }

  if (createError || !created) {
    return {
      ok: false,
      error: friendlyScheduleError(createError?.message),
    }
  }

  const appointmentId = created.id as string
  await supabase
    .from("health_queue_tickets")
    .update({
      appointment_id: appointmentId,
      patient_id: patientId,
      updated_at: now.toISOString(),
    })
    .eq("id", row.id)

  return { ok: true, appointmentId }
}

/** Load one appointment for the visit chart (any clinic appointment by id). */
export async function loadVisitAppointmentById(appointmentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      clinic_id,
      doctor_id,
      patient_id,
      starts_at,
      ends_at,
      status,
      reason,
      location,
      cancellation_reason,
      patients (
        full_name,
        student_id,
        employee_id,
        patient_type,
        timezone
      )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle()

  if (error || !data) return null
  return data
}
